import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard, Chip, ProgressBar } from '../components/ui';
import { useTableData, useUpdateRecord } from '../hooks/useData';
import { NewTaskModal } from '../components/tasks/NewTaskModal';
import type { TaskItem, Idea } from '../types';
import { computeProjectHealth } from '../lib/health';
import {
  Plus, ArrowUpRight, Clock, CheckCircle2,
  AlertCircle, Zap, ChevronRight, Circle,
} from 'lucide-react';
import {
  format, isToday, isBefore, startOfDay, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay,
} from 'date-fns';
import { MiniFocusTimer } from '../components/common/MiniFocusTimer';

/* ─── Helpers ─── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ''}`.trim();
}

const PRIORITY_ORDER: Record<TaskItem['priority'], number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

/* ─── SVG Ring component ─── */
interface RingProps {
  value: number; // 0–100
  color: string;
  radius: number;
  stroke: number;
  trackColor?: string;
}
function Ring({ value, color, radius, stroke, trackColor = 'rgba(27,29,31,0.08)' }: RingProps) {
  const c = 2 * Math.PI * radius;
  const offset = c - (value / 100) * c;
  return (
    <g>
      <circle cx="0" cy="0" r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx="0" cy="0" r={radius} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)', transformOrigin: 'center' }}
        transform="rotate(-90)"
      />
    </g>
  );
}

