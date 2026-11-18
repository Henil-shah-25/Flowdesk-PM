import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CountUp } from '../components/common/CountUp';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  isThisWeek,
  formatDistanceToNow,
  setHours,
  setMinutes,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Zap,
  MoreVertical,
  Check,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  pointerWithin,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Button, IconButton, Modal } from '../components/ui';
import { TaskDetailDrawer } from '../components/kanban/TaskDetailDrawer';
import { useTableData, useCreateRecord, useUpdateRecord, useDeleteRecord } from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import type { TaskItem, Project, Department } from '../types';

// Hours to display in week view
const WEEK_HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00 (8 AM - 8 PM)

// -----------------------------------------------------------------------------
// Draggable Task Chip for Month View
// -----------------------------------------------------------------------------
interface DraggableTaskChipProps {
  task: TaskItem;
  dept?: Department;
  isTodayCell: boolean;
  onOpenDrawer: (task: TaskItem) => void;
}

function DraggableTaskChip({
  task,
  dept,
  isTodayCell,
  onOpenDrawer,
}: DraggableTaskChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      type: 'TaskChip',
      task,
    },
  });

  const isCompleted = Boolean(task.done_at);
  const dueTimeStr = task.due_date
    ? format(new Date(task.due_date), 'h:mma')
    : 'All day';

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.25 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-calendar-chip={task.id}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDrawer(task);
      }}
      className={`h-[30px] rounded-full px-3 text-[14px] md:text-[15px] shadow-xs border flex items-center gap-2 select-none cursor-grab active:cursor-grabbing transition-colors hover:shadow-sm ${
        isTodayCell
          ? 'bg-white/20 text-white border-white/25 hover:bg-white/30'
          : 'bg-white text-graphite border-black/[0.06] hover:bg-white/95'
      } ${isCompleted ? 'line-through opacity-50' : ''}`}
    >
      {/* Department dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: dept?.color || '#8DB3DE' }}
      />
      {/* Title */}
      <span className="truncate flex-1 font-normal tracking-tight">{task.title}</span>
      {/* Time on the right */}
      <span
        className={`shrink-0 text-xs font-normal ${
          isTodayCell ? 'text-white/80' : 'text-secondary'
        }`}
      >
        {dueTimeStr}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Floating Drag Overlay Chip
