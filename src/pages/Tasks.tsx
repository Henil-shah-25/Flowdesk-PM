import React, { useState, useMemo } from 'react';
import { useTableData, useCreateRecord, useUpdateRecord } from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import { Button, Modal } from '../components/ui';
import { CountUp } from '../components/common/CountUp';
import { TaskDetailDrawer } from '../components/kanban/TaskDetailDrawer';
import { TasksFilterBar } from '../components/tasks/TasksFilterBar';
import { TaskBoardView, type TaskBoardColumnId } from '../components/tasks/TaskBoardView';
import { TaskListView } from '../components/tasks/TaskListView';
import type { TaskItem, Stage } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import { isWithinInterval, startOfDay, startOfWeek, endOfWeek, isBefore, isToday } from 'date-fns';

export function Tasks() {
  const { showToast } = useToast();

  const { data: tasks = [] } = useTableData('Tasks');
  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');

  const createTask = useCreateRecord('Tasks');
  const updateTask = useUpdateRecord('Tasks');

  // Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedDue, setSelectedDue] = useState<string>('any');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Selected task for drawer
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // New task modal state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskDeptId, setNewTaskDeptId] = useState('');
  const [newTaskStageId, setNewTaskStageId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('medium');
  const [newTaskEstimate, setNewTaskEstimate] = useState(45);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Middle Stage Selection Popover State (if a department has multiple middle stages)
  const [middleStagePickerTask, setMiddleStagePickerTask] = useState<{
    task: TaskItem;
    availableStages: Stage[];
  } | null>(null);

  // Filter tasks based on controls
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.archived) return false;

      // Project filter
      if (selectedProjectId !== 'all' && t.project_id !== selectedProjectId) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      // Due date filter
      if (selectedDue !== 'any') {
        if (!t.due_date) return false;
        try {
          const d = new Date(t.due_date);
          const today = startOfDay(new Date());

          if (selectedDue === 'today') {
            if (!isToday(d)) return false;
          } else if (selectedDue === 'week') {
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return false;
          } else if (selectedDue === 'overdue') {
            if (Boolean(t.done_at) || !isBefore(d, today)) return false;
          }
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [tasks, selectedProjectId, selectedPriority, selectedDue, searchQuery]);

  // Real Stat Calculations across all projects
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    let openCount = 0;
    let dueThisWeekCount = 0;
    let overdueCount = 0;
    let doneThisWeekCount = 0;

    tasks.forEach((t) => {
      if (t.archived) return;

      const isDone = Boolean(t.done_at);
      if (!isDone) {
        openCount++;
      }

      // Check due date
      if (t.due_date) {
        try {
          const d = new Date(t.due_date);
          if (!isDone && isWithinInterval(d, { start: weekStart, end: weekEnd })) {
            dueThisWeekCount++;
          }
          if (!isDone && isBefore(d, today)) {
            overdueCount++;
          }
        } catch {
          // ignore invalid dates
        }
      }

      // Check done date
      if (t.done_at) {
        try {
          const doneDate = new Date(t.done_at);
          if (isWithinInterval(doneDate, { start: weekStart, end: weekEnd })) {
            doneThisWeekCount++;
          }
        } catch {
          // ignore invalid dates
        }
      }
    });

    const activeProjectCount = new Set(
      tasks.filter((t) => !t.done_at && !t.archived).map((t) => t.project_id)
    ).size;

    return {
      openCount,
      dueThisWeekCount,
      overdueCount,
      doneThisWeekCount,
      activeProjectCount,
    };
  }, [tasks]);

  // Handle Drag & Drop move across 4 columns
  const handleMoveTaskToColumn = (
    taskId: string,
    targetCol: TaskBoardColumnId,
    specificStageId?: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Find stages for this department
    const deptStages = stages
      .filter((s) => s.department_id === task.department_id)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    let targetStageId: string | undefined = specificStageId;
    let newDoneAt: string | undefined = undefined;

    if (targetCol === 'Started') {
      const started =
        deptStages.find((s) => s.name.toLowerCase() === 'started' || s.kind === 'normal') ||
        deptStages[0];
      targetStageId = started?.id;
      newDoneAt = '';
    } else if (targetCol === 'Ended') {
      const ended =
        deptStages.find((s) => s.kind === 'done' || s.name.toLowerCase() === 'ended') ||
        deptStages[deptStages.length - 1];
      targetStageId = ended?.id;
      newDoneAt = new Date().toISOString();
    } else if (targetCol === 'Blockade') {
      const blockade =
        deptStages.find((s) => s.kind === 'blocked' || s.name.toLowerCase() === 'blockade') ||
        deptStages[deptStages.length - 1];
      targetStageId = blockade?.id;
      newDoneAt = '';
    } else if (targetCol === 'Middle') {
      // Find normal stages that are not the first stage
      const middleStages = deptStages.filter(
        (s) =>
          s.kind === 'normal' &&
          s.name.toLowerCase() !== 'started' &&
          s.id !== deptStages[0]?.id
      );

      if (middleStages.length > 1 && !specificStageId) {
        // Show popover to pick specific middle stage
        setMiddleStagePickerTask({ task, availableStages: middleStages });
        return;
      }

      const middle = middleStages[0] || deptStages[1] || deptStages[0];
      targetStageId = middle?.id;
      newDoneAt = '';
    }

    if (!targetStageId) return;

    const patch: Partial<TaskItem> = {
      stage_id: targetStageId,
    };
    if (newDoneAt !== undefined) {
      patch.done_at = newDoneAt;
    }

    updateTask.mutate({
      id: taskId,
      patch,
    });

    showToast({
      message: `Moved "${task.title}" to ${targetCol}`,
    });
  };

  // Toggle complete everywhere
  const handleToggleComplete = (task: TaskItem) => {
    const isDone = Boolean(task.done_at);
    const deptStages = stages.filter((s) => s.department_id === task.department_id);

    const patch: Partial<TaskItem> = {
      done_at: isDone ? '' : new Date().toISOString(),
    };

    if (!isDone) {
      const doneStage = deptStages.find((s) => s.kind === 'done');
      if (doneStage) patch.stage_id = doneStage.id;
    } else {
      const normalStage = deptStages.find((s) => s.kind === 'normal') || deptStages[0];
      if (normalStage) patch.stage_id = normalStage.id;
    }

    updateTask.mutate({
      id: task.id,
      patch,
    });

    showToast({
      message: isDone ? `Marked "${task.title}" active` : `Completed "${task.title}"`,
    });
  };

  // Quick Open Modal
  const handleOpenNewTask = () => {
    const defaultProj = (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id) || '';
    setNewTaskProjectId(defaultProj);

    const availableDepts = departments.filter((d) => d.project_id === defaultProj);
    const defaultDept = availableDepts[0]?.id || '';
    setNewTaskDeptId(defaultDept);

    const availableStgs = stages.filter((s) => s.department_id === defaultDept);
    setNewTaskStageId(availableStgs[0]?.id || '');

    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskEstimate(45);
    setNewTaskDueDate('');
    setIsNewTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjectId) return;

    createTask.mutate(
      {
        title: newTaskTitle.trim(),
        project_id: newTaskProjectId,
        department_id: newTaskDeptId,
        stage_id: newTaskStageId,
        priority: newTaskPriority,
        estimate_min: newTaskEstimate,
        actual_min: 0,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : '',
        order: tasks.length + 1,
        created_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          showToast({ message: `Created task "${newTaskTitle.trim()}"` });
          setIsNewTaskModalOpen(false);
          setNewTaskTitle('');
        },
      }
    );
  };

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* Page Header: Title + Real Subtitle + 4 Stat Tiles */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 pt-1">
        <div>
          <h1 className="text-[clamp(32px,6vw,52px)] sm:text-[clamp(44px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
            Tasks
          </h1>
          <p className="text-xs sm:text-base text-secondary mt-1.5 sm:mt-2 font-normal">
            {stats.openCount} open across {stats.activeProjectCount || projects.length} project
            {stats.activeProjectCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* 4 Stat Tiles: Open, Due this week, Overdue, Done this week */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 shrink-0">
          {/* Open */}
          <div data-stat-tile="open" className="bg-panel backdrop-blur-[20px] border border-white/60 shadow-glass rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/70 border border-white/80 flex items-center justify-center text-graphite shrink-0 shadow-xs">
              <CheckSquare size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[24px] sm:text-[34px] font-light text-graphite leading-none tracking-tight">
                <CountUp value={stats.openCount} duration={700} />
              </p>
              <p className="text-[11px] sm:text-xs text-secondary mt-1 font-normal truncate">Open</p>
            </div>
          </div>

          {/* Due this week */}
          <div data-stat-tile="due-this-week" className="bg-panel backdrop-blur-[20px] border border-white/60 shadow-glass rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky/20 border border-sky/30 flex items-center justify-center text-blue-700 shrink-0 shadow-xs">
              <Clock size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[24px] sm:text-[34px] font-light text-graphite leading-none tracking-tight">
                <CountUp value={stats.dueThisWeekCount} duration={700} />
              </p>
              <p className="text-[11px] sm:text-xs text-secondary mt-1 font-normal truncate">Due week</p>
            </div>
          </div>

          {/* Overdue */}
          <div data-stat-tile="overdue" className="bg-panel backdrop-blur-[20px] border border-white/60 shadow-glass rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-coral/20 border border-coral/30 flex items-center justify-center text-coral shrink-0 shadow-xs">
              <AlertTriangle size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[24px] sm:text-[34px] font-light text-graphite leading-none tracking-tight">
                <CountUp value={stats.overdueCount} duration={700} />
              </p>
              <p className="text-[11px] sm:text-xs text-secondary mt-1 font-normal truncate">Overdue</p>
            </div>
          </div>

          {/* Done this week */}
          <div data-stat-tile="done-this-week" className="bg-panel backdrop-blur-[20px] border border-white/60 shadow-glass rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-lime/30 border border-lime/40 flex items-center justify-center text-graphite shrink-0 shadow-xs">
              <CheckCircle2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[24px] sm:text-[34px] font-light text-graphite leading-none tracking-tight">
                <CountUp value={stats.doneThisWeekCount} duration={700} />
              </p>
              <p className="text-[11px] sm:text-xs text-secondary mt-1 font-normal truncate">Done week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar (Paper pill) */}
      <TasksFilterBar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        selectedPriority={selectedPriority}
        onSelectPriority={setSelectedPriority}
        selectedDue={selectedDue}
        onSelectDue={setSelectedDue}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenNewTask={handleOpenNewTask}
      />

      {/* Main View: Board vs. List */}
      {viewMode === 'board' ? (
        <TaskBoardView
          tasks={filteredTasks}
          projects={projects}
          departments={departments}
          stages={stages}
          onMoveTaskToColumn={handleMoveTaskToColumn}
          onOpenDrawer={setSelectedTask}
          onToggleComplete={handleToggleComplete}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          projects={projects}
          departments={departments}
          onOpenDrawer={setSelectedTask}
          onToggleComplete={handleToggleComplete}
        />
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task"
        description="Add a task across any project, department, and stage pipeline."
      >
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5 font-medium">Task Title</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Design wireframes for mobile checkout"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-lime/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5 font-medium">Project</label>
              <select
                value={newTaskProjectId}
                onChange={(e) => {
                  const projId = e.target.value;
                  setNewTaskProjectId(projId);
                  const depts = departments.filter((d) => d.project_id === projId);
                  setNewTaskDeptId(depts[0]?.id || '');
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5 font-medium">Department</label>
              <select
                value={newTaskDeptId}
                onChange={(e) => {
                  const deptId = e.target.value;
                  setNewTaskDeptId(deptId);
                  const stgs = stages.filter((s) => s.department_id === deptId);
                  setNewTaskStageId(stgs[0]?.id || '');
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
              >
                {departments
                  .filter((d) => d.project_id === newTaskProjectId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5 font-medium">Stage</label>
              <select
                value={newTaskStageId}
                onChange={(e) => setNewTaskStageId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
              >
                {stages
                  .filter((s) => s.department_id === newTaskDeptId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.kind})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5 font-medium">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskItem['priority'])}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5 font-medium">Estimate (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={newTaskEstimate}
                onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5 font-medium">Due Date</label>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.05]">
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
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Middle Stage Selection Modal */}
      {middleStagePickerTask && (
        <Modal
          isOpen={Boolean(middleStagePickerTask)}
          onClose={() => setMiddleStagePickerTask(null)}
          title="Select Middle Stage"
          description={`Choose which stage in ${middleStagePickerTask.task.title}'s department pipeline to move to:`}
        >
          <div className="space-y-3 pt-2">
            {middleStagePickerTask.availableStages.map((stg) => (
              <button
                key={stg.id}
                type="button"
                onClick={() => {
                  handleMoveTaskToColumn(
                    middleStagePickerTask.task.id,
                    'Middle',
                    stg.id
                  );
                  setMiddleStagePickerTask(null);
                }}
                className="w-full p-3.5 rounded-2xl bg-white/60 hover:bg-white/90 border border-white/70 transition-all text-left flex items-center justify-between group shadow-xs hover:shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#D2E38A' }}
                  />
                  <span className="text-sm text-graphite font-medium">
                    {stg.name}
                  </span>
                </div>
                <span className="text-xs text-secondary group-hover:text-graphite">
                  Select →
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