/* ─── Week Bar Chart ─── */
function WeekBarChart({ tasks }: { tasks: TaskItem[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const doneCounts = days.map(day =>
    tasks.filter(t => t.done_at && isSameDay(new Date(t.done_at), day)).length
  );
  const plannedCounts = days.map(day =>
    tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day)).length
  );
  const maxVal = Math.max(...plannedCounts, ...doneCounts, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-28">
        {days.map((day, i) => {
          const isT = isToday(day);
          const doneH = (doneCounts[i] / maxVal) * 100;
          const planH = (plannedCounts[i] / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="relative w-full h-full flex flex-col justify-end">
                {/* Ghost track */}
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-lg opacity-25"
                  style={{ height: `${planH}%`, background: 'rgba(27,29,31,0.15)' }}
                />
                {/* Done bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${doneH}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.05 }}
                  className="relative w-full rounded-t-lg"
                  style={{ background: isT ? 'var(--accent-coral)' : 'var(--color-charcoal)' }}
                />
              </div>
              <span className={`text-[11px] font-normal mt-1 ${isT ? 'text-graphite font-medium' : 'text-secondary'}`}>
                {format(day, 'EEE')[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-secondary">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-charcoal" /> Done</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-black/20" /> Planned</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-coral" /> Today</span>
      </div>
    </div>
  );
}


/* ─── Dashboard Page ─── */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useTableData('Projects');
  const { data: tasks = [], isLoading: tasksLoading } = useTableData('Tasks');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');
  const { data: ideas = [] } = useTableData('Ideas');
  const updateTask = useUpdateRecord('Tasks');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  /* ─── Computed data ─── */
  // Today's planned = due today OR overdue (not done)
  const plannedToday = tasks.filter(t =>
    !t.done_at && t.due_date &&
    (isToday(new Date(t.due_date)) || isBefore(new Date(t.due_date), todayStart))
  );
  const doneToday = tasks.filter(t => t.done_at && isToday(new Date(t.done_at)));
  const overdue = tasks.filter(t =>
    !t.done_at && t.due_date && isBefore(new Date(t.due_date), todayStart) && !isToday(new Date(t.due_date))
  );

  // This week
  const plannedThisWeek = tasks.filter(t =>
    t.due_date && new Date(t.due_date) >= weekStart && new Date(t.due_date) <= weekEnd
  );
  const doneThisWeek = tasks.filter(t =>
    t.done_at && new Date(t.done_at) >= weekStart && new Date(t.done_at) <= weekEnd
  );

  const momentumPct = (plannedToday.length + doneToday.length) > 0
    ? Math.round(doneToday.length / (plannedToday.length + doneToday.length) * 100)
    : 0;

  const focusMinToday = doneToday.reduce((s, t) => s + (t.actual_min || t.estimate_min || 0), 0);

  // Up next task
  const upNext = [...plannedToday].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )[0];

  // Top level active projects
  const activeProjects = projects.filter(p => !p.parent_id && p.status === 'active' && !p.archived);

  // Projects touched today (has a task done today)
  const projectsTouchedIds = new Set(doneToday.map(t => t.project_id).filter(Boolean));

  // Concentric rings data
  const rings = [
    { label: 'Tasks done', value: momentumPct, color: 'var(--accent-lime)', r: 56, s: 8 },
    { label: 'Focus hours', value: Math.min(100, (focusMinToday / 480) * 100), color: 'var(--accent-coral)', r: 44, s: 7 },
    { label: 'Projects', value: Math.min(100, (projectsTouchedIds.size / Math.max(1, activeProjects.length)) * 100), color: 'var(--tint-sky)', r: 32, s: 6 },
  ];

  const toggleTask = (task: TaskItem) => {
    updateTask.mutate({ id: task.id, patch: { done_at: task.done_at ? '' : new Date().toISOString() } });
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* ─── Greeting Row ─── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pt-1">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-secondary mb-1 font-normal tracking-wide uppercase sm:normal-case">{format(now, 'EEEE, MMMM d')}</p>
          <h1 className="text-[clamp(28px,7vw,42px)] sm:text-[clamp(36px,4.5vw,56px)] font-light tracking-tight text-graphite leading-[1.1] break-words">
            {getGreeting()}, <span className="font-medium whitespace-nowrap">Henil</span>
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1.5 font-normal">
            {plannedToday.length > 0
              ? `${plannedToday.length} task${plannedToday.length > 1 ? 's' : ''} left today`
              : 'All clear for today 🎉'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial h-11 px-4 sm:px-5 rounded-full border border-black/[0.08] bg-white/70 text-xs sm:text-sm font-normal text-graphite flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus size={16} /> <span>New task</span>
          </button>
          <button
            onClick={() => navigate('/focus')}
            className="flex-1 sm:flex-initial h-11 px-4 sm:px-5 rounded-full bg-lime text-nearblack text-xs sm:text-sm font-medium flex items-center justify-center gap-2 hover:bg-[var(--accent-lime-hover)] active:scale-[0.98] transition-all shadow-xs"
          >
            <Zap size={15} /> <span>Start focus</span>
          </button>
        </div>
      </div>

      {/* ─── Stat tiles (KPI Cards) ─── */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        {[
          { label: 'Done today', value: `${doneToday.length}/${doneToday.length + plannedToday.length}`, icon: <CheckCircle2 size={18} className="text-lime" />, sub: 'tasks completed' },
          { label: 'Focus today', value: fmtMin(focusMinToday), icon: <Clock size={18} className="text-coral" />, sub: 'of 8h target' },
          { label: 'Overdue', value: overdue.length, icon: <AlertCircle size={18} className="text-amber" />, sub: overdue.length === 0 ? "you're on time" : 'need attention' },
        ].map((tile, i) => (
          <GlassCard key={i} className="!p-4 sm:!p-5 flex items-center gap-3.5 shrink-0 snap-start w-[72vw] max-w-[280px] sm:w-auto sm:max-w-none">
            <div className="w-10 h-10 rounded-full bg-white/70 border border-black/[0.06] flex items-center justify-center shrink-0 shadow-xs">
              {tile.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-secondary mb-0.5 truncate">{tile.label}</div>
              <div className="text-lg sm:text-xl font-light text-graphite tabular-nums leading-tight">{tile.value}</div>
              <div className="text-[10px] text-muted mt-0.5 truncate">{tile.sub}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ─── Three cards row: Today rings | Up next | Focus ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Today rings */}
        <GlassCard className="!p-5 sm:!p-6 flex flex-col items-center gap-4">
          <div className="text-sm font-medium text-graphite self-start">Today</div>
          <div className="relative flex items-center justify-center w-full my-1">
            <svg viewBox="-72 -72 144 144" className="w-32 h-32 sm:w-36 sm:h-36 max-w-full">
              <g>
                {rings.map((ring, i) => (
                  <Ring key={i} value={ring.value} color={ring.color} radius={ring.r} stroke={ring.s} />
                ))}
              </g>
              <text x="0" y="4" textAnchor="middle" dominantBaseline="middle"
                fontSize="22" fontWeight="300" fill="var(--text-graphite)"
              >
                {momentumPct}%
              </text>
            </svg>
          </div>
          <div className="w-full space-y-1.5">
            {rings.map((ring, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ring.color }} />
                  <span className="text-secondary truncate">{ring.label}</span>
                </div>
                <span className="font-medium text-graphite tabular-nums shrink-0">{Math.round(ring.value)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Up next */}
        <GlassCard className="!p-5 sm:!p-6 flex flex-col gap-4">
          <div className="text-sm font-medium text-graphite">Up next</div>
          {tasksLoading ? (
            <div className="flex-1 flex items-center justify-center text-secondary text-xs">Loading…</div>
          ) : upNext ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Chip
                    label={upNext.priority}
                    accent={upNext.priority === 'urgent' ? 'coral' : upNext.priority === 'high' ? 'amber' : 'lime'}
                    size="sm"
                  />
                  {upNext.due_date && (
                    <span className="text-xs text-secondary flex items-center gap-1">
                      <Clock size={11} /> {format(new Date(upNext.due_date), 'h:mm a')}
                    </span>
                  )}
                </div>
                <p className="text-base font-normal text-graphite leading-snug line-clamp-2">{upNext.title}</p>
                {upNext.estimate_min && (
                  <p className="text-xs text-secondary mt-1">{fmtMin(upNext.estimate_min)} estimated</p>
                )}
              </div>
              <button
                onClick={() => navigate('/today')}
                className="mt-4 h-9 px-4 rounded-full bg-charcoal text-white text-xs font-normal flex items-center gap-1.5 self-start hover:bg-charcoal/90 active:scale-95 transition-all"
              >
                Open task <ArrowUpRight size={12} />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-secondary py-6">
              <CheckCircle2 size={28} className="text-lime opacity-60" />
              <p className="text-sm">Nothing scheduled for today</p>
            </div>
          )}
        </GlassCard>

        {/* Focus timer */}
        <GlassCard className="!p-5 sm:!p-6 flex flex-col gap-4">
          <div className="text-sm font-medium text-graphite">Focus timer</div>
          <MiniFocusTimer />
        </GlassCard>
      </div>

      {/* ─── My Tasks + This Week ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* My tasks (due today + overdue) */}
        <GlassCard className="!p-5 sm:!p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-graphite">My tasks</h3>
            <button onClick={() => navigate('/today')} className="text-xs text-secondary hover:text-graphite flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {tasksLoading ? (
              <div className="text-xs text-secondary py-4 text-center">Loading…</div>
            ) : [...overdue, ...plannedToday].slice(0, 6).length === 0 ? (
              <div className="py-6 text-center text-secondary text-sm">All done for today 🎉</div>
            ) : (
              [...overdue, ...plannedToday].slice(0, 6).map(task => {
                const done = Boolean(task.done_at);
                const isOvd = task.due_date && isBefore(new Date(task.due_date), todayStart) && !isToday(new Date(task.due_date));
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 rounded-2xl bg-white/60 border border-black/[0.06] transition-opacity ${done ? 'opacity-50' : ''}`}
                  >
                    <button onClick={() => toggleTask(task)} className="shrink-0 p-0.5" aria-label={done ? 'Mark pending' : 'Mark done'}>
                      {done
                        ? <CheckCircle2 size={20} className="text-lime" />
                        : <Circle size={20} className="text-secondary hover:text-graphite" />
                      }
                    </button>
                    <span className={`flex-1 min-w-0 text-xs sm:text-sm text-graphite truncate font-normal ${done ? 'line-through text-secondary' : ''}`}>
                      {task.title}
                    </span>
                    {isOvd && !done && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium shrink-0">Overdue</span>
                    )}
                    {task.estimate_min > 0 && (
                      <span className="text-xs text-muted shrink-0 hidden sm:inline">{fmtMin(task.estimate_min)}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* This week bars */}
        <GlassCard className="!p-5 sm:!p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-graphite">This week</h3>
            <span className="text-xs text-secondary">{doneThisWeek.length}/{plannedThisWeek.length} done</span>
          </div>
          <WeekBarChart tasks={tasks} />
        </GlassCard>
      </div>

      {/* ─── Projects health + Ideas + Time donut ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Projects health */}
        <GlassCard className="!p-5 sm:!p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-graphite">Projects</h3>
            <button onClick={() => navigate('/projects')} className="text-xs text-secondary hover:text-graphite flex items-center gap-0.5">
              All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {projectsLoading
              ? Array(3).fill(0).map((_, i) => <div key={i} className="h-10 rounded-2xl bg-white/40 animate-pulse" />)
              : activeProjects.slice(0, 5).map(project => {
                  const health = computeProjectHealth(
                    project,
                    tasks.filter(t => t.project_id === project.id),
                    departments.filter(d => d.project_id === project.id),
                    stages,
                  );
                  const dotColor = health.status === 'mint' ? 'bg-lime' : health.status === 'amber' ? 'bg-amber' : 'bg-coral';
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/60 border border-black/[0.06] cursor-pointer hover:bg-white/80 active:scale-[0.99] transition-all"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="flex-1 text-xs sm:text-sm text-graphite truncate font-normal">{project.name}</span>
                      <div className="w-16 shrink-0">
                        <ProgressBar value={health.progressPercent} accent="lime" size="sm" />
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </GlassCard>

        {/* Ideas */}
        <GlassCard className="!p-5 sm:!p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-graphite">Ideas</h3>
            <button onClick={() => navigate('/ideas')} className="text-xs text-secondary hover:text-graphite flex items-center gap-0.5">
              All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {ideas.slice(0, 4).map((idea: Idea) => (
              <div key={idea.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-2xl bg-white/60 border border-black/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-graphite truncate font-normal">{idea.title}</p>
                  {idea.body && (
                    <p className="text-xs text-secondary line-clamp-1 mt-0.5">{idea.body}</p>
                  )}
                </div>
              </div>
            ))}
            {ideas.length === 0 && (
              <div className="py-6 text-center text-secondary text-sm">No ideas yet</div>
            )}
          </div>
        </GlassCard>

        {/* Time per project donut */}
        <GlassCard className="!p-5 sm:!p-6 space-y-3">
          <h3 className="text-sm font-medium text-graphite">Time by project</h3>
          {activeProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-secondary text-sm">No data</div>
          ) : (() => {
            // Use actual_min sum per project as proxy
            const perProject = activeProjects.map(p => ({
              name: p.name,
              min: tasks.filter(t => t.project_id === p.id && t.done_at).reduce((s, t) => s + (t.actual_min || t.estimate_min || 0), 0),
            })).filter(p => p.min > 0);
            const total = perProject.reduce((s, p) => s + p.min, 1);
            const colors = ['var(--tint-sky)', 'var(--accent-lime)', 'var(--accent-coral)', 'var(--tint-sage)', 'var(--tint-peach)'];

            if (perProject.length === 0) return (
              <div className="py-6 text-center text-secondary text-sm">No logged time yet</div>
            );

            // Build donut segments
            let cumAngle = -90;
            const segments = perProject.slice(0, 5).map((p, i) => {
              const frac = p.min / total;
              const angle = frac * 360;
              const r = 40;
              const startAngle = (cumAngle * Math.PI) / 180;
              const endAngle = ((cumAngle + angle) * Math.PI) / 180;
              const x1 = 50 + r * Math.cos(startAngle);
              const y1 = 50 + r * Math.sin(startAngle);
              const x2 = 50 + r * Math.cos(endAngle);
              const y2 = 50 + r * Math.sin(endAngle);
              const largeArc = angle > 180 ? 1 : 0;
              const path = `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              const seg = { path, color: colors[i % colors.length], name: p.name, min: p.min };
              cumAngle += angle;
              return seg;
            });

            return (
              <div className="flex flex-col items-center gap-3">
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  {segments.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} stroke="var(--panel-bg)" strokeWidth="1.5" />
                  ))}
                  <circle cx="50" cy="50" r="22" fill="var(--panel-bg)" />
                  <text x="50" y="53" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--text-secondary)">
                    Total
                  </text>
                  <text x="50" y="62" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="300" fill="var(--text-graphite)">
                    {fmtMin(total - 1)}
                  </text>
                </svg>
                <div className="w-full space-y-1">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className="flex-1 text-secondary truncate">{seg.name}</span>
                      <span className="text-graphite font-normal">{fmtMin(seg.min)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </GlassCard>
      </div>

      {/* Guaranteed Visibility Task Creation Modal */}
      <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
