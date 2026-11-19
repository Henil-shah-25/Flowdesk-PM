import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitFork,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Unlink,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';
import type { TaskItem, Project, Stage, TaskNote } from '../../types';
import {
  calculateDevelopmentProgress,
  findCurrentDevelopmentPhase,
  findBlockerPhases,
  getPhaseStatusInfo,
} from '../../lib/developmentPhases';

export interface LinkedDevelopmentSectionProps {
  task: TaskItem;
  allProjects: Project[];
  allTasks: TaskItem[];
  allStages: Stage[];
  allNotes: TaskNote[];
  onOpenConnectModal: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onSelectPhase: (phaseTaskId: string) => void;
  onMarkMainTaskDone?: () => void;
}

export const LinkedDevelopmentSection: React.FC<LinkedDevelopmentSectionProps> = ({
  task,
  allProjects,
  allTasks,
  allStages,
  allNotes,
  onOpenConnectModal,
  onDisconnect,
  onRefresh,
  onSelectPhase,
  onMarkMainTaskDone,
}) => {
  const navigate = useNavigate();
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stagesMap = useMemo(() => {
    return new Map(allStages.map((s) => [s.id, s]));
  }, [allStages]);

  const hasConnection = Boolean(task.linked_project_id || task.linked_task_id);

  // Linked Project & Lead Task lookup
  const linkedProject = useMemo(() => {
    if (!task.linked_project_id) return null;
    return allProjects.find((p) => p.id === task.linked_project_id && !p.archived) || null;
  }, [allProjects, task.linked_project_id]);

  const linkedTask = useMemo(() => {
    if (!task.linked_task_id) return null;
    return allTasks.find((t) => t.id === task.linked_task_id && !t.archived) || null;
  }, [allTasks, task.linked_task_id]);

  // Development Phases: All tasks in the linked sub-project (excluding the main task itself)
  const developmentPhases = useMemo(() => {
    if (!task.linked_project_id) return [];
    return allTasks
      .filter((t) => t.project_id === task.linked_project_id && t.id !== task.id && !t.archived)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [allTasks, task.linked_project_id, task.id]);

  // Progress metrics
  const progressResult = useMemo(() => {
    return calculateDevelopmentProgress(developmentPhases, stagesMap);
  }, [developmentPhases, stagesMap]);

  // Current active development phase
  const currentPhase = useMemo(() => {
    return findCurrentDevelopmentPhase(developmentPhases, stagesMap);
  }, [developmentPhases, stagesMap]);

  // Blocker phases
  const blockerPhases = useMemo(() => {
    return findBlockerPhases(developmentPhases, stagesMap);
  }, [developmentPhases, stagesMap]);

  // Trigger manual refresh animation
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Navigate to Sub-Project
  const handleOpenDevelopment = () => {
    if (task.linked_project_id) {
      navigate(`/projects/${task.linked_project_id}`);
    }
  };

  // State 1: No Connection — Prompt to Connect
  if (!hasConnection) {
    return (
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork size={16} className="text-secondary" />
            <h3 className="text-sm font-medium text-graphite">Linked Development</h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/55 border border-black/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors hover:bg-white/70">
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-medium text-graphite">
              No Sub-Project Connected
            </p>
            <p className="text-[11px] sm:text-xs text-secondary">
              Connect to a sub-project development pipeline to track live phases, blockers, and automatic progress.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenConnectModal}
            className="px-4 py-2 rounded-full bg-nearblack hover:bg-charcoal text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus size={13} />
            <span>Connect Sub-Project</span>
          </button>
        </div>
      </div>
    );
  }

  // State 2: Linked project or task is missing or deleted
  const isBrokenLink = !linkedProject;
  if (isBrokenLink) {
    return (
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork size={16} className="text-coral" />
            <h3 className="text-sm font-medium text-graphite">Linked Development</h3>
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-muted hover:text-coral transition-colors"
          >
            Remove link
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-coral/10 border border-coral/25 space-y-2.5">
          <div className="flex items-center gap-2 text-coral text-xs font-medium">
            <AlertTriangle size={15} />
            <span>Linked sub-project is unavailable or has been archived.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="px-3.5 py-1.5 rounded-full bg-nearblack text-white text-xs font-medium hover:bg-charcoal transition-all"
            >
              Reconnect
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3.5 py-1.5 rounded-full bg-white/70 text-secondary border border-black/[0.08] text-xs hover:bg-white transition-all"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Active Connected Development View
  return (
    <div className="space-y-3 pt-2">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitFork size={16} className="text-secondary" />
          <h3 className="text-sm font-medium text-graphite">Linked Development</h3>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: linkedProject?.color || '#8DB3DE' }}
            title={linkedProject?.name}
          />
          <span className="text-xs font-normal text-secondary truncate max-w-[150px] sm:max-w-[200px]">
            {linkedProject?.name}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleManualRefresh}
            className={`p-1.5 rounded-lg text-muted hover:text-graphite transition-all ${
              isRefreshing ? 'animate-spin text-graphite' : ''
            }`}
            title="Refresh development progress"
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmDisconnect(true)}
            className="p-1.5 rounded-lg text-muted hover:text-coral transition-colors"
            title="Disconnect linked sub-project"
          >
            <Unlink size={13} />
          </button>
        </div>
      </div>

      {/* Disconnect Confirmation Prompt */}
      {showConfirmDisconnect && (
        <div className="p-3.5 rounded-2xl bg-white border border-coral/30 shadow-sm space-y-2 animate-in fade-in">
          <p className="text-xs text-graphite">
            Disconnect from <strong>{linkedProject?.name}</strong>? This will only remove the link and will not delete any projects or tasks.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmDisconnect(false)}
              className="px-3 py-1 rounded-full text-xs text-secondary hover:bg-black/[0.05]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirmDisconnect(false);
                onDisconnect();
              }}
              className="px-3 py-1 rounded-full bg-coral text-white text-xs font-medium hover:bg-coral/90"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="p-4 rounded-2xl bg-white/60 border border-black/[0.06] space-y-4">
        {/* A. Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary font-medium">Overall Progress</span>
            {progressResult.hasPhases ? (
              <span className="font-semibold text-graphite">
                {progressResult.progress}% Done{' '}
                <span className="text-[11px] font-normal text-muted">
                  ({progressResult.completedCount}/{progressResult.totalCount} completed)
                </span>
              </span>
            ) : (
              <span className="text-[11px] text-muted italic">No Development Phases</span>
            )}
          </div>

          {/* Compact Horizontal Progress Bar */}
          <div className="h-2 w-full bg-black/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progressResult.progress === 100
                  ? 'bg-lime'
                  : blockerPhases.length > 0
                  ? 'bg-amber-500'
                  : 'bg-[#2B579A]'
              }`}
              style={{
                width: `${progressResult.hasPhases ? progressResult.progress : 0}%`,
              }}
            />
          </div>
        </div>

        {/* B. Current Development Phase */}
        {currentPhase && (
          <div className="p-3 rounded-xl bg-white/80 border border-black/[0.05] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium tracking-wider text-muted uppercase flex items-center gap-1">
                <Clock size={11} />
                <span>Current Development Phase</span>
              </span>
              {(() => {
                const stage = stagesMap.get(currentPhase.stage_id);
                const info = getPhaseStatusInfo(currentPhase, stage);
                return (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: info.bgColor, color: info.color }}
                  >
                    {info.label}
                  </span>
                );
              })()}
            </div>

            <div
              onClick={() => onSelectPhase(currentPhase.id)}
              className="text-xs sm:text-sm font-medium text-graphite hover:underline cursor-pointer flex items-center justify-between gap-2"
              title="Click to view phase details"
            >
              <span className="truncate">{currentPhase.title}</span>
              <ChevronRight size={14} className="text-muted shrink-0" />
            </div>
          </div>
        )}

        {/* D. Blocker Information Warning */}
        {blockerPhases.length > 0 && (
          <div className="p-3 rounded-xl bg-coral/10 border border-coral/30 space-y-2">
            <div className="flex items-center gap-1.5 text-coral text-xs font-semibold">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                {blockerPhases.length} Development {blockerPhases.length === 1 ? 'Phase' : 'Phases'} Blocked
              </span>
            </div>

            <div className="space-y-1.5">
              {blockerPhases.map(({ phase, stage }) => {
                const blockerNote = allNotes.find((n) => n.task_id === phase.id);
                const desc = blockerNote?.body || phase.description;

                return (
                  <div
                    key={phase.id}
                    onClick={() => onSelectPhase(phase.id)}
                    className="p-2 rounded-lg bg-white/70 border border-coral/20 cursor-pointer hover:bg-white transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-graphite truncate">{phase.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-coral/20 text-coral font-bold shrink-0">
                        {stage?.name || 'Blockade'}
                      </span>
                    </div>
                    {desc && (
                      <p className="text-[11px] text-secondary line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. Phase Overview List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-secondary uppercase tracking-wider">
              Development Phases ({developmentPhases.length})
            </span>
            <span className="text-[10px] text-muted">Click phase to view</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar p-0.5">
            {developmentPhases.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted rounded-xl bg-white/40">
                No development phases created in this sub-project yet.
              </div>
            ) : (
              developmentPhases.map((phase) => {
                const stage = stagesMap.get(phase.stage_id);
                const info = getPhaseStatusInfo(phase, stage);
                const isCurrent = currentPhase?.id === phase.id;

                return (
                  <div
                    key={phase.id}
                    onClick={() => onSelectPhase(phase.id)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-white border-black/15 shadow-sm'
                        : 'bg-white/50 hover:bg-white border-black/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="text-xs sm:text-sm text-graphite truncate font-normal group-hover:text-black">
                        {phase.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: info.bgColor, color: info.color }}
                      >
                        {info.label}
                      </span>
                      <ChevronRight size={13} className="text-muted group-hover:text-graphite transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 100% Completion Verification Banner */}
        {progressResult.hasPhases && progressResult.progress === 100 && (
          <div className="p-3 rounded-xl bg-lime/15 border border-lime/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#3D550C] font-medium">
              <Sparkles size={15} className="shrink-0 text-[#4D6B10]" />
              <span>All development phases completed. Ready for review.</span>
            </div>
            {onMarkMainTaskDone && !task.done_at && (
              <button
                type="button"
                onClick={onMarkMainTaskDone}
                className="px-3 py-1 rounded-full bg-lime text-nearblack font-semibold text-xs hover:bg-[var(--accent-lime-hover)] transition-all shadow-sm shrink-0 flex items-center gap-1"
              >
                <CheckCircle2 size={13} />
                <span>Mark Main Task Done</span>
              </button>
            )}
          </div>
        )}

        {/* E. Action Footer */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleOpenDevelopment}
            className="flex-1 py-2 px-3.5 rounded-full bg-white hover:bg-white/90 border border-black/[0.08] text-graphite text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <ExternalLink size={13} className="text-secondary" />
            <span>Open Linked Development ({linkedProject.name})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
