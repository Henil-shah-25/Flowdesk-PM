import React, { useState } from 'react';
import type { TaskItem, Project, Department } from '../../types';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Clock, Flag, Check, ListChecks } from 'lucide-react';

export interface TaskCardProps {
  task: TaskItem;
  project?: Project;
  department?: Department;
  onOpenDrawer?: (task: TaskItem) => void;
  onToggleComplete?: (task: TaskItem) => void;
  isOverlay?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  department,
  onOpenDrawer,
  onToggleComplete,
  isOverlay = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDone = Boolean(task.done_at);

  // Priority color config
  const priorityConfig = {
    urgent: { label: 'Urgent', color: '#F25F5C', bg: 'rgba(242, 95, 92, 0.15)' },
    high: { label: 'High', color: '#F5A524', bg: 'rgba(245, 165, 36, 0.15)' },
    medium: { label: 'Medium', color: '#3BA7F5', bg: 'rgba(59, 167, 245, 0.15)' },
    low: { label: 'Low', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' },
  }[task.priority || 'medium'];

  // Due date calculation
  let dueDateLabel = '';
  let isOverdue = false;
  if (task.due_date) {
    try {
      const d = new Date(task.due_date);
      const today = startOfDay(new Date());
      if (isToday(d)) {
        dueDateLabel = 'Today';
      } else {
        dueDateLabel = format(d, 'MMM d');
      }
      if (!isDone && isBefore(d, today)) {
        isOverdue = true;
      }
    } catch {
      dueDateLabel = task.due_date;
    }
  }

  // Subtasks progress calculation (if checklists or description items)
  const checklistMatch = task.description?.match(/\[[ xX]\]/g);
  const checklistTotal = checklistMatch ? checklistMatch.length : 0;
  const checklistDone = task.description ? (task.description.match(/\[[xX]\]/g)?.length || 0) : 0;

  // Project tint background
  const projectColor = project?.color || '#5B5BF0';

  return (
    <div
      data-task-id={task.id}
      onMouseEnter={() => !isOverlay && setIsHovered(true)}
      onMouseLeave={() => !isOverlay && setIsHovered(false)}
      onClick={() => onOpenDrawer?.(task)}
      style={{
        transform: isHovered && !isOverlay ? 'translateY(-3px)' : 'none',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
      }}
      className={`group relative rounded-[24px] p-5 cursor-grab active:cursor-grabbing select-none border transition-all ${
        isOverlay
          ? 'shadow-2xl ring-2 ring-lime border-lime bg-white/95 scale-[1.03] z-50'
          : isDone
          ? 'bg-white/45 border-white/60 opacity-60 shadow-xs'
          : 'bg-panel backdrop-blur-[20px] border-white/65 shadow-glass hover:shadow-md'
      }`}
    >
      {/* Accent border trace SVG (2px lime stroke running around perimeter on hover) */}
      {isHovered && !isOverlay && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded-[24px] overflow-visible"
          style={{ padding: '0px' }}
        >
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="23"
            ry="23"
            fill="none"
            stroke="#C6F432"
            strokeWidth="2.5"
            strokeDasharray="90 320"
            style={{ animation: 'borderTrace 1.6s linear infinite' }}
          />
        </svg>
      )}

      {/* Top Row: Project chip & Priority flag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {project ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs text-xs text-graphite font-medium">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            <span className="truncate max-w-[150px]">{project.name}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {/* Priority Flag */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: priorityConfig.bg, color: priorityConfig.color }}
            title={`Priority: ${priorityConfig.label}`}
          >
            <Flag size={11} />
            <span>{priorityConfig.label}</span>
          </div>

          {/* Quick complete toggle */}
          {onToggleComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task);
              }}
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                isDone
                  ? 'bg-lime border-lime text-nearblack'
                  : 'border-black/20 hover:border-lime bg-white/60'
              }`}
              title={isDone ? 'Mark as active' : 'Mark as done'}
            >
              {isDone && <Check size={12} strokeWidth={3} />}
            </button>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4
        className={`text-[17px] md:text-[19px] font-normal leading-snug tracking-tight mb-4 ${
          isDone ? 'line-through text-secondary' : 'text-graphite'
        }`}
      >
        {task.title}
      </h4>

      {/* Bottom Metadata: Due date, Estimate, Department dot, Subtask Progress */}
      <div className="flex items-center justify-between text-xs text-secondary pt-3 border-t border-black/[0.04]">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Due date chip */}
          {dueDateLabel && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[11px] ${
                isOverdue
                  ? 'bg-coral/15 text-coral font-semibold'
                  : isDone
                  ? 'bg-black/5 text-secondary'
                  : 'bg-white/70 text-graphite border border-white/80'
              }`}
            >
              <Clock size={11} />
              <span>{dueDateLabel}</span>
            </span>
          )}

          {/* Estimate */}
          {task.estimate_min ? (
            <span className="text-[11px] font-normal text-secondary">
              {task.estimate_min}m
            </span>
          ) : null}

          {/* Department dot */}
          {department && (
            <span className="flex items-center gap-1 text-[11px] text-secondary font-normal" title={department.name}>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: department.color || '#3BA7F5' }}
              />
              <span className="truncate max-w-[90px]">{department.name}</span>
            </span>
          )}
        </div>

        {/* Circular subtask progress ring if checklist exists */}
        {checklistTotal > 0 && (
          <div
            className="flex items-center gap-1 text-[11px] font-medium text-graphite"
            title={`${checklistDone}/${checklistTotal} subtasks completed`}
          >
            <ListChecks size={13} className="text-secondary" />
            <span>
              {checklistDone}/{checklistTotal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
