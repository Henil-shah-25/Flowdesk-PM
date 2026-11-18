import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  closestCorners,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { TaskItem, Project, Department, Stage } from '../../types';
import { TaskCard } from './TaskCard';

export type TaskBoardColumnId = 'Started' | 'Middle' | 'Ended' | 'Blockade';

export interface TaskBoardViewProps {
  tasks: TaskItem[];
  projects: Project[];
  departments: Department[];
  stages: Stage[];
  onMoveTaskToColumn: (taskId: string, targetCol: TaskBoardColumnId, specificStageId?: string) => void;
  onOpenDrawer: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
}

const COLUMNS: Array<{
  id: TaskBoardColumnId;
  label: string;
  dotColor: string;
  bgGlow: string;
}> = [
  { id: 'Started', label: 'Started', dotColor: '#B7CFEA', bgGlow: 'rgba(183, 207, 234, 0.15)' },
  { id: 'Middle', label: 'Middle', dotColor: '#D2E38A', bgGlow: 'rgba(210, 227, 138, 0.15)' },
  { id: 'Ended', label: 'Ended', dotColor: '#2F3234', bgGlow: 'rgba(47, 50, 52, 0.15)' },
  { id: 'Blockade', label: 'Blockade', dotColor: '#F3A58F', bgGlow: 'rgba(243, 165, 143, 0.15)' },
];

export function resolveTaskColumn(
  task: TaskItem,
  stages: Stage[]
): TaskBoardColumnId {
  const deptStages = stages
    .filter((s) => s.department_id === task.department_id)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const currentStage = stages.find((s) => s.id === task.stage_id);
  if (!currentStage) {
    if (task.done_at) return 'Ended';
    return 'Started';
  }

  if (currentStage.kind === 'done' || Boolean(task.done_at)) {
    return 'Ended';
  }

  if (currentStage.kind === 'blocked') {
    return 'Blockade';
  }

  if (
    currentStage.name.toLowerCase() === 'started' ||
    (deptStages.length > 0 && deptStages[0].id === currentStage.id)
  ) {
    return 'Started';
  }

  return 'Middle';
}

interface DraggableTaskProps {
  task: TaskItem;
  project?: Project;
  department?: Department;
  onOpenDrawer: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
}

function DraggableTask({
  task,
  project,
  department,
  onOpenDrawer,
  onToggleComplete,
}: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        project={project}
        department={department}
        onOpenDrawer={onOpenDrawer}
        onToggleComplete={onToggleComplete}
      />
    </div>
  );
}

interface DroppableColumnProps {
  col: (typeof COLUMNS)[number];
  tasks: TaskItem[];
  projectMap: Map<string, Project>;
  departmentMap: Map<string, Department>;
  onOpenDrawer: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
}

function DroppableColumn({
  col,
  tasks,
  projectMap,
  departmentMap,
  onOpenDrawer,
  onToggleComplete,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: { columnId: col.id },
  });

  return (
    <div
      ref={setNodeRef}
      data-stage-column={col.id}
      data-droppable-id={col.id}
      className={`min-w-[310px] sm:min-w-[340px] md:min-w-[380px] w-full sm:w-[340px] md:w-[380px] rounded-[32px] bg-panel backdrop-blur-[24px] border p-5 flex flex-col shrink-0 transition-all duration-200 ${
        isOver
          ? 'ring-2 ring-lime border-lime bg-white/70 shadow-xl scale-[1.01]'
          : 'border-white/60 shadow-glass'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-black/[0.04]">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: col.dotColor }}
          />
          <h3 className="font-normal text-lg sm:text-xl text-graphite tracking-tight">
            {col.label}
          </h3>
        </div>

        <span className="text-xs font-medium text-secondary bg-white/70 px-2.5 py-0.5 rounded-full border border-white/80 shadow-xs">
          {tasks.length}
        </span>
      </div>

      {/* Task Cards Stack */}
      <div className="space-y-4 flex-1 min-h-[160px]">
        {tasks.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-black/[0.08] rounded-[24px] flex items-center justify-center text-xs text-secondary/60">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              project={projectMap.get(task.project_id)}
              department={departmentMap.get(task.department_id)}
              onOpenDrawer={onOpenDrawer}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  tasks,
  projects,
  departments,
  stages,
  onMoveTaskToColumn,
  onOpenDrawer,
  onToggleComplete,
}) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const departmentMap = React.useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  // Group tasks by their resolved column across all projects
  const tasksByColumn = React.useMemo(() => {
    const grouped: Record<TaskBoardColumnId, TaskItem[]> = {
      Started: [],
      Middle: [],
      Ended: [],
      Blockade: [],
    };

    tasks.forEach((task) => {
      const colId = resolveTaskColumn(task, stages);
      grouped[colId].push(task);
    });

    return grouped;
  }, [tasks, stages]);

  const activeTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    if (!over) return;

    let targetCol: TaskBoardColumnId | undefined;

    const overId = String(over.id);
    if (['Started', 'Middle', 'Ended', 'Blockade'].includes(overId)) {
      targetCol = overId as TaskBoardColumnId;
    } else {
      // Find the task that was hovered over
      const overTask =
        tasks.find((t) => t.id === overId) ||
        (over.data?.current?.task as TaskItem | undefined);
      if (overTask) {
        targetCol = resolveTaskColumn(overTask, stages);
      }
    }

    if (targetCol && ['Started', 'Middle', 'Ended', 'Blockade'].includes(targetCol)) {
      onMoveTaskToColumn(String(active.id), targetCol);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-8 pt-2 no-scrollbar items-start w-full">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
            tasks={tasksByColumn[col.id]}
            projectMap={projectMap}
            departmentMap={departmentMap}
            onOpenDrawer={onOpenDrawer}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[340px] md:w-[380px]">
              <TaskCard
                task={activeTask}
                project={projectMap.get(activeTask.project_id)}
                department={departmentMap.get(activeTask.department_id)}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};
