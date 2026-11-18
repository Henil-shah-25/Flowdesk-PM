import React from 'react';
import { motion } from 'framer-motion';
import { Chip } from '../ui';
import type { TaskItem, Stage } from '../../types';
import { CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface KanbanBoardProps {
  stages: Stage[];
  tasks: TaskItem[];
  onMoveTask?: (taskId: string, stageId: string) => void;
  onToggleTask?: (task: TaskItem) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  tasks,
  onMoveTask,
  onToggleTask,
}) => {
  // If no stages, fallback to standard 4 pipeline stages
  const columns = stages.length > 0 ? stages : [
    { id: 'stg_1', department_id: '', name: 'Backlog', order: 1 },
    { id: 'stg_2', department_id: '', name: 'In Progress', order: 2 },
    { id: 'stg_3', department_id: '', name: 'Review', order: 3 },
    { id: 'stg_4', department_id: '', name: 'Done', order: 4 },
  ];

  const getPriorityAccent = (priority: TaskItem['priority']): 'lime' | 'amber' | 'coral' | 'neutral' => {
    switch (priority) {
      case 'urgent':
        return 'coral';
      case 'high':
        return 'amber';
      case 'medium':
        return 'neutral';
      case 'low':
      default:
        return 'lime';
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4 no-scrollbar">
      <div className="flex gap-5 min-w-[760px] lg:min-w-full">
        {columns.map((column) => {
          // Tasks in this column/stage
          const columnTasks = tasks.filter((t) => {
            if (column.id && t.stage_id === column.id) return true;
            if (column.name === 'Done' && Boolean(t.done_at)) return true;
            if (column.name === 'In Progress' && !t.done_at && (t.priority === 'urgent' || t.priority === 'high')) return true;
            if (column.name === 'Backlog' && !t.done_at && t.priority !== 'urgent' && t.priority !== 'high') return true;
            return false;
          });

          return (
            <div
              key={column.id}
              className="flex-1 min-w-[240px] rounded-[28px] bg-white/35 backdrop-blur-[24px] border border-white/65 p-4 flex flex-col justify-start"
            >
              {/* Column Header: Title + Small Count Chip */}
              <div className="flex items-center justify-between px-2 mb-4">
                <span className="font-normal text-sm sm:text-base text-graphite tracking-tight">
                  {column.name}
                </span>
                <span className="w-6 h-6 rounded-full bg-white/60 border border-white/70 text-xs text-graphite font-medium flex items-center justify-center">
                  {columnTasks.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1">
                {columnTasks.length === 0 ? (
                  <div className="p-6 rounded-[20px] border border-dashed border-black/[0.08] text-center">
                    <p className="text-xs text-secondary/60 font-normal">Empty column</p>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const isDone = Boolean(task.done_at);
                    // High priority or In Progress cards use dark charcoal style
                    const isDark =
                      !isDone &&
                      (task.priority === 'urgent' ||
                        task.priority === 'high' ||
                        column.name.toLowerCase().includes('progress'));

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        onClick={() => onToggleTask && onToggleTask(task)}
                        className={`rounded-[20px] p-4 cursor-pointer transition-shadow shadow-sm hover:shadow-[0_12px_32px_rgba(30,35,40,0.12)] ${
                          isDark
                            ? 'bg-charcoal text-white border border-charcoal'
                            : 'bg-white/70 text-graphite border border-white/80'
                        }`}
                      >
                        {/* Card Header: Due date / Priority chip */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Chip
                            label={task.priority}
                            accent={getPriorityAccent(task.priority)}
                            size="sm"
                            dot={!isDark}
                            className={isDark ? 'bg-white/10 text-white border-white/20' : ''}
                          />

                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-lime/25 text-graphite font-medium">
                              <CheckCircle2 size={12} className="text-[#96BD1E]" />
                              <span>Done</span>
                            </span>
                          ) : task.due_date ? (
                            <span
                              className={`text-[11px] font-normal flex items-center gap-1 ${
                                isDark ? 'text-white/60' : 'text-secondary'
                              }`}
                            >
                              <Clock size={11} />
                              {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          ) : null}
                        </div>

                        {/* Title */}
                        <h4
                          className={`text-sm font-normal leading-snug tracking-tight mb-3 ${
                            isDark ? 'text-white' : 'text-graphite'
                          } ${isDone ? 'line-through opacity-60' : ''}`}
                        >
                          {task.title}
                        </h4>

                        {/* Card Footer: Estimate & Advance Stage button */}
                        <div
                          className={`flex items-center justify-between text-[11px] pt-2 border-t ${
                            isDark ? 'border-white/10 text-white/60' : 'border-black/[0.04] text-secondary'
                          }`}
                        >
                          <span>{task.estimate_min}m estimate</span>

                          {onMoveTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const curIdx = columns.findIndex((c) => c.id === task.stage_id);
                                const nextCol = columns[(curIdx + 1) % columns.length];
                                if (nextCol) onMoveTask(task.id, nextCol.id);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                                isDark
                                  ? 'bg-white/15 text-white hover:bg-white/25'
                                  : 'bg-black/5 text-graphite hover:bg-black/10'
                              }`}
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
