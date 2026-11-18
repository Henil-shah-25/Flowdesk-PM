import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GlassCard, Button, Chip, Modal, ProgressBar, SegmentedControl, EmptyState } from '../components/ui';
import { ProjectCard } from '../components/projects/ProjectCard';
import { DepartmentCard } from '../components/departments/DepartmentCard';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useTableData, useCreateRecord, useUpdateRecord, useDeleteRecord } from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import { computeProjectHealth } from '../lib/health';
import { saveProjectAsTemplate } from '../lib/projectTemplates';
import { TemplateModal } from '../components/departments/TemplateModal';
import {
  autoSetupProject,
  DEFAULT_DEPARTMENT_SPECS,
  getDefaultEnabledDepartmentNames,
  DEFAULT_STAGES_CONFIG,
} from '../lib/projectAutoSetup';
import type { Department, ProjectType, TaskItem } from '../types';
import {
  ArrowLeft,
  Plus,
  Archive,
  Trash2,
  Calendar,
  FolderGit2,
  Building2,
  Check,
  Kanban,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

const SUBPROJECT_TYPES: ProjectType[] = [
  'Marketing Campaign',
  'Research Campaign',
  'Project',
  'Other',
];

const ACCENT_COLORS = [
  { name: 'Sage', hex: '#CDD6A6' },
  { name: 'Sky', hex: '#BFD3E6' },
  { name: 'Peach', hex: '#F2D5C4' },
  { name: 'Lime', hex: '#C6F432' },
  { name: 'Charcoal', hex: '#35383A' },
];

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');
  const { data: tasks = [] } = useTableData('Tasks');

  const updateProject = useUpdateRecord('Projects');
  const deleteProject = useDeleteRecord('Projects');
  const createProject = useCreateRecord('Projects');

  const createDepartment = useCreateRecord('Departments');
  const updateDepartment = useUpdateRecord('Departments');
  const createStage = useCreateRecord('Stages');
  const updateTask = useUpdateRecord('Tasks');

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'departments' | 'pipeline'>('departments');

  // Find target project
  const project = projects.find((p) => p.id === projectId);
  const parentProject = project?.parent_id ? projects.find((p) => p.id === project.parent_id) : null;
  const isSubProject = Boolean(project?.parent_id);

  // Sub-projects belonging to this parent project
  const subProjects = projects.filter((p) => p.parent_id === projectId && !p.archived);

  // Departments for this project
  const projectDepartments = departments.filter((d) => d.project_id === projectId);
  const parentDepartments = projectDepartments.filter((d) => !d.parent_id);

  // Project tasks
  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  // Auto-provision standard departments & stages if this project has none yet
  useEffect(() => {
    if (!project || projectDepartments.length > 0) return;

    autoSetupProject(project.id, project.type || 'Project').then((res) => {
      if (res.createdDepartmentsCount > 0 || res.createdStagesCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['Departments'] });
        queryClient.invalidateQueries({ queryKey: ['Stages'] });
        queryClient.invalidateQueries({ queryKey: ['Tasks'] });
        queryClient.invalidateQueries({ queryKey: ['Projects'] });
      }
    });
  }, [project, projectDepartments.length]);

  // Modal States
  const [isSubProjectModalOpen, setIsSubProjectModalOpen] = useState(false);
  const [isCustomDeptModalOpen, setIsCustomDeptModalOpen] = useState(false);
  const [isSubDeptModalOpen, setIsSubDeptModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');
  const [templatePromptDept, setTemplatePromptDept] = useState<Department | null>(null);
  const [browseTemplateDept, setBrowseTemplateDept] = useState<Department | null>(null);
  const [targetParentDept, setTargetParentDept] = useState<Department | null>(null);

  // Sub-project form
  const [subProjName, setSubProjName] = useState('');
  const [subProjType, setSubProjType] = useState<ProjectType>('Marketing Campaign');
  const [subProjColor, setSubProjColor] = useState('#BFD3E6');
  const [subProjDueDate, setSubProjDueDate] = useState('');
  const [chosenSubDepts, setChosenSubDepts] = useState<string[]>(
    getDefaultEnabledDepartmentNames('Marketing Campaign')
  );

  const handleSubProjTypeChange = (newType: ProjectType) => {
    setSubProjType(newType);
    setChosenSubDepts(getDefaultEnabledDepartmentNames(newType));
  };

  const toggleChosenSubDept = (deptName: string) => {
    setChosenSubDepts((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  };

  // Custom department form
  const [customDeptName, setCustomDeptName] = useState('');
  const [customDeptColor, setCustomDeptColor] = useState('#CDD6A6');

  // Sub-department form
  const [subDeptName, setSubDeptName] = useState('');

  if (!project) {
    return (
      <EmptyState
        icon={<Building2 size={24} />}
        title="Project not found"
        description="The requested initiative might have been deleted or archived."
        action={
          <Button size="sm" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        }
      />
    );
  }

  // Calculate health
  const health = computeProjectHealth(project, tasks, projectDepartments);

  // Toggle department ON/OFF
  const handleToggleDepartment = (deptId: string, enabled: boolean) => {
    updateDepartment.mutate({
      id: deptId,
      patch: { enabled },
    });

    if (enabled) {
      const target = departments.find((d) => d.id === deptId);
      const deptTasks = tasks.filter((t) => t.department_id === deptId);
      if (target && deptTasks.length === 0) {
        try {
          const dismissed = JSON.parse(
            sessionStorage.getItem('flowdesk_template_prompt_dismissed') || '[]'
          );
          if (!dismissed.includes(deptId)) {
            setTemplatePromptDept(target);
          }
        } catch {
          setTemplatePromptDept(target);
        }
      }
    }
  };

  // Toggle sub-department ON/OFF
  const handleToggleSubDepartment = (subDeptId: string, enabled: boolean) => {
    updateDepartment.mutate({
      id: subDeptId,
      patch: { enabled },
    });

    if (enabled) {
      const target = departments.find((d) => d.id === subDeptId);
      const subTasks = tasks.filter((t) => t.department_id === subDeptId);
      if (target && subTasks.length === 0) {
        try {
          const dismissed = JSON.parse(
            sessionStorage.getItem('flowdesk_template_prompt_dismissed') || '[]'
          );
          if (!dismissed.includes(subDeptId)) {
            setTemplatePromptDept(target);
          }
        } catch {
          setTemplatePromptDept(target);
        }
      }
    }
  };

  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    saveProjectAsTemplate(
      project.name,
      savedTemplateName,
      (project.type as ProjectType) || 'Project',
      project.color || '#CDD6A6',
      projectDepartments,
      stages,
      tasks
    );

    setIsSaveTemplateModalOpen(false);
    showToast({
      message: `"${savedTemplateName.trim() || project.name}" saved as a reusable template.`,
    });
  };

  // Archive project
  const handleArchiveProject = () => {
    const isArchived = Boolean(
      project.archived === true || project.archived === 'true' || project.archived === 1 || project.archived === '1'
    );
    const newArchived = !isArchived;

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
          patch: { archived: isArchived },
        });
      },
    });

    navigate('/projects');
  };

  // Delete project
  const handleDeleteProject = () => {
    const snapshot = { ...project };
    deleteProject.mutate(project.id);

    showToast({
      message: `Deleted "${project.name}"`,
      actionLabel: 'Undo',
      onAction: () => {
        createProject.mutate(snapshot);
      },
    });

    navigate('/projects');
  };

  // Create Sub-project handler
  const handleCreateSubProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subProjName.trim()) return;

    createProject.mutate(
      {
        parent_id: project.id,
        name: subProjName.trim(),
        type: subProjType,
        color: subProjColor,
        status: 'active',
        archived: false,
        due_date: subProjDueDate
          ? new Date(subProjDueDate).toISOString()
          : new Date(Date.now() + 86400000 * 7).toISOString(),
      },
      {
        onSuccess: async (newSub) => {
          if (newSub && newSub.id) {
            await autoSetupProject(newSub.id, subProjType, chosenSubDepts);
            queryClient.invalidateQueries({ queryKey: ['Departments'] });
            queryClient.invalidateQueries({ queryKey: ['Stages'] });
            queryClient.invalidateQueries({ queryKey: ['Tasks'] });
            queryClient.invalidateQueries({ queryKey: ['Projects'] });
            navigate(`/projects/${newSub.id}`);
          }
        },
      }
    );

    setSubProjName('');
    setIsSubProjectModalOpen(false);
    showToast({
      message: `Created sub-project "${subProjName.trim()}"`,
    });
  };

  // Create Custom Department handler (with 4 default stages)
  const handleCreateCustomDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDeptName.trim()) return;

    createDepartment.mutate(
      {
        project_id: project.id,
        name: customDeptName.trim(),
        color: customDeptColor,
        enabled: true,
        order: parentDepartments.length + 1,
      },
      {
        onSuccess: (createdDept) => {
          if (createdDept && createdDept.id) {
            DEFAULT_STAGES_CONFIG.forEach((sc, scIdx) => {
              createStage.mutate({
                department_id: createdDept.id,
                name: sc.name,
                color: sc.color,
                kind: sc.kind,
                order: scIdx + 1,
              });
            });
            queryClient.invalidateQueries({ queryKey: ['Stages'] });
          }
        },
      }
    );

    setCustomDeptName('');
    setIsCustomDeptModalOpen(false);
    showToast({
      message: `Added department "${customDeptName.trim()}"`,
    });
  };

  // Create Sub-Department handler (with 4 default stages)
  const handleCreateSubDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subDeptName.trim() || !targetParentDept) return;

    createDepartment.mutate(
      {
        project_id: project.id,
        parent_id: targetParentDept.id,
        name: subDeptName.trim(),
        color: targetParentDept.color || '#CDD6A6',
        enabled: true,
        order: 99,
      },
      {
        onSuccess: (createdSub) => {
          if (createdSub && createdSub.id) {
            DEFAULT_STAGES_CONFIG.forEach((sc, scIdx) => {
              createStage.mutate({
                department_id: createdSub.id,
                name: sc.name,
                color: sc.color,
                kind: sc.kind,
                order: scIdx + 1,
              });
            });
            queryClient.invalidateQueries({ queryKey: ['Stages'] });
          }
        },
      }
    );

    setSubDeptName('');
    setIsSubDeptModalOpen(false);
    showToast({
      message: `Added "${subDeptName.trim()}" to ${targetParentDept.name}`,
    });
  };

  const handleMoveKanbanTask = (taskId: string, stageId: string) => {
    updateTask.mutate({
      id: taskId,
      patch: { stage_id: stageId },
    });
  };

  const handleToggleKanbanTask = (task: TaskItem) => {
    updateTask.mutate({
      id: task.id,
      patch: { done_at: task.done_at ? '' : new Date().toISOString() },
    });
  };

  const subProjectTints: Array<'sage' | 'sky' | 'peach'> = ['sky', 'sage', 'peach'];

  return (
    <div className="space-y-8">
      {/* Top Navigation Row: Breadcrumb (Projects / Parent / This) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-secondary flex-wrap">
          <Link
            to="/projects"
            className="hover:text-graphite transition-colors flex items-center gap-1 font-normal"
          >
            <ArrowLeft size={14} />
            <span>Projects</span>
          </Link>
          <span className="text-secondary/40">/</span>
          {parentProject && (
            <>
              <Link
                to={`/projects/${parentProject.id}`}
                className="hover:text-graphite transition-colors max-w-[200px] truncate font-normal"
              >
                {parentProject.name}
              </Link>
              <span className="text-secondary/40">/</span>
            </>
          )}
          <span className="text-graphite font-medium max-w-[240px] truncate">
            {project.name}
          </span>
        </nav>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={<BarChart3 size={14} className="text-graphite" />}
            onClick={() => navigate(`/reports?project=${project.id}`)}
          >
            Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={14} className="text-lime" />}
            onClick={() => {
              setSavedTemplateName(`${project.name} Template`);
              setIsSaveTemplateModalOpen(true);
            }}
          >
            Save as template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Archive size={14} />}
            onClick={handleArchiveProject}
          >
            Archive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} className="text-coral" />}
            onClick={handleDeleteProject}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Project Master Overview Card */}
      <GlassCard className="!p-4 sm:!p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    health.status === 'coral'
                      ? '#F25F5C'
                      : health.status === 'amber'
                      ? '#F5A524'
                      : '#2DBE8C',
                }}
              />
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-light tracking-tight text-graphite leading-tight break-words">
                {project.name}
              </h1>
              <Chip label={project.type || 'Project'} accent="neutral" size="sm" dot={false} />
              <Chip
                label={health.label}
                accent={health.status === 'coral' ? 'coral' : health.status === 'amber' ? 'amber' : 'lime'}
                size="sm"
              />
            </div>

            <p className="text-xs text-secondary flex items-center gap-2 font-normal">
              <Calendar size={13} />
              <span>
                Target Due Date:{' '}
                {project.due_date ? format(new Date(project.due_date), 'MMMM d, yyyy') : 'Unscheduled'}
              </span>
              <span>•</span>
              <span>{health.reason}</span>
            </p>
          </div>

          {!isSubProject && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setIsSubProjectModalOpen(true)}
              >
                New sub-project
              </Button>
            </div>
          )}
        </div>

        {/* Progress & Milestone Overview */}
        <div className="pt-2">
          <div className="flex justify-between items-center text-xs mb-1.5 font-normal">
            <span className="text-secondary">Project Momentum</span>
            <span className="text-graphite font-medium">{Math.round(health.progressPercent)}%</span>
          </div>
          {/* Thin 6px pill bar with lime fill */}
          <ProgressBar value={health.progressPercent} accent="lime" size="md" />
        </div>
      </GlassCard>

      {/* Sub-projects Section (Top-level projects only) */}
      {!isSubProject && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <FolderGit2 size={18} className="text-graphite" />
              <h2 className="text-xl font-normal text-graphite tracking-tight">Sub-projects</h2>
              <span className="text-xs text-secondary">({subProjects.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSubProjectModalOpen(true)}
              className="text-xs text-graphite font-medium hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add campaign or sub-effort</span>
            </button>
          </div>

          {subProjects.length === 0 ? (
            <div className="p-6 rounded-[28px] bg-white/30 border border-white/50 text-center">
              <p className="text-xs text-secondary font-normal">
                No sub-projects created yet. Use sub-projects for targeted marketing campaigns or research sprints.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {subProjects.map((subProj, idx) => (
                <ProjectCard
                  key={subProj.id}
                  project={subProj}
                  tasks={tasks}
                  departments={departments}
                  isSubProject
                  variant={subProjectTints[idx % subProjectTints.length]}
                  onClick={() => navigate(`/projects/${subProj.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section View Switcher: Departments vs. Pipeline Kanban */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'departments', label: 'Departments Grid' },
              { value: 'pipeline', label: 'Pipeline Kanban' },
            ]}
          />
        </div>

        {activeTab === 'departments' && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsCustomDeptModalOpen(true)}
          >
            Add custom department
          </Button>
        )}
      </div>

      {/* Conditional Rendering: Departments Grid OR Pipeline Kanban */}
      {activeTab === 'departments' ? (
        <div className="space-y-5">
          <p className="text-xs text-secondary px-1">
            Toggle departments ON/OFF to include or exclude them from velocity and health tracking.
          </p>

          {/* Prompt banner when department switched ON */}
          {templatePromptDept && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm flex items-center justify-between flex-wrap gap-3"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-lime shrink-0" />
                <div>
                  <p className="text-sm font-medium text-graphite">
                    Browse templates for {templatePromptDept.name}?
                  </p>
                  <p className="text-xs text-secondary">
                    Jumpstart your department pipeline with pre-made task templates.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setBrowseTemplateDept(templatePromptDept);
                    try {
                      const dismissed = JSON.parse(
                        sessionStorage.getItem('flowdesk_template_prompt_dismissed') || '[]'
                      );
                      sessionStorage.setItem(
                        'flowdesk_template_prompt_dismissed',
                        JSON.stringify([...dismissed, templatePromptDept.id])
                      );
                    } catch {
                      // ignore
                    }
                    setTemplatePromptDept(null);
                  }}
                >
                  Browse templates
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    try {
                      const dismissed = JSON.parse(
                        sessionStorage.getItem('flowdesk_template_prompt_dismissed') || '[]'
                      );
                      sessionStorage.setItem(
                        'flowdesk_template_prompt_dismissed',
                        JSON.stringify([...dismissed, templatePromptDept.id])
                      );
                    } catch {
                      // ignore
                    }
                    setTemplatePromptDept(null);
                  }}
                >
                  Skip
                </Button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parentDepartments.map((dept) => {
              const childSubDepts = projectDepartments.filter((d) => d.parent_id === dept.id);
              return (
                <DepartmentCard
                  key={dept.id}
                  projectId={project.id}
                  department={dept}
                  subDepartments={childSubDepts}
                  stages={stages}
                  tasks={tasks}
                  onToggleDepartment={handleToggleDepartment}
                  onToggleSubDepartment={handleToggleSubDepartment}
                  onAddSubDepartment={(pDept) => {
                    setTargetParentDept(pDept);
                    setIsSubDeptModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-normal text-graphite tracking-tight flex items-center gap-2">
              <Kanban size={18} />
              <span>Project Kanban Pipeline</span>
            </h3>
            <span className="text-xs text-secondary">{projectTasks.length} total tasks</span>
          </div>

          <KanbanBoard
            stages={stages}
            tasks={projectTasks}
            onMoveTask={handleMoveKanbanTask}
            onToggleTask={handleToggleKanbanTask}
          />
        </div>
      )}

      {/* Sub-project Modal */}
      <Modal
        isOpen={isSubProjectModalOpen}
        onClose={() => setIsSubProjectModalOpen(false)}
        title="New Sub-project"
        description={`Create a specialized sub-initiative or campaign under ${project.name}.`}
      >
        <form onSubmit={handleCreateSubProject} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Sub-project Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Q4 SEO Surge Campaign"
              value={subProjName}
              onChange={(e) => setSubProjName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Campaign Type</label>
            <div className="grid grid-cols-2 gap-2">
              {SUBPROJECT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSubProjTypeChange(type)}
                  className={`py-2 px-3 text-xs rounded-full font-normal transition-all border ${
                    subProjType === type
                      ? 'bg-nearblack text-white border-nearblack font-medium'
                      : 'bg-white/40 text-secondary border-white/60 hover:bg-white/70'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Choose Departments Step for Sub-Project */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-secondary font-medium">
                Choose Departments (Pre-filled by type)
              </label>
              <span className="text-[11px] text-secondary">
                {chosenSubDepts.length} enabled
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white/45 border border-white/65 max-h-40 overflow-y-auto">
              {DEFAULT_DEPARTMENT_SPECS.map((spec) => {
                const isChecked = chosenSubDepts.includes(spec.name);
                return (
                  <label
                    key={spec.name}
                    className="flex items-center gap-2 p-1.5 rounded-xl cursor-pointer hover:bg-white/70 transition-colors select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChosenSubDept(spec.name)}
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
            <label className="block text-xs text-secondary mb-1.5">Accent Tint</label>
            <div className="flex items-center gap-3">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSubProjColor(col.hex)}
                  title={col.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none border border-white/60 shadow-sm"
                  style={{ backgroundColor: col.hex }}
                >
                  {subProjColor === col.hex && <Check size={14} className="text-graphite" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Campaign Due Date</label>
            <input
              type="date"
              value={subProjDueDate}
              onChange={(e) => setSubProjDueDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSubProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createProject.isPending}
            >
              Create Sub-project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Department Modal */}
      <Modal
        isOpen={isCustomDeptModalOpen}
        onClose={() => setIsCustomDeptModalOpen(false)}
        title="Add Custom Department"
        description="Introduce a new department dedicated to this project."
      >
        <form onSubmit={handleCreateCustomDept} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Department Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Legal & Compliance"
              value={customDeptName}
              onChange={(e) => setCustomDeptName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Accent Tint</label>
            <div className="flex items-center gap-3">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setCustomDeptColor(col.hex)}
                  title={col.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none border border-white/60 shadow-sm"
                  style={{ backgroundColor: col.hex }}
                >
                  {customDeptColor === col.hex && <Check size={14} className="text-graphite" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCustomDeptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createDepartment.isPending}
            >
              Add Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Sub-Department Modal */}
      <Modal
        isOpen={isSubDeptModalOpen}
        onClose={() => setIsSubDeptModalOpen(false)}
        title={`Add Sub-department to ${targetParentDept?.name || 'Department'}`}
        description="Sub-departments inherit parent state and have their own toggle."
      >
        <form onSubmit={handleCreateSubDept} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Sub-department Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Performance Marketing"
              value={subDeptName}
              onChange={(e) => setSubDeptName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSubDeptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createDepartment.isPending}
            >
              Add Sub-department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Save Project as Template Modal */}
      <Modal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        title="Save Project as Template"
        description="Save this project's departments, stages, and workstreams as a blueprint."
      >
        <form onSubmit={handleSaveAsTemplate} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Template Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Full-Stack Launch Blueprint"
              value={savedTemplateName}
              onChange={(e) => setSavedTemplateName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="p-3 rounded-2xl bg-black/5 text-xs text-secondary space-y-1">
            <p className="font-medium text-graphite">What will be saved:</p>
            <p>• {parentDepartments.length} Departments and sub-departments</p>
            <p>• Department pipeline stages (customized order and kinds)</p>
            <p>• Baseline task structures and estimates</p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSaveTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!savedTemplateName.trim()}
            >
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Template Import Modal */}
      {browseTemplateDept && project && (
        <TemplateModal
          isOpen={Boolean(browseTemplateDept)}
          onClose={() => setBrowseTemplateDept(null)}
          projectId={project.id}
          departmentId={browseTemplateDept.id}
          departmentName={
            browseTemplateDept.parent_id
              ? (departments.find((d) => d.id === browseTemplateDept.parent_id)?.name || browseTemplateDept.name)
              : browseTemplateDept.name
          }
          subName={browseTemplateDept.parent_id ? browseTemplateDept.name : ''}
        />
      )}
    </div>
  );
};
