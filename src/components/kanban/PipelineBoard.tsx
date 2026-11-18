import React, { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, IconButton } from '../ui';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import type { TaskItem, Stage, StageKind, StageColor } from '../../types';
import {
  Plus,
  MoreVertical,
  Clock,
  ArrowLeft,
  ArrowRight,
  Trash2,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export interface PipelineBoardProps {
  projectId: string;
  projectName?: string;
  departmentId: string;
  department: { name: string; color?: string; enabled?: boolean | string | number };
  stages: Stage[];
  tasks: TaskItem[];
  isReadOnly?: boolean;
  viewMode?: 'board' | 'list';
  searchQuery?: string;
  onUpdateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  onBatchUpdateTasks?: (updates: Array<{ id: string } & Partial<TaskItem>>) => void;
  onCreateTask: (task: Partial<TaskItem>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateStage: (stage: Partial<Stage>) => void;
  onUpdateStage: (stageId: string, patch: Partial<Stage>) => void;
  onDeleteStage: (stageId: string, moveTasksToStageId?: string) => void;
  onReorderStages: (stages: Stage[]) => void;
  onTurnDepartmentOn?: () => void;
  onBrowseTemplates?: () => void;
}

// Stage Color Palette Constants - Medium Tones
export const STAGE_COLORS: Array<{ name: StageColor; hex: string; label: string }> = [
  { name: 'sky', hex: '#8DB3DE', label: 'Sky' },
  { name: 'lime', hex: '#BBD85A', label: 'Lime' },
  { name: 'coral', hex: '#EE8D72', label: 'Coral' },
  { name: 'sage', hex: '#A5B87E', label: 'Sage' },
  { name: 'peach', hex: '#E9B494', label: 'Peach' },
  { name: 'charcoal', hex: '#2B2E31', label: 'Charcoal' },
];

export const STAGE_COLOR_MAP: Record<
  StageColor,
  {
    hex: string;
    bg: string;
    text: string;
    subText: string;
    isDark: boolean;
    border: string;
    glow: string;
  }
> = {
  sky: {
    hex: '#8DB3DE',
    bg: '#8DB3DE',
    text: '#17191B',
    subText: 'rgba(23, 25, 27, 0.72)',
    isDark: false,
    border: '#729bc7',
    glow: 'rgba(141, 179, 222, 0.45)',
  },
  lime: {
    hex: '#BBD85A',
    bg: '#BBD85A',
    text: '#17191B',
    subText: 'rgba(23, 25, 27, 0.72)',
    isDark: false,
    border: '#a4c243',
    glow: 'rgba(187, 216, 90, 0.45)',
  },
  coral: {
    hex: '#EE8D72',
    bg: '#EE8D72',
    text: '#17191B',
    subText: 'rgba(23, 25, 27, 0.72)',
    isDark: false,
    border: '#d9785d',
    glow: 'rgba(238, 141, 114, 0.45)',
  },
  sage: {
    hex: '#A5B87E',
    bg: '#A5B87E',
    text: '#17191B',
    subText: 'rgba(23, 25, 27, 0.72)',
    isDark: false,
    border: '#8ea167',
    glow: 'rgba(165, 184, 126, 0.45)',
  },
  peach: {
    hex: '#E9B494',
    bg: '#E9B494',
    text: '#17191B',
    subText: 'rgba(23, 25, 27, 0.72)',
    isDark: false,
    border: '#d49f7e',
    glow: 'rgba(233, 180, 148, 0.45)',
  },
  charcoal: {
    hex: '#2B2E31',
    bg: '#2B2E31',
    text: '#FFFFFF',
    subText: 'rgba(255, 255, 255, 0.75)',
    isDark: true,
    border: '#4A5159',
    glow: 'rgba(43, 46, 49, 0.45)',
  },
};

export function getStageColorConfig(color?: StageColor, kind?: StageKind) {
  if (color && STAGE_COLOR_MAP[color]) {
    return STAGE_COLOR_MAP[color];
  }
  if (kind === 'done') return STAGE_COLOR_MAP.charcoal;
  if (kind === 'blocked') return STAGE_COLOR_MAP.coral;
  return STAGE_COLOR_MAP.sky;
}

function formatTotalMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}

// -----------------------------------------------------------------------------
// Sortable Task Card (Separated Outer Drag Node vs Inner Visual Node)
// -----------------------------------------------------------------------------
interface TaskCardProps {
  task: TaskItem;
  stage: Stage;
  projectName?: string;
  onClick: () => void;
  onOpenDrawer: (e: React.MouseEvent) => void;
}

const SortableTaskCard = React.memo(function SortableTaskCard({
  task,
  stage,
  projectName,
  onClick,
  onOpenDrawer,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
      stageId: stage.id,
    },
  });

  const pointerDownPos = useRef({ x: 0, y: 0 });
  const colorDef = getStageColorConfig(stage.color, stage.kind);
  const isDone = stage.kind === 'done' || Boolean(task.done_at);

  const formattedDueDate = task.due_date
    ? format(new Date(task.due_date), "'Due' MMM d")
    : 'No due date';

  // Outer element handles dnd-kit transform & listeners only
  const outerStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    touchAction: 'none',
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    console.log('POINTER DOWN at:', e.clientX, e.clientY);
    listeners?.onPointerDown?.(e);
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log('CLICK at:', e.clientX, e.clientY, 'pointerDownPos:', pointerDownPos.current);
    const dist = Math.hypot(
      e.clientX - pointerDownPos.current.x,
      e.clientY - pointerDownPos.current.y
    );
    if (dist > 8) return;
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={outerStyle}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      data-task-id={task.id}
      className="cursor-grab active:cursor-grabbing select-none"
    >
      {/* Inner visual node */}
      <div
        style={{
          backgroundColor: colorDef.bg,
          color: colorDef.text,
          transition: 'background-color 250ms ease, box-shadow 200ms ease, transform 200ms ease',
        }}
        className={`group relative rounded-[24px] p-4 sm:p-5 border border-white/60 shadow-sm hover:shadow-[0_12px_32px_rgba(20,25,30,0.14)] hover:-translate-y-0.5 ${
          colorDef.isDark ? 'text-white' : 'text-graphite'
        }`}
      >
        {/* Top row: Due Date + circular options button */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className={`text-[12px] font-normal tracking-tight flex items-center gap-1.5 ${
              colorDef.isDark ? 'text-white/75' : 'text-secondary'
            }`}
          >
            <Clock size={12} className="opacity-75" />
            <span>{formattedDueDate}</span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDrawer(e);
            }}
            aria-label="Task options"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              colorDef.isDark
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/60 hover:bg-white/90 text-graphite border border-white/70 shadow-xs'
            }`}
          >
            <MoreVertical size={13} />
          </button>
        </div>

        {/* Middle: Title & Project Name (20px on desktop) */}
        <div className="mb-4">
          <h4
            className={`text-[16px] md:text-[20px] font-medium leading-snug tracking-tight ${
              colorDef.isDark ? 'text-white' : 'text-graphite'
            } ${isDone ? 'line-through opacity-70' : ''}`}
          >
            {task.title}
          </h4>
          {projectName && (
            <p
              className={`text-[13px] mt-0.5 font-normal truncate ${
                colorDef.isDark ? 'text-white/70' : 'text-secondary'
              }`}
            >
              {projectName}
            </p>
          )}
        </div>

        {/* Bottom row: Large light estimate + priority / done chip */}
        <div className="flex items-end justify-between gap-2 pt-2 border-t border-black/[0.05]">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-light tracking-tight leading-none ${
                colorDef.isDark ? 'text-white' : 'text-graphite'
              }`}
            >
              {task.estimate_min || 0}
            </span>
            <span
              className={`text-[13px] font-normal ${
                colorDef.isDark ? 'text-white/70' : 'text-secondary'
              }`}
            >
              min
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isDone ? (
              <span className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-full bg-lime text-nearblack font-semibold shadow-xs">
                <Check size={12} strokeWidth={2.5} />
                <span>Done</span>
              </span>
            ) : (
              <span
                className={`text-[12px] px-2.5 py-0.5 rounded-full capitalize font-normal border ${
                  colorDef.isDark
                    ? 'bg-white/15 text-white border-white/25'
                    : 'bg-white/70 text-graphite border-white/90 shadow-xs'
                }`}
              >
                {task.priority || 'medium'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Floating Drag Overlay Card (No backdrop-filter on card to avoid portal glitch)
// -----------------------------------------------------------------------------
function DragOverlayCard({
  task,
  stage,
  projectName,
}: {
  task: TaskItem;
  stage?: Stage;
  projectName?: string;
}) {
  const colorDef = getStageColorConfig(stage?.color, stage?.kind);
  const isDone = stage?.kind === 'done' || Boolean(task.done_at);
  const formattedDueDate = task.due_date
    ? format(new Date(task.due_date), "'Due' MMM d")
    : 'No due date';

  return (
    <div
      style={{
        backgroundColor: colorDef.bg,
        color: colorDef.text,
        width: 320,
        boxShadow: '0 20px 48px rgba(20, 25, 30, 0.28)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        cursor: 'grabbing',
      }}
      className={`rounded-[24px] p-4 sm:p-5 border-2 border-white ring-2 ring-lime/50 select-none ${
        colorDef.isDark ? 'text-white' : 'text-graphite'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`text-[12px] font-normal flex items-center gap-1.5 ${
            colorDef.isDark ? 'text-white/75' : 'text-secondary'
          }`}
        >
          <Clock size={12} className="opacity-75" />
          <span>{formattedDueDate}</span>
        </span>
      </div>

      <div className="mb-4">
        <h4 className="text-[16px] md:text-[20px] font-medium leading-snug tracking-tight">
          {task.title}
        </h4>
        {projectName && (
          <p
            className={`text-[13px] mt-0.5 font-normal truncate ${
              colorDef.isDark ? 'text-white/70' : 'text-secondary'
            }`}
          >
            {projectName}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between gap-2 pt-2 border-t border-black/[0.05]">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-light tracking-tight leading-none">
            {task.estimate_min || 0}
          </span>
          <span className="text-[13px] font-normal opacity-75">min</span>
        </div>

        <div>
          {isDone ? (
            <span className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-full bg-lime text-nearblack font-semibold shadow-xs">
              <Check size={12} strokeWidth={2.5} />
              <span>Done</span>
            </span>
          ) : (
            <span className="text-[12px] px-2.5 py-0.5 rounded-full capitalize font-normal bg-white/70 text-graphite border border-white/90">
              {task.priority || 'medium'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Droppable Stage Column Component
// -----------------------------------------------------------------------------
interface ColumnDroppableProps {
  stage: Stage;
  tasks: TaskItem[];
  projectName?: string;
  isReadOnly?: boolean;
  isHovered: boolean;
  onTaskClick: (task: TaskItem) => void;
  onOpenDrawer: (task: TaskItem) => void;
  children?: React.ReactNode;
}

function ColumnDroppable({
  stage,
  tasks,
  projectName,
  onTaskClick,
  onOpenDrawer,
}: ColumnDroppableProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      type: 'Stage',
      stage,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-stage-column={stage.name}
      className="flex-1 space-y-3 min-h-[160px] max-h-[calc(100vh-320px)] overflow-y-auto pr-1 no-scrollbar"
    >
      {tasks.length === 0 ? (
        <div className="h-32 rounded-[24px] border-2 border-dashed border-black/15 bg-black/[0.03] flex items-center justify-center text-[13px] text-secondary/70 font-normal select-none">
          Drop tasks here
        </div>
      ) : (
        tasks.map((task) => (
          <SortableTaskCard
            key={task.id}
            task={task}
            stage={stage}
            projectName={projectName}
            onClick={() => onTaskClick(task)}
            onOpenDrawer={() => onOpenDrawer(task)}
          />
        ))
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN PIPELINE BOARD COMPONENT
// -----------------------------------------------------------------------------
export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  projectName,
  stages,
  tasks,
  isReadOnly = false,
  viewMode = 'board',
  searchQuery = '',
  onUpdateTask,
  onBatchUpdateTasks,
  onCreateTask,
  onDeleteTask,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
  onTurnDepartmentOn,
  onBrowseTemplates,
}) => {
  // Mobile active stage for 390px viewports
  const [mobileActiveStageId, setMobileActiveStageId] = useState<string | null>(null);

  // Selected task for task detail drawer
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Quick add per stage
  const [quickAddTexts, setQuickAddTexts] = useState<Record<string, string>>({});

  // Stage rename state
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');

  // Add stage inline state
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageKind, setNewStageKind] = useState<StageKind>('normal');
  const [newStageColor, setNewStageColor] = useState<StageColor>('sky');

  // Stage Menu & Delete Dialog State
  const [activeMenuStageId, setActiveMenuStageId] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [targetMoveStageId, setTargetMoveStageId] = useState<string>('');

  // Active dragging item & over stage for highlighting
  const [activeDragTask, setActiveDragTask] = useState<TaskItem | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  // Sensors: PointerSensor distance: 6, TouchSensor delay: 200, tolerance: 8, KeyboardSensor
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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks by search query if any
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [stages]);

  // Stage calculations
  const stageStats = useMemo(() => {
    const stats: Record<string, { count: number; totalMinutes: number }> = {};
    sortedStages.forEach((stage) => {
      const stageTasks = filteredTasks.filter((t) => t.stage_id === stage.id);
      const totalMinutes = stageTasks.reduce((acc, t) => acc + (t.estimate_min || 0), 0);
      stats[stage.id] = {
        count: stageTasks.length,
        totalMinutes,
      };
    });
    return stats;
  }, [sortedStages, filteredTasks]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      console.log('DRAG START:', event.active.id);
      if (isReadOnly) return;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) {
        setActiveDragTask(task);
        setOverStageId(task.stage_id);
      }
    },
    [isReadOnly, tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      console.log('DRAG OVER: active=', active?.id, 'over=', over?.id);
      if (!over) {
        setOverStageId(null);
        return;
      }
      const overId = String(over.id);
      const stageMatch = sortedStages.find((s) => s.id === overId);
      if (stageMatch) {
        setOverStageId(stageMatch.id);
        return;
      }
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        setOverStageId(overTask.stage_id);
      }
    },
    [sortedStages, tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log('DRAG END: active=', event.active?.id, 'over=', event.over?.id);
      setActiveDragTask(null);
      setOverStageId(null);
      if (isReadOnly) return;

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }

      const { active, over } = event;
      if (!over) return;

      const activeTaskId = String(active.id);
      const overId = String(over.id);

      const activeTask = tasks.find((t) => t.id === activeTaskId);
      if (!activeTask) return;

      // Identify destination stage
      let destinationStageId: string | undefined;
      let overTask: TaskItem | undefined;

      // 1. Is overId directly a stage?
      const directStage = sortedStages.find((s) => s.id === overId);
      if (directStage) {
        destinationStageId = directStage.id;
      } else {
        // 2. Is overId a task?
        overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          destinationStageId = overTask.stage_id;
        }
      }

      if (!destinationStageId) return;

      const sourceStageId = activeTask.stage_id;
      const targetStage = sortedStages.find((s) => s.id === destinationStageId);
      const isDestinationDone = targetStage?.kind === 'done';

      const updates: Array<{ id: string } & Partial<TaskItem>> = [];

      // Case A: Reorder inside the same column
      if (sourceStageId === destinationStageId) {
        const columnTasks = tasks
          .filter((t) => t.stage_id === sourceStageId)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

        const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId);
        const newIndex = overTask
          ? columnTasks.findIndex((t) => t.id === overTask.id)
          : columnTasks.length - 1;

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          reordered.forEach((t, idx) => {
            const nextOrder = idx + 1;
            if (t.order !== nextOrder) {
              updates.push({ id: t.id, order: nextOrder });
            }
          });
        }
      } else {
        // Case B: Move across columns
        const targetStageTasks = tasks
          .filter((t) => t.stage_id === destinationStageId)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

        let insertIndex = targetStageTasks.length;
        if (overTask) {
          const idx = targetStageTasks.findIndex((t) => t.id === overTask.id);
          if (idx !== -1) insertIndex = idx;
        }

        const newTargetList = [...targetStageTasks];
        newTargetList.splice(insertIndex, 0, activeTask);

        // Optimistically update active task with new stage, order, and done_at
        updates.push({
          id: activeTaskId,
          stage_id: destinationStageId,
          order: insertIndex + 1,
          done_at: isDestinationDone ? new Date().toISOString() : '',
        });

        // Re-index target stage tasks
        newTargetList.forEach((t, idx) => {
          const nextOrder = idx + 1;
          if (t.id !== activeTaskId && t.order !== nextOrder) {
            updates.push({ id: t.id, order: nextOrder });
          }
        });

        // Re-index source stage tasks
        const sourceStageTasks = tasks
          .filter((t) => t.stage_id === sourceStageId && t.id !== activeTaskId)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

        sourceStageTasks.forEach((t, idx) => {
          const nextOrder = idx + 1;
          if (t.order !== nextOrder) {
            updates.push({ id: t.id, order: nextOrder });
          }
        });
      }

      if (updates.length > 0) {
        if (onBatchUpdateTasks) {
          onBatchUpdateTasks(updates);
        } else {
          updates.forEach((u) => {
            const { id, ...patch } = u;
            onUpdateTask(id, patch);
          });
        }
      }
    },
    [isReadOnly, onBatchUpdateTasks, onUpdateTask, sortedStages, tasks]
  );

  // Quick Add task handler
  const handleQuickAdd = (stageId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const text = quickAddTexts[stageId]?.trim();
    if (!text) return;

    const stageObj = sortedStages.find((s) => s.id === stageId);
    const isDone = stageObj?.kind === 'done';

    onCreateTask({
      stage_id: stageId,
      title: text,
      priority: 'medium',
      estimate_min: 60,
      actual_min: 0,
      order: 99,
      done_at: isDone ? new Date().toISOString() : undefined,
    });

    setQuickAddTexts((prev) => ({ ...prev, [stageId]: '' }));
  };

  // Stage rename handlers
  const handleStartRename = (stage: Stage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };

  const handleSaveRename = (stageId: string) => {
    if (editingStageName.trim()) {
      onUpdateStage(stageId, { name: editingStageName.trim() });
    }
    setEditingStageId(null);
  };

  // Add new stage submit handler
  const handleAddStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const nextOrder = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1].order + 1 : 1;

    onCreateStage({
      name: newStageName.trim(),
      kind: newStageKind,
      color: newStageColor,
      order: nextOrder,
    });

    setNewStageName('');
    setNewStageKind('normal');
    setNewStageColor('sky');
    setIsAddingStage(false);
  };

  // Stage color change
  const handleChangeStageColor = (stage: Stage, colorName: StageColor) => {
    onUpdateStage(stage.id, { color: colorName });
    setActiveMenuStageId(null);
  };

  // Stage type change
  const handleChangeStageType = (stage: Stage, newKind: StageKind) => {
    onUpdateStage(stage.id, { kind: newKind });
    setActiveMenuStageId(null);
  };

  // Stage move left / right
  const handleMoveStage = (stageId: string, direction: 'left' | 'right') => {
    const currentIndex = sortedStages.findIndex((s) => s.id === stageId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return;

    const newStages = [...sortedStages];
    const [moved] = newStages.splice(currentIndex, 1);
    newStages.splice(targetIndex, 0, moved);

    const reordered = newStages.map((s, idx) => ({ ...s, order: idx + 1 }));
    onReorderStages(reordered);
    setActiveMenuStageId(null);
  };

  // Stage deletion initiation
  const handleInitiateDeleteStage = (stage: Stage) => {
    setActiveMenuStageId(null);

    if (sortedStages.length <= 1) {
      alert('Cannot delete the last remaining stage.');
      return;
    }

    const doneStages = sortedStages.filter((s) => s.kind === 'done');
    if (stage.kind === 'done' && doneStages.length <= 1) {
      alert('A department must have at least one stage of type Done.');
      return;
    }

    const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
    if (stageTasks.length > 0) {
      const otherStages = sortedStages.filter((s) => s.id !== stage.id);
      setTargetMoveStageId(otherStages[0]?.id || '');
      setStageToDelete(stage);
    } else {
      onDeleteStage(stage.id);
    }
  };

  const handleConfirmDeleteStage = () => {
    if (!stageToDelete) return;
    onDeleteStage(stageToDelete.id, targetMoveStageId);
    setStageToDelete(null);
  };

  // ---------------------------------------------------------------------------
  // LIST VIEW RENDERING
  // ---------------------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {sortedStages.map((stage) => {
          const stageTasks = filteredTasks.filter((t) => t.stage_id === stage.id);
          const colorDef = getStageColorConfig(stage.color, stage.kind);
          const totalMinutes = stageStats[stage.id]?.totalMinutes || 0;

          return (
            <div
              key={stage.id}
              className="rounded-[28px] bg-panel backdrop-blur-[24px] border border-white/60 p-6 shadow-glass space-y-3"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorDef.hex }}
                  />
                  <h3 className="text-lg font-medium text-graphite tracking-tight">
                    {stage.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/65 text-xs text-secondary font-medium">
                    {stageTasks.length}
                  </span>
                </div>
                <span className="text-xs text-secondary font-normal">
                  {formatTotalMinutes(totalMinutes)} total
                </span>
              </div>

              {/* Task Rows */}
              {stageTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-secondary italic">
                  No tasks in this stage.
                </div>
              ) : (
                <div className="space-y-2">
                  {stageTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3.5 rounded-2xl bg-inner-surface hover:bg-white/80 border border-white/70 flex items-center justify-between gap-4 cursor-pointer transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colorDef.hex }}
                        />
                        <div className="truncate">
                          <div className="text-[15px] font-normal text-graphite truncate">
                            {task.title}
                          </div>
                          {projectName && (
                            <div className="text-[12px] text-secondary truncate">
                              {projectName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs text-secondary">
                        {task.due_date && (
                          <span>{format(new Date(task.due_date), 'MMM d')}</span>
                        )}
                        <span className="font-medium text-graphite">
                          {task.estimate_min || 0}m
                        </span>
                        <span className="px-2 py-0.5 rounded-full capitalize bg-white/70 text-graphite border border-white/90">
                          {task.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <TaskDetailDrawer
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onUpdate={(patch) => {
            if (selectedTask) {
              onUpdateTask(selectedTask.id, patch);
              setSelectedTask((prev) => (prev ? { ...prev, ...patch } : null));
            }
          }}
          onDelete={(taskId) => {
            onDeleteTask(taskId);
            setSelectedTask(null);
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // KANBAN BOARD RENDERING
  // ---------------------------------------------------------------------------
  const activeDragStage = sortedStages.find((s) => s.id === activeDragTask?.stage_id);

  return (
    <div className="space-y-6 max-w-full">
      {/* Read-Only Banner if Department is OFF */}
      {isReadOnly && (
        <div className="px-5 py-3 rounded-2xl bg-amber/15 border border-amber/30 backdrop-blur-md flex items-center justify-between text-xs sm:text-sm text-graphite shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber shrink-0" />
            <span>This department is currently OFF (read-only mode).</span>
          </div>
          {onTurnDepartmentOn && (
            <Button variant="primary" size="sm" onClick={onTurnDepartmentOn}>
              Turn Department ON
            </Button>
          )}
        </div>
      )}

      {/* Empty Board State: Browse Templates */}
      {tasks.length === 0 && onBrowseTemplates && (
        <div className="px-5 py-4 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-lime" />
            <span className="text-xs sm:text-sm font-normal text-graphite">
              No tasks yet. Browse templates to jumpstart this department.
            </span>
          </div>
          <button
            type="button"
            onClick={onBrowseTemplates}
            className="px-4 py-2 rounded-full bg-lime text-nearblack text-xs font-medium hover:bg-[var(--accent-lime-hover)] transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Browse templates</span>
          </button>
        </div>
      )}

      {/* Mobile Stage Selector Tab Strip (390px Viewports) */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {sortedStages.map((stage) => {
          const isActive = (mobileActiveStageId || sortedStages[0]?.id) === stage.id;
          const count = stageStats[stage.id]?.count || 0;
          const colorDef = getStageColorConfig(stage.color, stage.kind);

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setMobileActiveStageId(stage.id)}
              className={`px-4 py-2 rounded-full text-xs font-normal whitespace-nowrap transition-all border flex items-center gap-2 ${
                isActive
                  ? 'bg-charcoal text-white border-charcoal shadow-sm'
                  : 'bg-white/60 text-secondary border-white/70 hover:bg-white/80'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colorDef.hex }}
              />
              <span>{stage.name}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-graphite'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* DndContext Wrapping Columns: autoScroll enabled */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        autoScroll={{ threshold: { x: 0.1, y: 0.1 }, acceleration: 10 }}
      >
        <div className="flex gap-5 overflow-x-auto pb-6 no-scrollbar items-start w-full pr-16">
          {sortedStages.map((stage) => {
            const isMobileHidden =
              (mobileActiveStageId || sortedStages[0]?.id) !== stage.id;
            const columnTasks = filteredTasks.filter((t) => t.stage_id === stage.id);
            const colorDef = getStageColorConfig(stage.color, stage.kind);
            const stats = stageStats[stage.id] || { count: 0, totalMinutes: 0 };
            const isHoveredColumn = overStageId === stage.id && Boolean(activeDragTask);

            return (
              <div
                key={stage.id}
                style={{
                  boxShadow: isHoveredColumn
                    ? `0 0 32px ${colorDef.glow}`
                    : '0 14px 44px rgba(20, 25, 30, 0.16)',
                  borderColor: isHoveredColumn ? colorDef.border : 'rgba(255, 255, 255, 0.65)',
                }}
                className={`min-w-[310px] sm:min-w-[340px] md:min-w-[380px] w-full sm:w-[340px] md:w-[380px] rounded-[28px] bg-panel backdrop-blur-[24px] border p-5 flex flex-col shrink-0 transition-all duration-200 ${
                  isMobileHidden ? 'hidden md:flex' : 'flex'
                } ${isHoveredColumn ? 'ring-2 ring-white/70' : ''}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 mb-3.5 relative">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    {/* Stage color dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colorDef.hex }}
                      title={`Color: ${stage.color || 'default'}`}
                    />

                    {editingStageId === stage.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingStageName}
                        onChange={(e) => setEditingStageName(e.target.value)}
                        onBlur={() => handleSaveRename(stage.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(stage.id);
                          if (e.key === 'Escape') setEditingStageId(null);
                        }}
                        className="w-full text-sm px-2 py-0.5 rounded-lg bg-white border border-white/90 text-graphite focus:outline-none"
                      />
                    ) : (
                      <span
                        data-testid="stage-title"
                        data-stage-name={stage.name}
                        onClick={() => !isReadOnly && handleStartRename(stage)}
                        className="font-normal text-sm sm:text-base text-graphite tracking-tight truncate cursor-pointer hover:underline"
                        title="Click to rename"
                      >
                        {stage.name}
                      </span>
                    )}

                    <span className="w-5 h-5 rounded-full bg-white/65 border border-white/80 text-[11px] text-secondary font-medium flex items-center justify-center shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Right Header items: Total Time & Quick Add + Options Menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[12px] text-secondary font-normal pr-1">
                      {formatTotalMinutes(stats.totalMinutes)}
                    </span>

                    {/* Circular "+" quick-add button */}
                    {!isReadOnly && (
                      <button
                        type="button"
                        aria-label="Add task to column"
                        onClick={() => {
                          const inputEl = document.getElementById(`quick-add-${stage.id}`);
                          inputEl?.focus();
                        }}
                        className="w-7 h-7 rounded-full bg-white/60 hover:bg-white/90 border border-white/70 flex items-center justify-center text-graphite shadow-xs transition-all"
                      >
                        <Plus size={13} />
                      </button>
                    )}

                    {/* Stage "..." Action Menu */}
                    {!isReadOnly && (
                      <div className="relative">
                        <IconButton
                          icon={<MoreVertical size={14} />}
                          aria-label="Stage options"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveMenuStageId(
                              activeMenuStageId === stage.id ? null : stage.id
                            )
                          }
                        />

                        {/* Dropdown Popover */}
                        {activeMenuStageId === stage.id && (
                          <div className="absolute right-0 top-8 w-54 rounded-2xl bg-white/95 backdrop-blur-[24px] border border-white/80 shadow-[0_14px_40px_rgba(20,25,30,0.18)] p-3 z-30 space-y-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                handleStartRename(stage);
                                setActiveMenuStageId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-black/5 font-medium text-graphite"
                            >
                              Rename Stage
                            </button>

                            {/* 6-Swatch Color Picker */}
                            <div className="pt-1 border-t border-black/[0.04]">
                              <div className="text-[11px] text-secondary mb-1.5 px-1 font-medium">
                                Stage Color:
                              </div>
                              <div className="flex items-center justify-between px-1">
                                {STAGE_COLORS.map((c) => {
                                  const isSelected = (stage.color || 'sky') === c.name;
                                  return (
                                    <button
                                      key={c.name}
                                      type="button"
                                      title={c.label}
                                      onClick={() => handleChangeStageColor(stage, c.name)}
                                      style={{ backgroundColor: c.hex }}
                                      className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${
                                        isSelected
                                          ? 'ring-2 ring-nearblack ring-offset-1 border-transparent'
                                          : 'border-black/10 hover:scale-110'
                                      }`}
                                    >
                                      {isSelected && <Check size={10} className="text-graphite stroke-[3]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Stage Type Toggle */}
                            <div className="pt-1 border-t border-black/[0.04] space-y-1">
                              <div className="text-[11px] text-secondary px-1 font-medium">
                                Stage Type:
                              </div>
                              {(['normal', 'done', 'blocked'] as const).map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => handleChangeStageType(stage, k)}
                                  className={`w-full px-2.5 py-1 rounded-xl text-left capitalize flex items-center justify-between ${
                                    stage.kind === k
                                      ? 'bg-black/5 font-semibold text-graphite'
                                      : 'hover:bg-black/5 text-secondary'
                                  }`}
                                >
                                  <span>{k}</span>
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      k === 'done'
                                        ? 'bg-lime'
                                        : k === 'blocked'
                                        ? 'bg-coral'
                                        : 'bg-black/30'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>

                            {/* Reorder Buttons */}
                            <div className="pt-1 border-t border-black/[0.04] flex items-center justify-between px-1">
                              <button
                                type="button"
                                onClick={() => handleMoveStage(stage.id, 'left')}
                                className="p-1 rounded-lg hover:bg-black/5 text-secondary hover:text-graphite"
                                title="Move stage left"
                              >
                                <ArrowLeft size={13} />
                              </button>
                              <span className="text-[11px] text-secondary">Reorder</span>
                              <button
                                type="button"
                                onClick={() => handleMoveStage(stage.id, 'right')}
                                className="p-1 rounded-lg hover:bg-black/5 text-secondary hover:text-graphite"
                                title="Move stage right"
                              >
                                <ArrowRight size={13} />
                              </button>
                            </div>

                            {/* Delete Stage */}
                            <div className="pt-1 border-t border-black/[0.04]">
                              <button
                                type="button"
                                onClick={() => handleInitiateDeleteStage(stage)}
                                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-coral/10 text-left flex items-center gap-2 text-coral font-medium"
                              >
                                <Trash2 size={12} />
                                <span>Delete Stage</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sortable Tasks List with Droppable Stage Container */}
                <SortableContext
                  id={stage.id}
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ColumnDroppable
                    stage={stage}
                    tasks={columnTasks}
                    projectName={projectName}
                    isHovered={isHoveredColumn}
                    onTaskClick={(task) => setSelectedTask(task)}
                    onOpenDrawer={(task) => setSelectedTask(task)}
                  />
                </SortableContext>

                {/* Quick Add Task Input at bottom */}
                {!isReadOnly && (
                  <form
                    onSubmit={(e) => handleQuickAdd(stage.id, e)}
                    className="mt-3 pt-3 border-t border-black/[0.05]"
                  >
                    <input
                      id={`quick-add-${stage.id}`}
                      type="text"
                      placeholder="+ Add task (Enter)"
                      value={quickAddTexts[stage.id] || ''}
                      onChange={(e) =>
                        setQuickAddTexts((prev) => ({
                          ...prev,
                          [stage.id]: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-xs rounded-full bg-inner-surface hover:bg-white/80 focus:bg-white border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 transition-all shadow-xs"
                    />
                  </form>
                )}
              </div>
            );
          })}

          {/* Add Stage Column (Rightmost) */}
          {!isReadOnly && sortedStages.length < 8 && (
            <div className="w-72 rounded-[28px] bg-panel/75 backdrop-blur-[24px] border border-dashed border-black/[0.15] p-5 flex flex-col justify-start shrink-0">
              {isAddingStage ? (
                <form onSubmit={handleAddStageSubmit} className="space-y-3">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Stage name (e.g. Review)..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/80 border border-white/90 text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                  />

                  {/* Stage Color Swatches */}
                  <div>
                    <label className="block text-[11px] text-secondary mb-1">Color</label>
                    <div className="flex items-center gap-1.5 justify-between">
                      {STAGE_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setNewStageColor(c.name)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-5 h-5 rounded-full border ${
                            newStageColor === c.name
                              ? 'ring-2 ring-nearblack ring-offset-1 border-transparent'
                              : 'border-black/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-secondary mb-1">Stage Type</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['normal', 'done', 'blocked'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setNewStageKind(k)}
                          className={`py-1 text-[11px] rounded-lg capitalize border ${
                            newStageKind === k
                              ? 'bg-nearblack text-white border-nearblack font-medium'
                              : 'bg-white/50 text-secondary border-white/70'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Button type="submit" variant="primary" size="sm" className="flex-1">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingStage(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingStage(true)}
                  className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-2 text-secondary hover:text-graphite transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white/60 border border-white/70 flex items-center justify-center shadow-xs">
                    <Plus size={18} />
                  </div>
                  <span className="text-[13px] font-normal">+ Add stage</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* DragOverlay portal into document.body to prevent backdrop-filter position:fixed breakage */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay
              dropAnimation={{
                duration: 220,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeDragTask ? (
                <div style={{ transform: 'scale(1.03) rotate(2deg)', transformOrigin: 'center' }}>
                  <DragOverlayCard
                    task={activeDragTask}
                    stage={activeDragStage}
                    projectName={projectName}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdate={(patch) => {
          if (selectedTask) {
            onUpdateTask(selectedTask.id, patch);
            setSelectedTask((prev) => (prev ? { ...prev, ...patch } : null));
          }
        }}
        onDelete={(taskId) => {
          onDeleteTask(taskId);
          setSelectedTask(null);
        }}
      />

      {/* Stage Deletion Confirmation Modal */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-medium text-graphite">Delete Stage</h4>
            <p className="text-xs text-secondary leading-relaxed">
              This stage has tasks. Choose a destination stage to reassign them:
            </p>
            <select
              value={targetMoveStageId}
              onChange={(e) => setTargetMoveStageId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/5 border border-black/10 text-xs text-graphite"
            >
              {sortedStages
                .filter((s) => s.id !== stageToDelete.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStageToDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDeleteStage}>
                Move & Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
