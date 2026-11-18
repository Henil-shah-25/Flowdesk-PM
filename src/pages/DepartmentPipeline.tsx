import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  useTableData,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useBatchUpdateRecord,
} from '../hooks/useData';
import { PipelineBoard } from '../components/kanban/PipelineBoard';
import { Button, GlassCard, IconButton, Modal } from '../components/ui';
import { TemplateModal } from '../components/departments/TemplateModal';
import { useToast } from '../components/common/Toast';
import { CountUp } from '../components/common/CountUp';
import type { Department, TaskItem } from '../types';
import {
  ChevronRight,
  ArrowLeft,
  Power,
  Search,
  Download,
  Plus,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Kanban,
  List as ListIcon,
  BookOpen,
} from 'lucide-react';
import { isWithinInterval, addDays, startOfDay } from 'date-fns';

export function DepartmentPipeline() {
  const { projectId, departmentId } = useParams<{ projectId: string; departmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: projects = [], isLoading: projectsLoading } = useTableData('Projects');
  const { data: departments = [], isLoading: departmentsLoading } = useTableData('Departments');
  const { data: allStages = [] } = useTableData('Stages');
  const { data: allTasks = [] } = useTableData('Tasks');

  const createTaskMutation = useCreateRecord('Tasks');
  const updateTaskMutation = useUpdateRecord('Tasks');
  const batchUpdateTasksMutation = useBatchUpdateRecord('Tasks');
  const deleteTaskMutation = useDeleteRecord('Tasks');

  const createStageMutation = useCreateRecord('Stages');
  const updateStageMutation = useUpdateRecord('Stages');
  const deleteStageMutation = useDeleteRecord('Stages');
  const batchUpdateStagesMutation = useBatchUpdateRecord('Stages');

  const updateDepartmentMutation = useUpdateRecord('Departments');

  // Page Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('medium');
  const [newTaskEstimate, setNewTaskEstimate] = useState(45);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === projectId);
  }, [projects, projectId]);

  const currentDepartment = useMemo(() => {
    return departments.find((d) => d.id === departmentId);
  }, [departments, departmentId]);

  // Determine parent department and sibling sub-departments
  const { parentDepartment, allFamilyTabs } = useMemo(() => {
    if (!currentDepartment || !projectId) {
      return { parentDepartment: null, allFamilyTabs: [] };
    }

    const isSub = Boolean(currentDepartment.parent_id);
    const parent = isSub
      ? departments.find((d) => d.id === currentDepartment.parent_id) || currentDepartment
      : currentDepartment;

    const subs = departments
      .filter((d) => d.project_id === projectId && d.parent_id === parent.id)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    // Array of tabs: parent first, then its sub-departments
    const tabs: Department[] = [parent, ...subs];

    return {
      parentDepartment: parent,
      allFamilyTabs: tabs,
    };
  }, [currentDepartment, departments, projectId]);

  // Stages for this specific department
  const stages = useMemo(() => {
    if (!departmentId) return [];
    return allStages
      .filter((s) => s.department_id === departmentId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [allStages, departmentId]);

  // Tasks for this specific department
  const tasks = useMemo(() => {
    if (!departmentId) return [];
    return allTasks
      .filter((t) => t.department_id === departmentId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [allTasks, departmentId]);

  const isEnabled = currentDepartment
    ? currentDepartment.enabled !== false &&
      currentDepartment.enabled !== 'false' &&
      currentDepartment.enabled !== 0
    : true;

  // Stat calculations
  const stats = useMemo(() => {
    const openTasks = tasks.filter((t) => !t.done_at).length;

    // Due this week
    const now = startOfDay(new Date());
    const weekAhead = addDays(now, 7);
    const dueThisWeek = tasks.filter((t) => {
      if (!t.due_date || Boolean(t.done_at)) return false;
      try {
        const d = new Date(t.due_date);
        return isWithinInterval(d, { start: now, end: weekAhead });
      } catch {
        return false;
      }
    }).length;

    // Blocked tasks (tasks in a stage of kind 'blocked')
    const blockedStageIds = new Set(
      stages.filter((s) => s.kind === 'blocked').map((s) => s.id)
    );
    const blockedTasks = tasks.filter((t) => t.stage_id && blockedStageIds.has(t.stage_id)).length;

    return { openTasks, dueThisWeek, blockedTasks };
  }, [tasks, stages]);

  const handleTurnOn = () => {
    if (!currentDepartment) return;
    updateDepartmentMutation.mutate({
      id: currentDepartment.id,
      patch: { enabled: true },
    });
    showToast({
      message: `${currentDepartment.name} is now active.`,
    });
  };

  // Export tasks as JSON file
  const handleExportTasks = () => {
    const exportData = {
      project: currentProject?.name,
      department: currentDepartment?.name,
      exportDate: new Date().toISOString(),
      stages: stages.map((s) => ({ id: s.id, name: s.name, kind: s.kind, color: s.color })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        estimate_min: t.estimate_min,
        due_date: t.due_date,
        done: Boolean(t.done_at),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDepartment?.name || 'department'}-pipeline.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast({
      message: 'Exported pipeline data successfully.',
    });
  };

  // Modal new task submission
  const handleCreateNewTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentDepartment || !projectId) return;

    const startedStage =
      stages.find((s) => s.name.toLowerCase() === 'started' || s.kind === 'normal') ||
      stages[0];

    if (!startedStage) {
      showToast({ message: 'No stages available.' });
      return;
    }

    createTaskMutation.mutate({
      project_id: projectId,
      department_id: currentDepartment.id,
      stage_id: startedStage.id,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      estimate_min: newTaskEstimate,
      actual_min: 0,
      due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : '',
      order: tasks.length + 1,
      created_at: new Date().toISOString(),
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setIsNewTaskModalOpen(false);
    showToast({
      message: `Created task "${newTaskTitle.trim()}".`,
    });
  };

  if (projectsLoading || departmentsLoading) {
    return (
      <div className="space-y-6 max-w-full pb-14">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h1 className="text-[clamp(52px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
              Loading Pipeline...
            </h1>
          </div>
        </div>
        <div className="py-20 text-center skeleton-shimmer rounded-3xl p-12 max-w-md mx-auto">
          <p className="text-secondary text-base">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  if (!currentProject || !currentDepartment) {
    return (
      <div className="space-y-6 max-w-full pb-14">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h1 className="text-[clamp(52px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
              Pipeline / Not Found
            </h1>
          </div>
        </div>
        <div className="py-20 text-center">
          <GlassCard className="max-w-md mx-auto p-8 text-center">
            <p className="text-secondary text-base mb-4">Department or Project not found.</p>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Return to Projects
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  const isSubDept = Boolean(currentDepartment.parent_id);

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Title & Stats Header (h1 at top: clamp(52px, 5.5vw, 76px)) */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-[clamp(52px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
            <div>{parentDepartment ? parentDepartment.name : currentDepartment.name} /</div>
            <div className="text-graphite/80">{isSubDept ? currentDepartment.name : 'Pipeline'}</div>
          </h1>

          {/* Breadcrumbs Navigation */}
          <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-secondary flex-wrap mt-2.5">
            <Link
              to="/projects"
              className="hover:text-graphite transition-colors flex items-center gap-1"
            >
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <Link
              to={`/projects/${currentProject.id}`}
              className="hover:text-graphite font-medium transition-colors"
            >
              {currentProject.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            {isSubDept && parentDepartment && (
              <>
                <Link
                  to={`/projects/${currentProject.id}/d/${parentDepartment.id}`}
                  className="hover:text-graphite transition-colors"
                >
                  {parentDepartment.name}
                </Link>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </>
            )}
            <span className="text-graphite font-medium flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: currentDepartment.color || '#5B5BF0' }}
              />
              {currentDepartment.name}
            </span>
          </nav>
        </div>

        {/* Action Buttons & Stat Blocks */}
        <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
          {/* Action Header Items */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-secondary" />
              <span>Templates</span>
            </Button>
            <IconButton
              aria-label="Back to project"
              size="md"
              icon={<ArrowLeft className="w-4 h-4 text-graphite" />}
              onClick={() => navigate(`/projects/${currentProject.id}`)}
            />
          </div>

          {/* Stat 1: Open Tasks */}
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] rounded-full bg-white/55 border border-white/60 flex items-center justify-center text-graphite shadow-sm">
              <CheckCircle2 size={20} className="text-graphite" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl md:text-[52px] font-light tracking-tight text-graphite leading-none">
                <CountUp value={stats.openTasks} />
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1">Open tasks</div>
            </div>
          </div>

          {/* Stat 2: Due This Week */}
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] rounded-full bg-white/55 border border-white/60 flex items-center justify-center text-amber shadow-sm">
              <Calendar size={20} className="text-amber" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl md:text-[52px] font-light tracking-tight text-graphite leading-none">
                <CountUp value={stats.dueThisWeek} />
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1">Due this week</div>
            </div>
          </div>

          {/* Stat 3: Blocked */}
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] rounded-full bg-white/55 border border-white/60 flex items-center justify-center text-coral shadow-sm">
              <AlertTriangle size={20} className="text-coral" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl md:text-[52px] font-light tracking-tight text-graphite leading-none">
                <CountUp value={stats.blockedTasks} />
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1">Blocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row: Search Pill, Sub-department Switcher Chips, Board/List Toggle, Export, + New Task */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          {/* Search Pill Input */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-full bg-white/55 hover:bg-white/75 focus:bg-white border border-white/60 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 transition-all shadow-sm"
            />
          </div>

          {/* Sub-Department Switching Chips */}
          {allFamilyTabs.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {allFamilyTabs.map((tab) => {
                const isSelected = tab.id === currentDepartment.id;
                const isTabEnabled =
                  tab.enabled !== false && tab.enabled !== 'false' && tab.enabled !== 0;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigate(`/projects/${currentProject.id}/d/${tab.id}`)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-normal whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-nearblack text-white border-nearblack shadow-sm font-medium'
                        : isTabEnabled
                        ? 'bg-white/55 hover:bg-white/80 text-graphite border-white/60 shadow-sm'
                        : 'bg-white/30 text-secondary/40 border-black/[0.04] line-through'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tab.color || '#5B5BF0' }}
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Toggle, Export, and + New Task Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
          {/* Board | List Segmented Toggle */}
          <div className="p-1 rounded-full bg-white/55 border border-white/60 shadow-sm flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'board'
                  ? 'bg-nearblack text-white font-medium shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              <Kanban size={13} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-nearblack text-white font-medium shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              <ListIcon size={13} />
              <span>List</span>
            </button>
          </div>

          {/* Export Button (Circle) */}
          <IconButton
            icon={<Download size={15} />}
            aria-label="Export pipeline data"
            variant="glass"
            size="md"
            onClick={handleExportTasks}
          />

          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="h-10 px-3.5 rounded-full bg-white/55 hover:bg-white/80 border border-white/60 text-graphite text-xs font-normal flex items-center gap-1.5 transition-all shadow-sm"
          >
            <BookOpen size={14} className="text-secondary" />
            <span>Templates</span>
          </button>

          {/* Lime "+ New task" Button */}
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setIsNewTaskModalOpen(true)}
          >
            New task
          </Button>
        </div>
      </div>

      {/* OFF Banner */}
      {!isEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber/15 border border-amber/30 text-graphite flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-2.5">
            <Power className="w-4 h-4 text-amber" />
            <span className="text-sm font-medium">
              This department is turned OFF. Tasks are excluded from progress and health calculations.
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={handleTurnOn}>
            Turn Department ON
          </Button>
        </motion.div>
      )}

      {/* Kanban Pipeline Board or List View */}
      <PipelineBoard
        projectId={currentProject.id}
        projectName={currentProject.name}
        departmentId={currentDepartment.id}
        department={currentDepartment}
        stages={stages}
        tasks={tasks}
        isReadOnly={!isEnabled}
        viewMode={viewMode}
        searchQuery={searchQuery}
        onBrowseTemplates={() => setIsTemplateModalOpen(true)}
        onUpdateTask={(taskId, patch) => updateTaskMutation.mutate({ id: taskId, patch })}
        onBatchUpdateTasks={(updates) => batchUpdateTasksMutation.mutate(updates)}
        onCreateTask={(task) => createTaskMutation.mutate(task)}
        onDeleteTask={(taskId) => {
          const taskToDelete = tasks.find((t) => t.id === taskId);
          deleteTaskMutation.mutate(taskId);
          if (taskToDelete) {
            showToast({
              message: `Deleted "${taskToDelete.title}"`,
              actionLabel: 'Undo',
              onAction: () => createTaskMutation.mutate(taskToDelete),
            });
          }
        }}
        onCreateStage={(stage) => createStageMutation.mutate(stage)}
        onUpdateStage={(stageId, patch) => updateStageMutation.mutate({ id: stageId, patch })}
        onDeleteStage={(stageId, moveTasksToStageId) => {
          if (moveTasksToStageId) {
            const tasksInStage = tasks.filter((t) => t.stage_id === stageId);
            tasksInStage.forEach((t) => {
              updateTaskMutation.mutate({
                id: t.id,
                patch: { stage_id: moveTasksToStageId },
              });
            });
          }
          deleteStageMutation.mutate(stageId);
        }}
        onReorderStages={(reordered) => {
          batchUpdateStagesMutation.mutate(reordered);
        }}
        onTurnDepartmentOn={handleTurnOn}
      />

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Add New Task"
        description={`Create a new task in ${currentDepartment.name}.`}
      >
        <form onSubmit={handleCreateNewTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Task Title</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Conduct SERP keyword mapping"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskItem['priority'])}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5">Estimate (min)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={newTaskEstimate}
                onChange={(e) => setNewTaskEstimate(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Target Due Date</label>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.04]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewTaskModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newTaskTitle.trim()}
            >
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Template Selection Modal */}
      {currentDepartment && (
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          projectId={currentProject.id}
          departmentId={currentDepartment.id}
          departmentName={parentDepartment?.name || currentDepartment.name}
          subName={currentDepartment.parent_id ? currentDepartment.name : ''}
          startedStageId={stages.find((s) => s.kind === 'normal')?.id}
        />
      )}
    </div>
  );
}

export default DepartmentPipeline;
