import React, { useState } from 'react';
import type { TaskItem, Project, Department } from '../../types';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Clock, Check, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TaskListViewProps {
  tasks: TaskItem[];
  projects: Project[];
  departments: Department[];
  onOpenDrawer: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  projects,
  departments,
  onOpenDrawer,
  onToggleComplete,
}) => {
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Priority ranking for sorting
  const priorityRank: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const rankA = priorityRank[a.priority || 'medium'] || 0;
        const rankB = priorityRank[b.priority || 'medium'] || 0;
        return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      }
      // Sort by due date
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [tasks, sortBy, sortOrder]);

  const toggleSort = (field: 'dueDate' | 'priority') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-panel backdrop-blur-[24px] border border-white/65 shadow-glass rounded-[32px] p-5 sm:p-7 space-y-4">
      {/* Table Sorting Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] text-xs font-medium text-secondary">
        <span className="flex-1">Task & Project</span>

        <div className="flex items-center gap-6 pr-4">
          <button
            type="button"
            onClick={() => toggleSort('priority')}
            className={`flex items-center gap-1 hover:text-graphite transition-colors ${
              sortBy === 'priority' ? 'text-graphite font-semibold' : ''
            }`}
          >
            <span>Priority</span>
            <ArrowUpDown size={12} />
          </button>

          <button
            type="button"
            onClick={() => toggleSort('dueDate')}
            className={`flex items-center gap-1 hover:text-graphite transition-colors ${
              sortBy === 'dueDate' ? 'text-graphite font-semibold' : ''
            }`}
          >
            <span>Due Date</span>
            <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* Task Rows Stack */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {sortedTasks.length === 0 ? (
            <div className="py-12 text-center text-secondary text-sm">
              No tasks found matching your filter criteria.
            </div>
          ) : (
            sortedTasks.map((task) => {
              const isDone = Boolean(task.done_at);
              const project = projectMap.get(task.project_id);
              const dept = departmentMap.get(task.department_id);

              let dueDateText = '';
              let isOverdue = false;
              if (task.due_date) {
                try {
                  const d = new Date(task.due_date);
                  const today = startOfDay(new Date());
                  dueDateText = isToday(d) ? 'Today' : format(d, 'MMM d');
                  if (!isDone && isBefore(d, today)) isOverdue = true;
                } catch {
                  dueDateText = task.due_date;
                }
              }

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => onOpenDrawer(task)}
                  className={`group p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer select-none ${
                    isDone
                      ? 'bg-white/35 border-white/50 opacity-50'
                      : 'bg-white/60 hover:bg-white/80 border-white/70 shadow-xs hover:shadow-sm'
                  }`}
                >
                  {/* Left: Animated Checkbox + Title + Project Chip */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Animated Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(task);
                      }}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? 'bg-lime border-lime text-nearblack shadow-xs'
                          : 'border-black/25 hover:border-lime bg-white/70'
                      }`}
                      title={isDone ? 'Mark as active' : 'Mark as done'}
                    >
                      {isDone && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm sm:text-base font-normal tracking-tight truncate ${
                          isDone ? 'line-through text-secondary' : 'text-graphite'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary flex-wrap">
                        {project && (
                          <span className="flex items-center gap-1 font-medium text-graphite/80 truncate">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: project.color || '#5B5BF0' }}
                            />
                            <span className="truncate max-w-[120px]">{project.name}</span>
                          </span>
                        )}

                        {dept && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">{dept.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Priority & Due Date */}
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    {/* Priority */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full capitalize text-[11px] font-medium ${
                        task.priority === 'urgent'
                          ? 'bg-coral/15 text-coral'
                          : task.priority === 'high'
                          ? 'bg-amber/15 text-amber'
                          : 'bg-black/5 text-secondary'
                      }`}
                    >
                      {task.priority || 'medium'}
                    </span>

                    {/* Due Date */}
                    {dueDateText && (
                      <span
                        className={`inline-flex items-center gap-1 font-normal ${
                          isOverdue ? 'text-coral font-semibold' : 'text-secondary'
                        }`}
                      >
                        <Clock size={12} />
                        <span>{dueDateText}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
