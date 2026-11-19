import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Layers,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitFork,
  ListTodo,
} from 'lucide-react';
import type { TaskItem, Project, Stage } from '../../types';
import {
  calculateDevelopmentProgress,
  getPhaseStatusInfo,
} from '../../lib/developmentPhases';

export interface ConnectSubProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: TaskItem;
  projects: Project[];
  tasks: TaskItem[];
  stages: Stage[];
  onConnect: (linkedProjectId: string, linkedTaskId?: string) => void;
}

export const ConnectSubProjectModal: React.FC<ConnectSubProjectModalProps> = ({
  isOpen,
  onClose,
  currentTask,
  projects,
  tasks,
  stages,
  onConnect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const stagesMap = useMemo(() => {
    return new Map(stages.map((s) => [s.id, s]));
  }, [stages]);

  // Available sub-projects (sub-projects with parent_id or any project distinct from current task's project)
  const availableProjects = useMemo(() => {
    return projects.filter((p) => !p.archived);
  }, [projects]);

  // Filtered projects based on search query (matches project name or tasks inside the project)
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      // Sort sub-projects of the current project first, then others
      return [...availableProjects].sort((a, b) => {
        const aIsChild = a.parent_id === currentTask.project_id;
        const bIsChild = b.parent_id === currentTask.project_id;
        if (aIsChild && !bIsChild) return -1;
        if (!aIsChild && bIsChild) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return availableProjects.filter((p) => {
      const nameMatches = p.name.toLowerCase().includes(q);
      const hasMatchingTask = tasks.some(
        (t) => t.project_id === p.id && t.id !== currentTask.id && t.title.toLowerCase().includes(q)
      );
      return nameMatches || hasMatchingTask;
    });
  }, [availableProjects, searchQuery, tasks, currentTask.project_id, currentTask.id]);

  // Tasks belonging to the currently selected project (excluding current task to prevent self-connection)
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks
      .filter((t) => t.project_id === selectedProjectId && t.id !== currentTask.id)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [tasks, selectedProjectId, currentTask.id]);

  // Preview data for the selected project & task
  const previewProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const previewTask = useMemo(() => {
    return projectTasks.find((t) => t.id === selectedTaskId);
  }, [projectTasks, selectedTaskId]);

  const previewProgress = useMemo(() => {
    return calculateDevelopmentProgress(projectTasks, stagesMap);
  }, [projectTasks, stagesMap]);

  // Reset selection on open
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedProjectId(currentTask.linked_project_id || '');
      setSelectedTaskId(currentTask.linked_task_id || '');
    }
  }, [isOpen, currentTask.linked_project_id, currentTask.linked_task_id]);

  const handleConfirm = () => {
    if (!selectedProjectId) return;
    onConnect(selectedProjectId, selectedTaskId || undefined);
    onClose();
  };

  if (!isOpen) return null;

  const isAlreadyConnected =
    currentTask.linked_project_id === selectedProjectId &&
    (currentTask.linked_task_id || '') === (selectedTaskId || '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/45 backdrop-blur-[20px]"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-[620px] bg-[#F2F3EF] rounded-[28px] border border-black/[0.08] shadow-[0_24px_48px_-20px_rgba(20,25,30,0.3)] flex flex-col overflow-hidden text-graphite z-10 max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-nearblack text-white flex items-center justify-center shadow-sm">
                <GitFork size={17} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-graphite tracking-tight leading-snug">
                  Connect Sub-Project
                </h3>
                <p className="text-xs text-secondary">
                  Link &quot;{currentTask.title}&quot; to a development pipeline
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-black/[0.07] flex items-center justify-center text-graphite transition-all shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Box */}
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sub-project or development task..."
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-2xl bg-white border border-black/[0.08] text-graphite placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-nearblack/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-graphite p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Selection Area */}
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            {/* 1. Sub-Projects List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-secondary uppercase tracking-wider">
                  Available Sub-Projects ({filteredProjects.length})
                </label>
                <span className="text-[10px] text-muted">Select a project</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-[170px] overflow-y-auto no-scrollbar p-0.5">
                {filteredProjects.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-white/50 border border-black/[0.05] text-xs text-muted">
                    No matching sub-projects found.
                  </div>
                ) : (
                  filteredProjects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    const pTasks = tasks.filter((t) => t.project_id === p.id && t.id !== currentTask.id);
                    const isSubProj = Boolean(p.parent_id);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          // Auto-select first task if none selected
                          if (!selectedTaskId && pTasks.length > 0) {
                            setSelectedTaskId(pTasks[0].id);
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-nearblack text-white border-nearblack shadow-sm'
                            : 'bg-white/60 hover:bg-white border-black/[0.06] text-graphite'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color || '#8DB3DE' }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-medium tracking-tight truncate block">
                              {p.name}
                            </span>
                            {isSubProj && (
                              <span
                                className={`text-[10px] block truncate ${
                                  isSelected ? 'text-white/70' : 'text-secondary'
                                }`}
                              >
                                Sub-project
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-secondary'
                            }`}
                          >
                            {pTasks.length} {pTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                          {isSelected && <Check size={14} className="text-lime" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Tasks in Selected Sub-Project */}
            {selectedProjectId && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-secondary uppercase tracking-wider">
                    Select Lead Development Task (Optional)
                  </label>
                  <span className="text-[10px] text-muted">
                    {projectTasks.length} development {projectTasks.length === 1 ? 'phase' : 'phases'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-[170px] overflow-y-auto no-scrollbar p-0.5">
                  {projectTasks.length === 0 ? (
                    <div className="p-4 text-center rounded-2xl bg-white/50 border border-black/[0.05] text-xs text-muted">
                      This sub-project has no tasks yet. You can still connect it and add phases later.
                    </div>
                  ) : (
                    projectTasks.map((t) => {
                      const isSelected = t.id === selectedTaskId;
                      const stage = stagesMap.get(t.stage_id);
                      const statusInfo = getPhaseStatusInfo(t, stage);

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTaskId(isSelected ? '' : t.id)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-nearblack text-white border-nearblack shadow-sm'
                              : 'bg-white/60 hover:bg-white border-black/[0.06] text-graphite'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ListTodo
                              size={14}
                              className={isSelected ? 'text-white/70' : 'text-secondary'}
                            />
                            <span className="text-xs sm:text-sm font-normal truncate">
                              {t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : statusInfo.bgColor,
                                color: isSelected ? '#FFFFFF' : statusInfo.color,
                              }}
                            >
                              {statusInfo.label}
                            </span>
                            {isSelected && <Check size={13} className="text-lime" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. Live Preview Card */}
            {selectedProjectId && previewProject && (
              <div className="p-4 rounded-2xl bg-white border border-black/[0.08] shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-graphite">
                  <div className="flex items-center gap-1.5 text-muted uppercase text-[10px] tracking-wider">
                    <Layers size={12} />
                    <span>Connection Preview</span>
                  </div>
                  <span className="text-[11px] text-secondary">
                    {previewProgress.hasPhases
                      ? `${previewProgress.progress}% Completed (${previewProgress.completedCount}/${previewProgress.totalCount})`
                      : 'No Development Phases'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: previewProject.color || '#8DB3DE' }}
                  />
                  <span className="text-sm font-medium text-graphite truncate">
                    {previewProject.name}
                  </span>
                  {previewTask && (
                    <>
                      <ArrowRight size={12} className="text-muted shrink-0" />
                      <span className="text-xs text-secondary truncate">
                        {previewTask.title}
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar preview */}
                <div className="h-1.5 w-full bg-black/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime transition-all duration-300"
                    style={{
                      width: `${previewProgress.hasPhases ? previewProgress.progress : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-black/[0.07] bg-[#EDEFEA] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-black/[0.08] text-secondary text-xs sm:text-sm font-normal transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!selectedProjectId || isAlreadyConnected}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-full bg-nearblack hover:bg-charcoal text-white text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <CheckCircle2 size={15} />
              <span>{isAlreadyConnected ? 'Already Connected' : 'Connect Sub-Project'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
