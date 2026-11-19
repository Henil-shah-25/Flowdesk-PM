import type { TaskItem, Stage } from '../types';

export interface PhaseStatusInfo {
  label: string;
  kind: 'completed' | 'working' | 'testing' | 'blocked' | 'not_started' | 'custom';
  color: string;
  bgColor: string;
}

/**
 * Checks whether a development phase is completed.
 * Rules:
 * - Completed phases count towards progress.
 * - Not Started, Started, Working, Testing, and Blockade do NOT count as completed.
 */
export function isPhaseCompleted(task: TaskItem, stage?: Stage): boolean {
  if (task.done_at && String(task.done_at).trim() !== '') {
    return true;
  }
  if (!stage) return false;
  if (stage.kind === 'done') return true;

  const name = stage.name.toLowerCase().trim();
  return name === 'completed' || name === 'done' || name === 'ended' || name.startsWith('complete');
}

/**
 * Checks whether a development phase is marked Blockade or Blocked.
 */
export function isPhaseBlocked(stage?: Stage): boolean {
  if (!stage) return false;
  if (stage.kind === 'blocked') return true;
  const name = stage.name.toLowerCase().trim();
  return name.includes('block') || name.includes('hold') || name.includes('pause');
}

/**
 * Categorizes and formats the visual status pill for a development phase.
 */
export function getPhaseStatusInfo(task: TaskItem, stage?: Stage): PhaseStatusInfo {
  if (isPhaseCompleted(task, stage)) {
    return {
      label: 'Completed',
      kind: 'completed',
      color: '#4D6B10',
      bgColor: 'rgba(187, 216, 90, 0.25)',
    };
  }

  if (isPhaseBlocked(stage)) {
    return {
      label: stage?.name || 'Blockade',
      kind: 'blocked',
      color: '#EE8D72',
      bgColor: 'rgba(238, 141, 114, 0.2)',
    };
  }

  const name = (stage?.name || '').toLowerCase().trim();

  if (name.includes('test') || name.includes('qa') || name.includes('review') || name.includes('check')) {
    return {
      label: stage?.name || 'Testing',
      kind: 'testing',
      color: '#B45309',
      bgColor: 'rgba(245, 165, 36, 0.2)',
    };
  }

  if (
    name.includes('work') ||
    name.includes('progress') ||
    name.includes('start') ||
    name.includes('dev') ||
    name.includes('active')
  ) {
    return {
      label: stage?.name || 'Working',
      kind: 'working',
      color: '#2B579A',
      bgColor: 'rgba(141, 179, 222, 0.25)',
    };
  }

  return {
    label: stage?.name || 'Not Started',
    kind: 'not_started',
    color: '#6E7681',
    bgColor: 'rgba(0, 0, 0, 0.06)',
  };
}

export interface DevelopmentProgressResult {
  progress: number;
  completedCount: number;
  totalCount: number;
  hasPhases: boolean;
}

/**
 * Automatic Progress Calculation:
 * Progress = (Number of Completed Phases / Total Number of Phases) * 100
 * - If no phases: hasPhases = false, progress = 0
 * - If all completed: 100%
 */
export function calculateDevelopmentProgress(
  phases: TaskItem[],
  stagesMap: Map<string, Stage>
): DevelopmentProgressResult {
  const totalCount = phases.length;
  if (totalCount === 0) {
    return {
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      hasPhases: false,
    };
  }

  const completedCount = phases.filter((phase) => {
    const stage = stagesMap.get(phase.stage_id);
    return isPhaseCompleted(phase, stage);
  }).length;

  const progress = Math.round((completedCount / totalCount) * 100);

  return {
    progress: Math.min(100, Math.max(0, progress)),
    completedCount,
    totalCount,
    hasPhases: true,
  };
}

/**
 * Determines the currently active development phase being worked on.
 */
export function findCurrentDevelopmentPhase(
  phases: TaskItem[],
  stagesMap: Map<string, Stage>
): TaskItem | null {
  if (phases.length === 0) return null;

  // 1. First look for active working / testing phase
  const activeWorking = phases.find((phase) => {
    const stage = stagesMap.get(phase.stage_id);
    const info = getPhaseStatusInfo(phase, stage);
    return info.kind === 'working' || info.kind === 'testing';
  });
  if (activeWorking) return activeWorking;

  // 2. Next look for first non-completed phase (e.g. next in queue)
  const nextNonCompleted = phases.find((phase) => {
    const stage = stagesMap.get(phase.stage_id);
    return !isPhaseCompleted(phase, stage);
  });
  if (nextNonCompleted) return nextNonCompleted;

  // 3. All completed
  return null;
}

/**
 * Retrieves all development phases that are currently in a blocked state.
 */
export function findBlockerPhases(
  phases: TaskItem[],
  stagesMap: Map<string, Stage>
): Array<{ phase: TaskItem; stage?: Stage }> {
  return phases
    .filter((phase) => {
      const stage = stagesMap.get(phase.stage_id);
      return isPhaseBlocked(stage);
    })
    .map((phase) => ({
      phase,
      stage: stagesMap.get(phase.stage_id),
    }));
}
