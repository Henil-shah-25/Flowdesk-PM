import type { Project, TaskItem, Department, Stage } from '../types';

export type HealthStatus = 'mint' | 'amber' | 'coral';

export interface HealthResult {
  status: HealthStatus;
  label: string;
  reason: string;
  overdueCount: number;
  blockedCount: number;
  progressPercent: number;
  timeElapsedPercent: number;
}

/**
 * Computes project health based on:
 * 1. Overdue tasks: any uncompleted task past its due date flags Coral immediately.
 * 2. Blocked tasks: tasks in stages with kind='blocked' count as blocked.
 * 3. Progress vs. Time Elapsed:
 *    - Tasks in kind='done' stages count as completed.
 *    - If project due date has passed with remaining tasks -> Coral (overdue).
 *    - If task progress lags significantly behind the percentage of time elapsed (>25% gap) -> Amber (slipping).
 *    - If any tasks are blocked -> Amber or Coral.
 *    - Otherwise -> Mint (on track).
 * Note: Tasks belonging to disabled departments are excluded from calculation.
 */
export function computeProjectHealth(
  project: Project,
  tasks: TaskItem[] = [],
  departments: Department[] = [],
  stages: Stage[] = []
): HealthResult {
  const now = new Date().getTime();

  // Filter departments: map of enabled departments
  const disabledDeptIds = new Set<string>();
  departments.forEach((dept) => {
    const isEnabled = dept.enabled === true || dept.enabled === 'true' || dept.enabled === 1 || dept.enabled === '1';
    if (!isEnabled) {
      disabledDeptIds.add(dept.id);
    }
  });

  // Also disable sub-departments whose parent is disabled
  departments.forEach((dept) => {
    if (dept.parent_id && disabledDeptIds.has(dept.parent_id)) {
      disabledDeptIds.add(dept.id);
    }
  });

  // Stage lookup: id -> stage
  const stageMap = new Map<string, Stage>();
  stages.forEach((stg) => stageMap.set(stg.id, stg));

  // Relevant tasks (only from enabled departments or project tasks)
  const activeTasks = tasks.filter((t) => !t.department_id || !disabledDeptIds.has(t.department_id));

  const totalTasks = activeTasks.length;

  // Done tasks: stage has kind='done' OR task has done_at
  const completedTasks = activeTasks.filter((t) => {
    const stg = t.stage_id ? stageMap.get(t.stage_id) : undefined;
    return Boolean(t.done_at) || stg?.kind === 'done';
  }).length;

  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Blocked tasks: stage has kind='blocked'
  const blockedTasks = activeTasks.filter((t) => {
    const stg = t.stage_id ? stageMap.get(t.stage_id) : undefined;
    return stg?.kind === 'blocked';
  });
  const blockedCount = blockedTasks.length;

  // Overdue tasks: uncompleted task past due date
  const overdueTasks = activeTasks.filter((t) => {
    const stg = t.stage_id ? stageMap.get(t.stage_id) : undefined;
    if (t.done_at || stg?.kind === 'done') return false;
    if (!t.due_date) return false;
    const dueTime = new Date(t.due_date).getTime();
    return !isNaN(dueTime) && dueTime < now;
  });

  const overdueCount = overdueTasks.length;

  // Time elapsed ratio
  const createdAt = project.created_at ? new Date(project.created_at).getTime() : now - 86400000 * 7;
  const dueDate = project.due_date ? new Date(project.due_date).getTime() : null;

  let timeElapsedPercent = 0;
  let isProjectDueDatePassed = false;

  if (dueDate && dueDate > createdAt) {
    const totalDuration = dueDate - createdAt;
    const elapsed = now - createdAt;
    timeElapsedPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    isProjectDueDatePassed = now > dueDate && progressPercent < 100;
  }

  // Determine health
  if (isProjectDueDatePassed || overdueCount > 0) {
    return {
      status: 'coral',
      label: 'Overdue',
      reason: overdueCount > 0 ? `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}` : 'Past project due date',
      overdueCount,
      blockedCount,
      progressPercent,
      timeElapsedPercent,
    };
  }

  // Blocked tasks cause Slipping or Alert
  if (blockedCount > 0) {
    return {
      status: 'amber',
      label: 'Blocked',
      reason: `${blockedCount} task${blockedCount > 1 ? 's' : ''} in blockade`,
      overdueCount: 0,
      blockedCount,
      progressPercent,
      timeElapsedPercent,
    };
  }

  // Slipping check: time elapsed is significant and progress is lagging by >25%
  if (timeElapsedPercent > 30 && progressPercent < timeElapsedPercent - 25) {
    return {
      status: 'amber',
      label: 'Slipping',
      reason: `Progress (${Math.round(progressPercent)}%) behind schedule (${Math.round(timeElapsedPercent)}%)`,
      overdueCount: 0,
      blockedCount: 0,
      progressPercent,
      timeElapsedPercent,
    };
  }

  return {
    status: 'mint',
    label: 'On Track',
    reason: totalTasks === 0 ? 'No open blocker' : `${completedTasks}/${totalTasks} tasks complete`,
    overdueCount: 0,
    blockedCount: 0,
    progressPercent,
    timeElapsedPercent,
  };
}