// -----------------------------------------------------------------------------
function DragOverlayChip({ task, dept }: { task: TaskItem; dept?: Department }) {
  const dueTimeStr = task.due_date
    ? format(new Date(task.due_date), 'h:mma')
    : 'All day';

  return (
    <div
      style={{
        boxShadow: '0 16px 36px rgba(20, 25, 30, 0.22)',
        cursor: 'grabbing',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
      className="h-[30px] rounded-full px-3 text-[14px] md:text-[15px] bg-white text-graphite border-2 border-lime ring-2 ring-lime/40 flex items-center gap-2 select-none shadow-lg min-w-[180px] max-w-[280px]"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: dept?.color || '#8DB3DE' }}
      />
      <span className="truncate flex-1 font-normal">{task.title}</span>
      <span className="shrink-0 text-xs text-secondary">{dueTimeStr}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Droppable Month Day Cell
// -----------------------------------------------------------------------------
interface MonthDayCellProps {
  day: Date;
  currentDate: Date;
  dayTasks: TaskItem[];
  projectMap: Map<string, Project>;
  departmentMap: Map<string, Department>;
  onOpenQuickAdd: (dayKey: string) => void;
  onOpenDaySheet: (day: Date) => void;
  onOpenDrawer: (task: TaskItem) => void;
}

function MonthDayCell({
  day,
  currentDate,
  dayTasks,
  projectMap,
  departmentMap,
  onOpenQuickAdd,
  onOpenDaySheet,
  onOpenDrawer,
}: MonthDayCellProps) {
  const dayKey = format(day, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day_${dayKey}`,
    data: {
      type: 'DayCell',
      day,
      dayKey,
    },
  });

  const isCurrentMonth = isSameMonth(day, currentDate);
  const isDayToday = isToday(day);
  const hasTasks = dayTasks.length > 0;

  // Overlapping project badges
  const dayProjects = useMemo(() => {
    return Array.from(
      new Set(
        dayTasks
          .map((t) => projectMap.get(t.project_id))
          .filter(Boolean) as Project[]
      )
    );
  }, [dayTasks, projectMap]);

  return (
    <div
      ref={setNodeRef}
      data-day-cell={dayKey}
      onClick={() => onOpenDaySheet(day)}
      className={`group relative rounded-[24px] p-2.5 sm:p-3 min-h-[150px] 2xl:min-h-[160px] flex flex-col justify-between transition-all select-none cursor-pointer border ${
        isDayToday
          ? 'bg-charcoal text-white border-charcoal shadow-md ring-1 ring-charcoal'
          : hasTasks
          ? 'bg-[#8DB3DE]/60 text-graphite border-white/70 hover:bg-[#8DB3DE]/75'
          : 'bg-inner-surface text-graphite border-white/60 hover:bg-white/80'
      } ${!isCurrentMonth ? 'opacity-35' : ''} ${
        isOver ? 'ring-2 ring-lime border-dashed border-lime scale-[1.01]' : ''
      }`}
    >
      {/* Top row: 22px Day Number + Overlapping project badges */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[20px] md:text-[22px] font-light tracking-tight leading-none ${
            isDayToday
              ? 'w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-normal'
              : 'text-graphite'
          }`}
        >
          {format(day, 'd')}
        </span>

        {/* Overlapping project badges */}
        {dayProjects.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {dayProjects.slice(0, 3).map((proj) => (
              <div
                key={proj.id}
                title={proj.name}
                className="w-5 h-5 rounded-full text-[10px] font-semibold border-2 border-white flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: proj.color || '#5B5BF0' }}
              >
                {proj.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle: Task Chips (up to 3) or Mobile dots */}
      <div className="my-1.5 space-y-1.5 overflow-hidden">
        {/* Mobile dots (hidden md:block) */}
        <div className="md:hidden flex items-center gap-1.5 flex-wrap pt-1">
          {dayTasks.slice(0, 5).map((t) => {
            const dept = departmentMap.get(t.department_id);
            return (
              <span
                key={t.id}
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: dept?.color || '#8DB3DE' }}
              />
            );
          })}
          {dayTasks.length > 5 && (
            <span className="text-[10px] text-secondary font-medium">
              +{dayTasks.length - 5}
            </span>
          )}
        </div>

        {/* Desktop Task Chips: 30px tall, 14px text, colored dot + title + time */}
        <div className="hidden md:flex flex-col gap-1.5">
          {dayTasks.slice(0, 3).map((t) => (
            <DraggableTaskChip
              key={t.id}
              task={t}
              dept={departmentMap.get(t.department_id)}
              isTodayCell={isDayToday}
              onOpenDrawer={onOpenDrawer}
            />
          ))}

          {/* +N more link that opens day sheet */}
          {dayTasks.length > 3 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDaySheet(day);
              }}
              className={`text-left text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${
                isDayToday
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-secondary hover:text-graphite hover:bg-black/5'
              }`}
            >
              +{dayTasks.length - 3} more
            </button>
          )}
        </div>
      </div>

      {/* Bottom: Hover Quick Add "+" Button */}
      <div className="h-6 flex items-center justify-end">
        <button
          type="button"
          aria-label={`Add task for ${dayKey}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenQuickAdd(dayKey);
          }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-nearblack text-white flex items-center justify-center transition-all hover:scale-110 shadow-sm"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN CALENDAR PAGE
// -----------------------------------------------------------------------------
export const Calendar: React.FC = () => {
  const { data: tasks = [] } = useTableData('Tasks');
  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');

  const createTask = useCreateRecord('Tasks');
  const updateTask = useUpdateRecord('Tasks');
  const deleteTask = useDeleteRecord('Tasks');
  const { showToast } = useToast();

  // Navigation and view mode
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [slideDirection, setSlideDirection] = useState<number>(0);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  // Drag & drop active task for overlay
  const [activeDragTask, setActiveDragTask] = useState<TaskItem | null>(null);

  // Task Drawer State
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<TaskItem | null>(null);

  // Modal / Bottom Sheet States
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<Date | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(new Date());
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskDeptId, setNewTaskDeptId] = useState('');
  const [newTaskStageId, setNewTaskStageId] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('10:00');
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Lookup maps
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.archived) return false;
      if (selectedProjectId && t.project_id !== selectedProjectId) return false;
      if (selectedDepartmentId && t.department_id !== selectedDepartmentId) return false;
      return true;
    });
  }, [tasks, selectedProjectId, selectedDepartmentId]);

  // Header real computed stats
  const headerStats = useMemo(() => {
    const todayStart = startOfDay(new Date());

    let tasksTodayCount = 0;
    let thisWeekCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      if (t.archived) return;
      if (t.due_date) {
        try {
          const d = parseISO(t.due_date);
          if (isToday(d)) {
            tasksTodayCount++;
          }
          if (isThisWeek(d, { weekStartsOn: 1 })) {
            thisWeekCount++;
          }
          if (!t.done_at && isBefore(d, todayStart)) {
            overdueCount++;
          }
        } catch {
          // ignore invalid date strings
        }
      }
    });

    return { tasksTodayCount, thisWeekCount, overdueCount };
  }, [tasks]);

  // Today tasks (for right panel)
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.archived) return false;
      if (!t.due_date) return false;
      try {
        return isToday(parseISO(t.due_date));
      } catch {
        return false;
      }
    });
  }, [tasks]);

  const todayCompletedCount = todayTasks.filter((t) => Boolean(t.done_at)).length;

  // Overdue tasks (for right panel)
  const overdueTasks = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return tasks.filter((t) => {
      if (t.archived || Boolean(t.done_at) || !t.due_date) return false;
      try {
        return isBefore(parseISO(t.due_date), todayStart);
      } catch {
        return false;
      }
    });
  }, [tasks]);

  // Month days
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Tasks grouped by yyyy-MM-dd
  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    filteredTasks.forEach((t) => {
      if (!t.due_date) return;
      try {
        const key = format(parseISO(t.due_date), 'yyyy-MM-dd');
        const list = map.get(key) || [];
        list.push(t);
        map.set(key, list);
      } catch {
        // ignore invalid dates
      }
    });
    return map;
  }, [filteredTasks]);

  // Available stages for the new task modal based on selected department
  const availableStages = useMemo(() => {
    const deptId = newTaskDeptId || (departments[0]?.id || '');
    return stages
      .filter((s) => s.department_id === deptId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [stages, newTaskDeptId, departments]);

  // Handlers for navigation
  const handlePrev = () => {
    setSlideDirection(-1);
    if (viewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else {
      setCurrentDate((prev) => subWeeks(prev, 1));
    }
  };

  const handleNext = () => {
    setSlideDirection(1);
    if (viewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addWeeks(prev, 1));
    }
  };

  const handleTodayClick = () => {
    setSlideDirection(0);
    setCurrentDate(new Date());
  };

  // Toggle task completion and move to/from done stage
  const handleToggleTask = (task: TaskItem) => {
    const isCompleted = Boolean(task.done_at);
    const patch: Partial<TaskItem> = {
      done_at: isCompleted ? '' : new Date().toISOString(),
    };

    if (!isCompleted && task.department_id) {
      const doneStage = stages.find(
        (s) => s.department_id === task.department_id && s.kind === 'done'
      );
      if (doneStage) {
        patch.stage_id = doneStage.id;
      }
    }

    updateTask.mutate({
      id: task.id,
      patch,
    });

    showToast({
      message: isCompleted ? 'Task marked active' : 'Task marked Done',
    });
  };

  // Quick add opener
  const handleOpenQuickAdd = (dayKey: string) => {
    setPrefilledDate(dayKey);
    const defaultProject = selectedProjectId || (projects[0]?.id || '');
    setNewTaskProjectId(defaultProject);
    const defaultDept = selectedDepartmentId || (departments.find((d) => d.project_id === defaultProject)?.id || departments[0]?.id || '');
    setNewTaskDeptId(defaultDept);
    const defaultStage = stages.find((s) => s.department_id === defaultDept && s.kind === 'normal')?.id || '';
    setNewTaskStageId(defaultStage);
    setIsNewTaskModalOpen(true);
  };

  // Create task submit
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const projId = newTaskProjectId || (projects[0]?.id || '');
    const deptId = newTaskDeptId || (departments.find((d) => d.project_id === projId)?.id || departments[0]?.id || '');
    const stgId = newTaskStageId || (stages.find((s) => s.department_id === deptId)?.id || '');

    const [hh, mm] = newTaskTime.split(':').map(Number);
    let taskDate = new Date(prefilledDate);
    if (!isNaN(hh) && !isNaN(mm)) {
      taskDate = setHours(taskDate, hh);
      taskDate = setMinutes(taskDate, mm);
    }

    createTask.mutate(
      {
        title: newTaskTitle.trim(),
        project_id: projId,
        department_id: deptId,
        stage_id: stgId,
        due_date: taskDate.toISOString(),
        priority: 'medium',
        estimate_min: 30,
        actual_min: 0,
        order: 1,
      },
      {
        onSuccess: () => {
          showToast({
            message: `Created "${newTaskTitle.trim()}" for ${format(taskDate, 'MMM d')}`,
          });
          setNewTaskTitle('');
          setIsNewTaskModalOpen(false);
        },
      }
    );
  };

  // dnd-kit Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveDragTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return;

    const overId = String(over.id);
    // Expect overId to be "day_YYYY-MM-DD"
    if (!overId.startsWith('day_')) return;

    const targetDayStr = overId.replace('day_', '');
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const targetDay = parseISO(targetDayStr);
    let targetDateTime = targetDay;
    if (activeTask.due_date) {
      try {
        const orig = parseISO(activeTask.due_date);
        targetDateTime = setHours(targetDateTime, orig.getHours());
        targetDateTime = setMinutes(targetDateTime, orig.getMinutes());
      } catch {
        targetDateTime = setHours(targetDateTime, 10);
      }
    } else {
      targetDateTime = setHours(targetDateTime, 10);
    }

    const newIso = targetDateTime.toISOString();
    updateTask.mutate({
      id: activeTask.id,
      patch: {
        due_date: newIso,
      },
    });

    showToast({
      message: `Rescheduled to ${format(targetDateTime, 'EEE, MMM d')}`,
    });
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* =========================================================================
          PAGE HEADER (Title + Stat Blocks + Filters)
         ========================================================================= */}
      <div className="space-y-5">
        {/* Title and Stat Blocks: clamp(52px, 5.5vw, 76px) title + 52px stat numbers */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-[clamp(52px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
              Schedule
            </h1>
            <p className="text-sm sm:text-base text-secondary mt-1.5 font-normal">
              Unified cross-project calendar and execution timeline.
            </p>
          </div>

          {/* Three Stat Blocks: Tasks today, This week, Overdue (52px numbers) */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Stat: Tasks Today */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-[22px] bg-panel backdrop-blur-[24px] border border-white/60 shadow-glass">
              <div className="w-[52px] h-[52px] rounded-full bg-tint-sky/50 text-graphite flex items-center justify-center">
                <CalendarIcon size={20} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-[52px] font-light tracking-tight text-graphite leading-none">
                  <CountUp value={headerStats.tasksTodayCount} />
                </div>
                <div className="text-xs sm:text-sm text-secondary font-normal mt-1">Tasks today</div>
              </div>
            </div>

            {/* Stat: This Week */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-[22px] bg-panel backdrop-blur-[24px] border border-white/60 shadow-glass">
              <div className="w-[52px] h-[52px] rounded-full bg-lime/40 text-graphite flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-[52px] font-light tracking-tight text-graphite leading-none">
                  <CountUp value={headerStats.thisWeekCount} />
                </div>
                <div className="text-xs sm:text-sm text-secondary font-normal mt-1">This week</div>
              </div>
            </div>

            {/* Stat: Overdue */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-[22px] bg-panel backdrop-blur-[24px] border border-white/60 shadow-glass">
              <div className="w-[52px] h-[52px] rounded-full bg-coral/20 text-coral flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <div data-stat-overdue className="text-2xl sm:text-3xl md:text-[52px] font-light tracking-tight text-coral leading-none">
                  <CountUp value={headerStats.overdueCount} />
                </div>
                <div className="text-xs sm:text-sm text-secondary font-normal mt-1">Overdue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Row: "All projects" pill + Project chips + Divider + Department chips + Lime "+ New task" */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
          <div className="flex items-center gap-2.5 flex-wrap overflow-x-auto no-scrollbar py-1 max-w-full">
            {/* "All projects" near-black pill */}
            <button
              type="button"
              onClick={() => setSelectedProjectId(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedProjectId === null
                  ? 'bg-nearblack text-white shadow-sm'
                  : 'bg-white/55 text-secondary hover:text-graphite border border-white/60'
              }`}
            >
              All projects
            </button>

            {/* Project chips with color dot */}
            {projects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(isSelected ? null : p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-nearblack text-white shadow-sm'
                      : 'bg-white/55 text-secondary hover:text-graphite border border-white/60 hover:bg-white/80'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color || '#5B5BF0' }}
                  />
                  <span>{p.name}</span>
                </button>
              );
            })}

            {/* Thin Divider */}
            <div className="h-5 w-px bg-black/[0.08] mx-1 shrink-0" />

            {/* Department chips */}
            {departments.slice(0, 8).map((d) => {
              const isSelected = selectedDepartmentId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDepartmentId(isSelected ? null : d.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-nearblack text-white shadow-sm'
                      : 'bg-white/55 text-secondary hover:text-graphite border border-white/60 hover:bg-white/80'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: d.color || '#8DB3DE' }}
                  />
                  <span>{d.name}</span>
                </button>
              );
            })}
          </div>

          {/* Lime "+ New task" button */}
          <div className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => handleOpenQuickAdd(format(new Date(), 'yyyy-MM-dd'))}
            >
              + New task
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN LAYOUT: Calendar panel minmax(0,1fr) and Today panel 380px
         ========================================================================= */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          {/* ---------------------------------------------------------------------
              CALENDAR PANEL (Left: minmax(0,1fr), nearly full viewport height)
             --------------------------------------------------------------------- */}
          <div className="rounded-[32px] bg-panel backdrop-blur-[24px] border border-white/55 p-3.5 sm:p-7 shadow-glass space-y-4 sm:space-y-5 min-h-[calc(100vh-220px)] flex flex-col justify-between">
            <div>
              {/* Calendar Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-black/[0.04]">
                {/* Panel Title & Nav Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-start w-full sm:w-auto">
                  <h2 className="text-lg sm:text-2xl font-light tracking-tight text-graphite truncate">
                    {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
                  </h2>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton
                      icon={<ChevronLeft size={16} />}
                      aria-label="Previous"
                      size="sm"
                      onClick={handlePrev}
                    />
                    <IconButton
                      icon={<ChevronRight size={16} />}
                      aria-label="Next"
                      size="sm"
                      onClick={handleNext}
                    />
                    <button
                      type="button"
                      onClick={handleTodayClick}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-white/60 hover:bg-white/90 border border-white/60 text-graphite transition-all shadow-xs active:scale-95"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Month | Week segmented toggle & More Options */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-full bg-black/[0.05] p-1 border border-white/50 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('month')}
                      className={`px-4 py-1 rounded-full font-medium transition-all ${
                        viewMode === 'month'
                          ? 'bg-nearblack text-white shadow-sm'
                          : 'text-secondary hover:text-graphite'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('week')}
                      className={`px-4 py-1 rounded-full font-medium transition-all ${
                        viewMode === 'week'
                          ? 'bg-nearblack text-white shadow-sm'
                          : 'text-secondary hover:text-graphite'
                      }`}
                    >
                      Week
                    </button>
                  </div>

                  <IconButton
                    icon={<MoreVertical size={15} />}
                    aria-label="Calendar options"
                    size="sm"
                    onClick={() => showToast({ message: 'Viewing schedule' })}
                  />
                </div>
              </div>

              {/* -----------------------------------------------------------------
                  MONTH VIEW (Desktop: full 150px grid; Mobile: native compact month + agenda)
                 ----------------------------------------------------------------- */}
              {viewMode === 'month' && (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={format(currentDate, 'yyyy-MM')}
                    initial={{ opacity: 0, x: slideDirection * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDirection * -20 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="space-y-4 pt-2"
                  >
                    {/* MOBILE CALENDAR VIEW (<md): Compact Date Grid + Day Agenda */}
                    <div className="md:hidden space-y-4">
                      {/* Weekday abbreviations */}
                      <div className="grid grid-cols-7 text-center text-xs font-medium text-secondary py-1">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayAbbr, idx) => (
                          <div key={idx} className="py-1">
                            {dayAbbr}
                          </div>
                        ))}
                      </div>

                      {/* Compact Day Chips Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((day) => {
                          const dayKey = format(day, 'yyyy-MM-dd');
                          const dayTasks = tasksByDay.get(dayKey) || [];
                          const isCurrentMonth = isSameMonth(day, currentDate);
                          const isDayToday = isToday(day);
                          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedMobileDay, 'yyyy-MM-dd');

                          return (
                            <button
                              key={`mobile_${dayKey}`}
                              type="button"
                              onClick={() => setSelectedMobileDay(day)}
                              className={`h-11 rounded-2xl flex flex-col items-center justify-center p-1 relative transition-all active:scale-95 ${
                                isSelected
                                  ? 'bg-nearblack text-white shadow-sm'
                                  : isDayToday
                                  ? 'bg-white/80 text-nearblack font-semibold border border-lime ring-1 ring-lime/50'
                                  : 'hover:bg-white/60 text-graphite'
                              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                            >
                              <span className="text-xs sm:text-sm font-normal leading-none">
                                {format(day, 'd')}
                              </span>
                              {/* Task dots */}
                              {dayTasks.length > 0 && (
                                <div className="flex items-center gap-0.5 mt-1">
                                  {dayTasks.slice(0, 3).map((t, idx) => (
                                    <span
                                      key={idx}
                                      className="w-1 h-1 rounded-full shrink-0"
                                      style={{
                                        backgroundColor: isSelected
                                          ? '#BBD85A'
                                          : departmentMap.get(t.department_id)?.color || '#8DB3DE',
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Day Agenda */}
                      {(() => {
                        const selectedKey = format(selectedMobileDay, 'yyyy-MM-dd');
                        const selectedDayTasks = tasksByDay.get(selectedKey) || [];

                        return (
                          <div className="pt-3 border-t border-black/[0.06] space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-medium text-graphite">
                                  {format(selectedMobileDay, 'EEEE, MMM d')}
                                </h3>
                                <p className="text-[11px] text-secondary">
                                  {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? '' : 's'} scheduled
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickAdd(selectedKey)}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] transition-all shadow-xs flex items-center gap-1 active:scale-95"
                              >
                                <Plus size={13} />
                                <span>Add task</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {selectedDayTasks.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-white/40 border border-black/[0.04] text-center text-xs text-secondary">
                                  No tasks scheduled for this day
                                </div>
                              ) : (
                                selectedDayTasks.map((task) => {
                                  const isDone = Boolean(task.done_at);
                                  const dept = departmentMap.get(task.department_id);
                                  const proj = projectMap.get(task.project_id);

                                  return (
                                    <div
                                      key={task.id}
                                      onClick={() => setSelectedTaskForDrawer(task)}
                                      className={`p-3 rounded-2xl bg-white/70 border border-black/[0.05] shadow-xs flex items-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer ${
                                        isDone ? 'opacity-50 line-through' : ''
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTask(task);
                                        }}
                                        className="shrink-0 p-0.5"
                                        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                                      >
                                        {isDone ? (
                                          <Check size={16} className="text-lime" />
                                        ) : (
                                          <span
                                            className="w-4 h-4 rounded-full border border-black/30 block"
                                          />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-normal text-graphite truncate">
                                          {task.title}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-secondary">
                                          {proj && <span className="truncate">{proj.name}</span>}
                                          {dept && (
                                            <>
                                              <span>•</span>
                                              <span style={{ color: dept.color || '#8DB3DE' }}>
                                                {dept.name}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {task.due_date && (
                                        <span className="text-[10px] text-muted shrink-0 flex items-center gap-1">
                                          <Clock size={10} />
                                          {format(new Date(task.due_date), 'h:mm a')}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* DESKTOP CALENDAR VIEW (md:block): Full 150px Grid */}
                    <div className="hidden md:block space-y-2.5">
                      {/* Weekday labels: 14px */}
                      <div className="grid grid-cols-7 gap-[10px] text-center text-[14px] font-medium text-secondary py-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                          <div key={dayName} className="truncate">
                            {dayName}
                          </div>
                        ))}
                      </div>

                      {/* Month Grid: 10px gaps, day cells min-height 150px (160px at 1440px+) */}
                      <div className="grid grid-cols-7 gap-[10px]">
                        {monthDays.map((day) => {
                          const dayKey = format(day, 'yyyy-MM-dd');
                          const dayTasks = tasksByDay.get(dayKey) || [];

                          return (
                            <MonthDayCell
                              key={dayKey}
                              day={day}
                              currentDate={currentDate}
                              dayTasks={dayTasks}
                              projectMap={projectMap}
                              departmentMap={departmentMap}
                              onOpenQuickAdd={handleOpenQuickAdd}
                              onOpenDaySheet={setSelectedDayForSheet}
                              onOpenDrawer={setSelectedTaskForDrawer}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* -----------------------------------------------------------------
                  WEEK VIEW (7 columns with hour axis, task cards positioned by time)
                 ----------------------------------------------------------------- */}
              {viewMode === 'week' && (
                <div className="pt-4 space-y-4">
                  {/* Top: All-Day Tasks Row */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3 pb-3 border-b border-black/[0.05]">
                    {weekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayTasks = tasksByDay.get(dayKey) || [];
                      const allDayTasks = dayTasks.filter((t) => !t.due_date || t.due_date.includes('T00:00:00'));

                      return (
                        <div key={`allday_${dayKey}`} className="space-y-1">
                          <div className="text-[11px] font-medium text-secondary uppercase tracking-wider">
                            {format(day, 'EEE d')}
                          </div>
                          {allDayTasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTaskForDrawer(t)}
                              className="h-[28px] rounded-full px-2.5 text-xs bg-white text-graphite border border-white/80 shadow-xs flex items-center gap-1.5 truncate cursor-pointer hover:bg-white/95"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: departmentMap.get(t.department_id)?.color || '#8DB3DE' }}
                              />
                              <span className="truncate">{t.title}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* 7 Columns with Hour Axis */}
                  <div className="flex gap-2">
                    {/* Hour Axis Column */}
                    <div className="w-12 shrink-0 flex flex-col justify-between py-2 text-[11px] text-secondary font-normal text-right pr-2">
                      {WEEK_HOURS.map((hr) => (
                        <div key={hr} className="h-16 flex items-start justify-end">
                          {hr % 12 === 0 ? 12 : hr % 12}
                          {hr >= 12 ? 'pm' : 'am'}
                        </div>
                      ))}
                    </div>

                    {/* 7 Day Columns — Swipable on mobile, 7-col grid on tablet/desktop */}
                    <div className="flex-1 flex sm:grid sm:grid-cols-7 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
                      {weekDays.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayTasks = tasksByDay.get(dayKey) || [];
                        const isDayToday = isToday(day);

                        return (
                          <div
                            key={dayKey}
                            className={`min-w-[240px] sm:min-w-0 flex-1 shrink-0 snap-start rounded-[24px] p-3 border flex flex-col justify-between min-h-[480px] relative transition-all ${
                              isDayToday
                                ? 'bg-charcoal text-white border-charcoal shadow-md'
                                : 'bg-inner-surface text-graphite border-white/60'
                            }`}
                          >
                            {/* Column Header */}
                            <div className="pb-2 mb-2 border-b border-black/[0.05] flex items-center justify-between">
                              <div>
                                <div className={`text-xs font-normal ${isDayToday ? 'text-white/75' : 'text-secondary'}`}>
                                  {format(day, 'EEE')}
                                </div>
                                <div className="text-xl font-light tracking-tight leading-none">
                                  {format(day, 'd')}
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-label={`Add task for ${dayKey}`}
                                onClick={() => handleOpenQuickAdd(dayKey)}
                                className="w-6 h-6 rounded-full bg-white/55 hover:bg-white/80 border border-white/60 flex items-center justify-center text-graphite shadow-xs"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Task Cards in this Column */}
                            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                              {dayTasks.length === 0 ? (
                                <div className="text-center py-12 text-xs opacity-50 italic">
                                  No tasks
                                </div>
                              ) : (
                                dayTasks.map((t) => {
                                  const dept = departmentMap.get(t.department_id);
                                  const isDone = Boolean(t.done_at);
                                  const timeLabel = t.due_date
                                    ? format(new Date(t.due_date), 'h:mm a')
                                    : 'All day';

                                  return (
                                    <div
                                      key={t.id}
                                      onClick={() => setSelectedTaskForDrawer(t)}
                                      className={`p-3 rounded-2xl text-xs border shadow-xs transition-all cursor-pointer hover:shadow-sm ${
                                        isDayToday
                                          ? 'bg-white/15 border-white/20 text-white'
                                          : 'bg-white text-graphite border-black/[0.05]'
                                      } ${isDone ? 'opacity-50 line-through' : ''}`}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-75">
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: dept?.color || '#8DB3DE' }}
                                        />
                                        <span>{dept?.name || 'Department'}</span>
                                        <span className="ml-auto">{timeLabel}</span>
                                      </div>
                                      <div className="font-normal text-[13px] leading-snug truncate">
                                        {t.title}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              TODAY PANEL (Right: 380px fixed width on desktop)
             --------------------------------------------------------------------- */}
          <div className="w-full lg:w-[380px] shrink-0 rounded-[32px] bg-panel backdrop-blur-[24px] border border-white/55 p-5 sm:p-6 shadow-glass space-y-6">
            {/* Today Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-light tracking-tight text-graphite">
                    Today
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/60 border border-white/70 text-secondary font-medium">
                    {todayCompletedCount}/{todayTasks.length} done
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5 font-normal">
                  {format(new Date(), 'EEEE, MMMM d')}
                </p>
              </div>

              <button
                type="button"
                aria-label="Add task for today"
                onClick={() => handleOpenQuickAdd(format(new Date(), 'yyyy-MM-dd'))}
                className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/90 border border-white/70 flex items-center justify-center text-graphite shadow-sm transition-all"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Today's Tasks List */}
            <div className="space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-secondary italic rounded-2xl bg-white/35 p-4 border border-white/50">
                  No deliverables scheduled for today.
                </div>
              ) : (
                <AnimatePresence>
                  {todayTasks.map((task) => {
                    const project = projectMap.get(task.project_id);
                    const dept = departmentMap.get(task.department_id);
                    const isCompleted = Boolean(task.done_at);
                    const timeLabel = task.due_date
                      ? format(new Date(task.due_date), 'h:mm a')
                      : 'All day';

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="group relative p-3 rounded-2xl bg-inner-surface border border-white/60 hover:bg-white/80 transition-all flex items-start gap-3 shadow-xs"
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          aria-label="Toggle complete"
                          onClick={() => handleToggleTask(task)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                            isCompleted
                              ? 'bg-lime border-lime text-graphite'
                              : 'border-black/25 bg-white/70 hover:border-black/50'
                          }`}
                        >
                          {isCompleted && <Check size={12} strokeWidth={3} />}
                        </button>

                        {/* Middle Info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedTaskForDrawer(task)}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] text-secondary mb-0.5">
                            <Clock size={11} className="opacity-75" />
                            <span>{timeLabel}</span>
                            <span>•</span>
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: dept?.color || '#8DB3DE' }}
                            />
                            <span className="truncate">{dept?.name || 'General'}</span>
                          </div>

                          <div
                            className={`text-xs sm:text-[13px] font-normal transition-all ${
                              isCompleted
                                ? 'line-through text-graphite/40'
                                : 'text-graphite'
                            }`}
                          >
                            {task.title}
                          </div>

                          {project && (
                            <div className="text-[11px] text-secondary mt-0.5 flex items-center gap-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
                                style={{ backgroundColor: project.color || '#CDD6A6' }}
                              >
                                {project.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate">{project.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Options button */}
                        <div className="relative">
                          <button
                            type="button"
                            aria-label="Task options"
                            onClick={() =>
                              setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)
                            }
                            className="w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center text-secondary transition-all"
                          >
                            <MoreVertical size={13} />
                          </button>

                          {activeMenuTaskId === task.id && (
                            <div className="absolute right-0 top-7 w-40 rounded-2xl bg-white/95 backdrop-blur-[24px] border border-white/80 shadow-[0_12px_36px_rgba(27,29,31,0.12)] p-2 z-30 space-y-1 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  updateTask.mutate({
                                    id: task.id,
                                    patch: { due_date: d.toISOString() },
                                  });
                                  setActiveMenuTaskId(null);
                                  showToast({ message: 'Rescheduled to tomorrow' });
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-black/5 flex items-center gap-2 text-graphite"
                              >
                                <ArrowRight size={12} />
                                <span>Postpone 1 day</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteTask.mutate(task.id);
                                  setActiveMenuTaskId(null);
                                  showToast({ message: 'Task deleted' });
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-coral/10 text-coral flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* -------------------------------------------------------------------
                OVERDUE SECTION
               ------------------------------------------------------------------- */}
            <div className="pt-3 border-t border-black/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-coral" />
                  <h4 className="text-sm font-medium text-graphite">Overdue</h4>
                </div>
                <span data-overdue-badge className="px-2.5 py-0.5 rounded-full bg-coral/15 text-coral text-xs font-semibold">
                  {overdueTasks.length}
                </span>
              </div>

              {overdueTasks.length === 0 ? (
                <p className="text-xs text-secondary italic py-2">
                  No overdue deliverables. All on schedule!
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {overdueTasks.map((ot) => {
                      const relativeDue = ot.due_date
                        ? formatDistanceToNow(new Date(ot.due_date), { addSuffix: true })
                        : 'Overdue';

                      return (
                        <motion.div
                          key={ot.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="p-3 rounded-2xl bg-coral/10 border border-coral/25 flex items-start justify-between gap-3 text-xs"
                        >
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setSelectedTaskForDrawer(ot)}
                          >
                            <div className="text-graphite font-medium text-[13px] truncate">
                              {ot.title}
                            </div>
                            <div className="text-[11px] text-coral mt-0.5">
                              {relativeDue}
                            </div>
                          </div>

                          {/* Done button moves to Done stage and animates out */}
                          <button
                            type="button"
                            onClick={() => handleToggleTask(ot)}
                            className="px-3 py-1 rounded-full bg-white hover:bg-lime hover:text-nearblack text-[11px] font-semibold text-graphite border border-white/80 shrink-0 shadow-xs transition-colors"
                          >
                            Done
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portal Drag Overlay to document.body (Zero backdrop-filter ancestors) */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay dropAnimation={null}>
              {activeDragTask ? (
                <DragOverlayChip
                  task={activeDragTask}
                  dept={departmentMap.get(activeDragTask.department_id)}
                />
              ) : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* =========================================================================
          DAY DETAILS MODAL / BOTTOM SHEET (Tapping a day or "+N more")
         ========================================================================= */}
      <Modal
        isOpen={selectedDayForSheet !== null}
        onClose={() => setSelectedDayForSheet(null)}
        title={selectedDayForSheet ? format(selectedDayForSheet, 'EEEE, MMMM d, yyyy') : 'Day Details'}
        description="Tasks and deliverable deadlines scheduled on this date."
        maxWidth="md"
      >
        {selectedDayForSheet && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">
                {(tasksByDay.get(format(selectedDayForSheet, 'yyyy-MM-dd')) || []).length} tasks scheduled
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  const key = format(selectedDayForSheet, 'yyyy-MM-dd');
                  setSelectedDayForSheet(null);
                  handleOpenQuickAdd(key);
                }}
              >
                Add for this day
              </Button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
              {(tasksByDay.get(format(selectedDayForSheet, 'yyyy-MM-dd')) || []).length === 0 ? (
                <div className="text-center py-8 text-xs text-secondary italic">
                  No deliverables scheduled for this day.
                </div>
              ) : (
                (tasksByDay.get(format(selectedDayForSheet, 'yyyy-MM-dd')) || []).map((task) => {
                  const isDone = Boolean(task.done_at);
                  const dept = departmentMap.get(task.department_id);
                  const proj = projectMap.get(task.project_id);

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:bg-white/80"
                      onClick={() => {
                        setSelectedDayForSheet(null);
                        setSelectedTaskForDrawer(task);
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTask(task);
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                          isDone
                            ? 'bg-lime border-lime text-graphite'
                            : 'border-black/25 bg-white'
                        }`}
                      >
                        {isDone && <Check size={12} strokeWidth={3} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs sm:text-sm font-normal text-graphite ${
                            isDone ? 'line-through text-graphite/40' : ''
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-secondary mt-0.5">
                          {task.due_date && (
                            <span>{format(new Date(task.due_date), 'h:mm a')}</span>
                          )}
                          <span>•</span>
                          <span>{dept?.name || 'Dept'}</span>
                          {proj && (
                            <>
                              <span>•</span>
                              <span>{proj.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask.mutate(task.id);
                          showToast({ message: 'Task deleted' });
                        }}
                        className="text-secondary hover:text-coral p-1.5 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          QUICK ADD MODAL (Title, Project, Department, Stage, Date, Time)
         ========================================================================= */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Schedule New Task"
        description="Add a task with deadline, project, and department assignment."
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Prepare marketing launch deck"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/70 border border-white/80 text-sm text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Project
              </label>
              <select
                value={newTaskProjectId || (projects[0]?.id || '')}
                onChange={(e) => {
                  const pId = e.target.value;
                  setNewTaskProjectId(pId);
                  const matchingDept = departments.find((d) => d.project_id === pId)?.id || departments[0]?.id || '';
                  setNewTaskDeptId(matchingDept);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Department
              </label>
              <select
                value={newTaskDeptId || (departments[0]?.id || '')}
                onChange={(e) => {
                  const dId = e.target.value;
                  setNewTaskDeptId(dId);
                  const firstStage = stages.find((s) => s.department_id === dId)?.id || '';
                  setNewTaskStageId(firstStage);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Pipeline Stage
              </label>
              <select
                value={newTaskStageId || (availableStages[0]?.id || '')}
                onChange={(e) => setNewTaskStageId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
              >
                {availableStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.kind})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                required
                value={prefilledDate}
                onChange={(e) => setPrefilledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Time
              </label>
              <input
                type="time"
                value={newTaskTime}
                onChange={(e) => setNewTaskTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewTaskModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTaskForDrawer}
        isOpen={Boolean(selectedTaskForDrawer)}
        onClose={() => setSelectedTaskForDrawer(null)}
        onUpdate={(patch) => {
          if (selectedTaskForDrawer) {
            updateTask.mutate({ id: selectedTaskForDrawer.id, patch });
            setSelectedTaskForDrawer((prev) => (prev ? { ...prev, ...patch } : null));
          }
        }}
        onDelete={(taskId) => {
          deleteTask.mutate(taskId);
          setSelectedTaskForDrawer(null);
        }}
      />
    </div>
  );
};

export default Calendar;
