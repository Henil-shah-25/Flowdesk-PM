import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, SegmentedControl, Modal, EmptyState } from '../components/ui';
import { ProjectCard } from '../components/projects/ProjectCard';
import {
  useTableData,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
} from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import type { Project, ProjectType } from '../types';
import {
  PREMADE_PROJECT_TEMPLATES,
  getCustomProjectTemplates,
  instantiateProjectTemplate,
  type PreMadeProjectTemplate,
  type SavedProjectTemplate,
} from '../lib/projectTemplates';
import {
  autoSetupProject,
  DEFAULT_DEPARTMENT_SPECS,
  getDefaultEnabledDepartmentNames,
} from '../lib/projectAutoSetup';
import { Plus, FolderKanban, Check, Sparkles, Layers } from 'lucide-react';

const PROJECT_TYPES: ProjectType[] = [
  'Project',
  'Marketing Campaign',
  'Research Campaign',
  'Other',
];

const ACCENT_COLORS = [
  { name: 'Sage', hex: '#CDD6A6' },
  { name: 'Sky', hex: '#BFD3E6' },
  { name: 'Peach', hex: '#F2D5C4' },
  { name: 'Lime', hex: '#C6F432' },
  { name: 'Charcoal', hex: '#35383A' },
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading } = useTableData('Projects');
  const { data: tasks = [] } = useTableData('Tasks');
  const { data: departments = [] } = useTableData('Departments');

  const createProject = useCreateRecord('Projects');
  const createDepartment = useCreateRecord('Departments');
  const createStage = useCreateRecord('Stages');
  const createTask = useCreateRecord('Tasks');

  const updateProject = useUpdateRecord('Projects');
  const deleteProject = useDeleteRecord('Projects');
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'blank' | 'template'>('blank');
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Project');
  const [projectColor, setProjectColor] = useState('#CDD6A6');
  const [dueDate, setDueDate] = useState('');
  const [chosenDepartments, setChosenDepartments] = useState<string[]>(
    getDefaultEnabledDepartmentNames('Project')
  );

  // When project type changes, pre-fill departments by type
  const handleTypeChange = (newType: ProjectType) => {
    setProjectType(newType);
    setChosenDepartments(getDefaultEnabledDepartmentNames(newType));
  };

  const toggleChosenDepartment = (deptName: string) => {
    setChosenDepartments((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  };

  // Selected template state
  const [selectedTemplate, setSelectedTemplate] = useState<
    PreMadeProjectTemplate | SavedProjectTemplate | null
  >(PREMADE_PROJECT_TEMPLATES[0]);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);

  // Top-level projects only (parent_id empty or undefined)
  const topLevelProjects = (projects || []).filter((p) => !p.parent_id || p.parent_id.trim() === '');

  const displayedProjects = topLevelProjects.filter((p) => {
    const isArchived = Boolean(
      p.archived === true || p.archived === 'true' || p.archived === 1 || p.archived === '1'
    );
    return archiveFilter === 'archived' ? isArchived : !isArchived;
  });

  const handleCreateBlank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    createProject.mutate(
      {
        name: projectName.trim(),
        type: projectType,
        color: projectColor,
        status: 'active',
        archived: false,
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : new Date(Date.now() + 86400000 * 14).toISOString(),
      },
      {
        onSuccess: async (newProj) => {
          if (newProj && newProj.id) {
            // Immediately run auto-setup for departments, sub-departments & 4 stages and sync to backend
            await autoSetupProject(newProj.id, projectType, chosenDepartments);
            queryClient.invalidateQueries({ queryKey: ['Departments'] });
            queryClient.invalidateQueries({ queryKey: ['Stages'] });
            queryClient.invalidateQueries({ queryKey: ['Tasks'] });
            queryClient.invalidateQueries({ queryKey: ['Projects'] });
          }

          setProjectName('');
          setDueDate('');
          setChosenDepartments(getDefaultEnabledDepartmentNames('Project'));
          setIsModalOpen(false);
          showToast({
            message: `Project "${projectName.trim()}" created with default pipelines`,
          });
          if (newProj && newProj.id) {
            navigate(`/projects/${newProj.id}`);
          }
        },
      }
    );
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setIsCreatingFromTemplate(true);
    try {
      const finalName = projectName.trim() || selectedTemplate.name;
      const finalDueDate = dueDate
        ? new Date(dueDate).toISOString()
        : new Date(Date.now() + 86400000 * 14).toISOString();

      const created = await instantiateProjectTemplate({
        template: selectedTemplate,
        projectName: finalName,
        dueDate: finalDueDate,
        createProject: (r) => createProject.mutateAsync(r),
        createDepartment: (r) => createDepartment.mutateAsync(r),
        createStage: (r) => createStage.mutateAsync(r),
        createTask: (r) => createTask.mutateAsync(r),
      });

      setProjectName('');
      setDueDate('');
      setIsModalOpen(false);
      showToast({
        message: `Project "${finalName}" created from template`,
      });

      if (created && created.id) {
        navigate(`/projects/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      showToast({
        message: 'Could not create project from template.',
      });
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  const handleArchive = (project: Project) => {
    const isCurrentlyArchived = Boolean(
      project.archived === true ||
        project.archived === 'true' ||
        project.archived === 1 ||
        project.archived === '1'
    );
    const newArchived = !isCurrentlyArchived;

    updateProject.mutate({
      id: project.id,
      patch: { archived: newArchived },
    });

    showToast({
      message: newArchived ? `Archived "${project.name}"` : `Restored "${project.name}"`,
      actionLabel: 'Undo',
      onAction: () => {
        updateProject.mutate({
          id: project.id,
          patch: { archived: isCurrentlyArchived },
        });
      },
    });
  };

  const handleDelete = (project: Project) => {
    const snapshot = { ...project };
    deleteProject.mutate(project.id);

    showToast({
      message: `Deleted "${project.name}"`,
      actionLabel: 'Undo',
      onAction: () => {
        createProject.mutate(snapshot);
      },
    });
  };

  const customTemplates = getCustomProjectTemplates();
  const allTemplates = [...PREMADE_PROJECT_TEMPLATES, ...customTemplates];

  const cardTints: Array<'sage' | 'sky' | 'peach' | 'default'> = [
    'sage',
    'sky',
    'peach',
    'default',
  ];

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[clamp(30px,6.5vw,52px)] sm:text-[clamp(44px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
            Projects & Initiatives
          </h1>
          <p className="text-xs sm:text-base text-secondary mt-1.5 sm:mt-2 font-normal">
            High-level horizons, marketing campaigns, and research sprints.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <SegmentedControl
            value={archiveFilter}
            onChange={setArchiveFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {
              setModalTab('blank');
              setIsModalOpen(true);
            }}
          >
            New Project
          </Button>
        </div>
      </div>

      {/* Grid of Projects */}
      {projectsLoading || !projects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-52 rounded-[32px] skeleton-shimmer bg-white/40 border border-white/60 p-7" />
          <div className="h-52 rounded-[32px] skeleton-shimmer bg-white/40 border border-white/60 p-7" />
          <div className="h-52 rounded-[32px] skeleton-shimmer bg-white/40 border border-white/60 p-7" />
        </div>
      ) : displayedProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title={archiveFilter === 'archived' ? 'No archived projects' : 'No projects found'}
          description={
            archiveFilter === 'archived'
              ? 'Archived projects will appear here for reference.'
              : 'Create your first project to start tracking departments, campaigns, and tasks.'
          }
          action={
            archiveFilter === 'active' ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setModalTab('blank');
                    setIsModalOpen(true);
                  }}
                >
                  New Project
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Sparkles size={14} className="text-lime" />}
                  onClick={() => {
                    setModalTab('template');
                    setIsModalOpen(true);
                  }}
                >
                  From Template
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedProjects.map((project, idx) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasks}
              departments={departments}
              subProjectCount={(projects || []).filter((sp) => sp.parent_id === project.id).length}
              variant={cardTints[idx % cardTints.length]}
              onClick={() => navigate(`/projects/${project.id}`)}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New Project Modal (Bottom sheet on mobile) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Project"
        description="Launch a new initiative with custom workstreams or a pre-made template."
      >
        <div className="space-y-4">
          {/* Modal Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setModalTab('blank')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
                modalTab === 'blank'
                  ? 'bg-white text-graphite shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              Blank Project
            </button>
            <button
              type="button"
              onClick={() => setModalTab('template')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                modalTab === 'template'
                  ? 'bg-white text-graphite shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              <Sparkles size={13} className="text-lime" />
              <span>Create from Template</span>
            </button>
          </div>

          {modalTab === 'blank' ? (
            <form onSubmit={handleCreateBlank} className="space-y-4">
              <div>
                <label className="block text-xs text-secondary mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Flowdesk 2.0 Launch"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                />
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1.5">Project Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`py-2 px-3 text-xs rounded-full font-normal transition-all border ${
                        projectType === type
                          ? 'bg-nearblack text-white border-nearblack font-medium'
                          : 'bg-white/40 text-secondary border-white/60 hover:bg-white/70'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Choose Departments Step */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-secondary font-medium">
                    Choose Departments (Pre-filled by type)
                  </label>
                  <span className="text-[11px] text-secondary">
                    {chosenDepartments.length} enabled
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white/45 border border-white/65 max-h-44 overflow-y-auto">
                  {DEFAULT_DEPARTMENT_SPECS.map((spec) => {
                    const isChecked = chosenDepartments.includes(spec.name);
                    return (
                      <label
                        key={spec.name}
                        className="flex items-center gap-2 p-1.5 rounded-xl cursor-pointer hover:bg-white/70 transition-colors select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChosenDepartment(spec.name)}
                          className="rounded text-lime focus:ring-lime/40 cursor-pointer"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: spec.color }}
                        />
                        <span className="text-xs text-graphite font-normal truncate">
                          {spec.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1.5">Card Tint Style</label>
                <div className="flex items-center gap-3">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setProjectColor(col.hex)}
                      title={col.name}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none border border-white/60 shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    >
                      {projectColor === col.hex && <Check size={14} className="text-graphite" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1.5">Target Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!projectName.trim()}
                >
                  Create Project
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateFromTemplate} className="space-y-4">
              <div>
                <label className="block text-xs text-secondary mb-1.5">
                  Select Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {allTemplates.map((tmpl) => {
                    const isSel = selectedTemplate?.id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setSelectedTemplate(tmpl);
                          if (!projectName.trim()) {
                            setProjectName(tmpl.name);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSel
                            ? 'bg-white border-nearblack shadow-sm ring-1 ring-nearblack'
                            : 'bg-white/40 border-white/70 hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className="text-xs font-medium text-graphite truncate">
                            {tmpl.name}
                          </p>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tmpl.color }}
                          />
                        </div>
                        <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                          {tmpl.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-secondary">
                          <Layers size={11} />
                          <span>{tmpl.departments.length} departments</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1.5">
                  Project Name (Optional Override)
                </label>
                <input
                  type="text"
                  placeholder={selectedTemplate?.name || 'My Project'}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                />
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1.5">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!selectedTemplate || isCreatingFromTemplate}
                >
                  {isCreatingFromTemplate ? 'Instantiating...' : 'Create from Template'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Projects;
