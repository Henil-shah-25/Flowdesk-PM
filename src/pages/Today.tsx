import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTableData, useUpdateRecord } from '../hooks/useData';
import type { TaskItem } from '../types';
import { Chip } from '../components/ui';
import {
  CheckCircle2, Circle, Clock, Flame, ChevronDown, Zap,
} from 'lucide-react';
import {
  format, isToday, isBefore, startOfDay, isAfter,
} from 'date-fns';
import { MiniFocusTimer } from '../components/common/MiniFocusTimer';

/* ─── Helpers ─── */
const PRIORITY_ORDER: Record<TaskItem['priority'], number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

function fmtMin(min: number): string {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ''}`;
}

/* ─── Task Row ─── */
interface TaskRowProps {
  task: TaskItem;
  isNow?: boolean;
  onToggle: () => void;
  departments?: Array<{ id: string; name: string; color?: string }>;
  projects?: Array<{ id: string; name: string; color?: string }>;
}
function TaskRow({ task, isNow, onToggle, departments, projects }: TaskRowProps) {
  const done = Boolean(task.done_at);
  const dept = departments?.find(d => d.id === task.department_id);
  const proj = projects?.find(p => p.id === task.project_id);
  const deptColor = dept?.color || '#8DB3DE';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: done ? 0.55 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3 rounded-2xl cursor-pointer select-none group transition-colors min-h-[60px] sm:min-h-[64px] ${
        isNow
          ? 'bg-charcoal text-white'
          : 'bg-white/60 border border-black/[0.06] hover:bg-white/85'
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <button
        type="button"
        className="shrink-0 p-0.5 focus:outline-none"
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done ? (
          <CheckCircle2 size={24} className="text-lime" />
        ) : (
          <Circle size={24} className={isNow ? 'text-white/60 group-hover:text-white' : 'text-secondary group-hover:text-graphite'} />
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0 pr-1">
        <p className={`text-sm sm:text-base font-normal truncate leading-snug ${
          done ? 'line-through' : ''
        } ${isNow ? 'text-white' : 'text-graphite'}`}>
          {task.title}
        </p>
        {/* Meta row */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
          {proj && (
            <span className="flex items-center gap-1 text-[11px] sm:text-xs truncate max-w-[140px]" style={{ color: isNow ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: proj.color || deptColor }} />
              <span className="truncate">{proj.name}</span>
            </span>
          )}
          {dept && (
            <span
              className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-normal truncate max-w-[120px]"
              style={{
                background: isNow ? 'rgba(255,255,255,0.12)' : `${deptColor}25`,
                color: isNow ? 'rgba(255,255,255,0.75)' : deptColor,
              }}
            >
              {dept.name}
            </span>
          )}
        </div>
      </div>

      {/* Right side meta */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {task.estimate_min > 0 && (
          <span className={`text-[11px] sm:text-xs hidden sm:inline ${isNow ? 'text-white/60' : 'text-muted'}`}>
            {fmtMin(task.estimate_min)}
          </span>
        )}
        {task.due_date && (
          <span className={`text-[11px] sm:text-xs flex items-center gap-1 ${isNow ? 'text-white/60' : 'text-muted'}`}>
            <Clock size={11} /> {format(new Date(task.due_date), 'h:mm a')}
          </span>
        )}
        <span
          className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
          style={{
            background: isNow ? 'rgba(255,255,255,0.12)' : task.priority === 'urgent' ? 'var(--accent-coral)20' : task.priority === 'high' ? 'var(--accent-amber)20' : 'var(--accent-lime)20',
            color: isNow ? 'rgba(255,255,255,0.8)' : task.priority === 'urgent' ? 'var(--accent-coral)' : task.priority === 'high' ? 'var(--accent-amber)' : 'var(--color-charcoal)',
          }}
        >
          {task.priority}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Group ─── */
interface GroupProps {
  label: string;
  tasks: TaskItem[];
  defaultOpen?: boolean;
  collapsible?: boolean;
  isNowGroup?: boolean;
  onToggle: (task: TaskItem) => void;
  departments?: Array<{ id: string; name: string; color?: string }>;
  projects?: Array<{ id: string; name: string; color?: string }>;
}
function TaskGroup({ label, tasks, defaultOpen = true, collapsible = false, isNowGroup, onToggle, departments, projects }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        className={`flex items-center gap-2 text-xs font-medium text-secondary px-1 ${collapsible ? 'cursor-pointer hover:text-graphite' : 'cursor-default'}`}
      >
        {label}
        <span className="font-normal text-muted">({tasks.length})</span>
        {collapsible && (
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <ChevronDown size={12} />
          </motion.span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden space-y-1.5"
          >
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                isNow={isNowGroup && i === 0}
                onToggle={() => onToggle(task)}
                departments={departments}
                projects={projects}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Momentum Ring ─── */
function MomentumRing({ done, planned }: { done: number; planned: number }) {
  const total = done + planned;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 max-w-full">
        <svg viewBox="-56 -56 112 112" className="w-full h-full">
          <circle cx="0" cy="0" r={r} fill="none" stroke="rgba(27,29,31,0.08)" strokeWidth={8} />
          <circle
            cx="0" cy="0" r={r} fill="none"
            stroke="var(--accent-lime)" strokeWidth={8}
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
            transform="rotate(-90)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-light text-graphite">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-secondary text-center">{done} of {total} tasks done</p>
    </div>
  );
}

/* ─── Today Page ─── */
export const Today: React.FC = () => {
  const { data: allTasks = [], isLoading } = useTableData('Tasks');
  const { data: departments = [] } = useTableData('Departments');
  const { data: projects = [] } = useTableData('Projects');
  const updateTask = useUpdateRecord('Tasks');
  const [hoursAvailable, setHoursAvailable] = useState(8);

  const now = new Date();
  const todayStart = startOfDay(now);

  const toggleTask = (task: TaskItem) => {
    updateTask.mutate({
      id: task.id,
      patch: { done_at: task.done_at ? '' : new Date().toISOString() },
    });
  };

  /* ─── Group tasks ─── */
  const doneToday = allTasks.filter(t => t.done_at && isToday(new Date(t.done_at)));
  const overdueTasks = allTasks.filter(t =>
    !t.done_at && t.due_date &&
    isBefore(new Date(t.due_date), todayStart) && !isToday(new Date(t.due_date))
  );
  const dueTodayTasks = allTasks.filter(t =>
    !t.done_at && t.due_date && isToday(new Date(t.due_date))
  );
  const laterTasks = allTasks.filter(t =>
    !t.done_at && t.due_date && isAfter(new Date(t.due_date), now) && isToday(new Date(t.due_date))
  );

  // Sort by priority then due time
  const sortByPri = (arr: TaskItem[]) =>
    [...arr].sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      return 0;
    });

  const nowTasks = sortByPri([...overdueTasks, ...dueTodayTasks]).slice(0, 1);
  const nextTasks = sortByPri([...overdueTasks, ...dueTodayTasks]).slice(1, 5);
  const laterGroupTasks = sortByPri(laterTasks);
  const overdueGroup = sortByPri(overdueTasks.filter(t => !nowTasks.includes(t) && !nextTasks.includes(t)));

  const plannedCount = overdueTasks.length + dueTodayTasks.length + doneToday.length;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs sm:text-sm text-secondary">{format(now, 'EEEE, MMMM d')}</span>
            <Chip label="In focus" accent="lime" size="sm" dot={false} />
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/60 border border-black/[0.07] text-xs text-graphite">
              <Flame size={12} className="text-coral" />
              <span>3 day streak</span>
            </div>
          </div>
          <h1 className="text-[clamp(32px,6vw,44px)] font-light tracking-tight text-graphite leading-[1.05]">Today</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            className="flex-1 sm:flex-initial h-10 px-5 rounded-full bg-lime text-nearblack text-xs sm:text-sm font-medium flex items-center justify-center gap-2 hover:bg-[var(--accent-lime-hover)] active:scale-95 transition-all shadow-xs"
            onClick={() => {/* navigate to focus */}}
          >
            <Zap size={14} /> <span>Start Focus</span>
          </button>
        </div>
      </div>

      {/* ─── Main layout: 62% tasks + 38% sidebar ─── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Task list */}
        <div className="flex-[62] min-w-0 space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/40 animate-pulse" />
            ))
          ) : (
            <>
              <TaskGroup
                label="Now"
                tasks={nowTasks}
                isNowGroup
                onToggle={toggleTask}
                departments={departments as Array<{ id: string; name: string; color?: string }>}
                projects={projects as Array<{ id: string; name: string; color?: string }>}
              />
              <TaskGroup
                label="Next"
                tasks={nextTasks}
                onToggle={toggleTask}
                departments={departments as Array<{ id: string; name: string; color?: string }>}
                projects={projects as Array<{ id: string; name: string; color?: string }>}
              />
              <TaskGroup
                label="Later today"
                tasks={laterGroupTasks}
                onToggle={toggleTask}
                departments={departments as Array<{ id: string; name: string; color?: string }>}
                projects={projects as Array<{ id: string; name: string; color?: string }>}
              />
              <TaskGroup
                label="Overdue"
                tasks={overdueGroup}
                defaultOpen={overdueGroup.length <= 3}
                collapsible={overdueGroup.length > 3}
                onToggle={toggleTask}
                departments={departments as Array<{ id: string; name: string; color?: string }>}
                projects={projects as Array<{ id: string; name: string; color?: string }>}
              />
              <TaskGroup
                label="Done today"
                tasks={doneToday}
                defaultOpen={false}
                collapsible
                onToggle={toggleTask}
                departments={departments as Array<{ id: string; name: string; color?: string }>}
                projects={projects as Array<{ id: string; name: string; color?: string }>}
              />
              {nowTasks.length === 0 && nextTasks.length === 0 && laterGroupTasks.length === 0 && overdueGroup.length === 0 && doneToday.length === 0 && (
                <div className="py-16 text-center space-y-2">
                  <CheckCircle2 size={36} className="text-lime mx-auto opacity-60" />
                  <p className="text-secondary text-sm">Nothing scheduled for today</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Sticky sidebar */}
        <div className="flex-[38] min-w-0 lg:min-w-[320px] lg:max-w-[380px] space-y-4 lg:sticky lg:top-[112px] lg:self-start">
          {/* Momentum */}
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-6 shadow-[var(--panel-shadow)]">
            <h3 className="text-sm font-medium text-graphite mb-4">Daily momentum</h3>
            <MomentumRing done={doneToday.length} planned={plannedCount} />
          </div>

          {/* Hours available */}
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-5 shadow-[var(--panel-shadow)]">
            <h3 className="text-sm font-medium text-graphite mb-3">Hours available</h3>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={16} step={0.5}
                value={hoursAvailable}
                onChange={e => setHoursAvailable(Number(e.target.value))}
                className="flex-1 accent-current"
                style={{ accentColor: 'var(--accent-lime)' }}
              />
              <span className="text-lg font-light text-graphite tabular-nums w-10 text-right">{hoursAvailable}h</span>
            </div>
            <p className="text-xs text-secondary mt-1.5">
              {Math.round(([...nowTasks, ...nextTasks, ...laterGroupTasks].reduce((s, t) => s + (t.estimate_min || 30), 0)) / 60 * 10) / 10}h planned
            </p>
          </div>

          {/* Mini focus */}
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[var(--panel-radius)] p-5 shadow-[var(--panel-shadow)]">
            <h3 className="text-sm font-medium text-graphite mb-4">Focus</h3>
            <MiniFocusTimer compact />
          </div>
        </div>
      </div>
    </div>
  );
};
