import type { Stage, TaskItem, Department, StageColor } from '../types';
import { INITIAL_MOCK_TEMPLATES } from './templates';

export function createDefaultStagesForDepartment(departmentId: string): Stage[] {
  return [
    {
      id: `stg_${departmentId}_started`,
      department_id: departmentId,
      name: 'Started',
      kind: 'normal',
      color: 'sky',
      order: 1,
    },
    {
      id: `stg_${departmentId}_middle`,
      department_id: departmentId,
      name: 'Middle',
      kind: 'normal',
      color: 'lime',
      order: 2,
    },
    {
      id: `stg_${departmentId}_ended`,
      department_id: departmentId,
      name: 'Ended',
      kind: 'done',
      color: 'charcoal',
      order: 3,
    },
    {
      id: `stg_${departmentId}_blockade`,
      department_id: departmentId,
      name: 'Blockade',
      kind: 'blocked',
      color: 'coral',
      order: 4,
    },
  ];
}

export function getDefaultStageColor(name: string, kind?: string): StageColor {
  const n = name.toLowerCase();
  if (n.includes('started') || n.includes('to do') || n.includes('backlog') || n.includes('ideation')) return 'sky';
  if (n.includes('middle') || n.includes('writing') || n.includes('progress') || n.includes('review')) return 'lime';
  if (n.includes('ended') || n.includes('done') || n.includes('complete') || kind === 'done') return 'charcoal';
  if (n.includes('block') || kind === 'blocked') return 'coral';
  return 'sage';
}

/**
 * Backfill stage colors in local database if missing
 */
export function backfillStageColorsIfNeeded(): void {
  try {
    const rawStages = localStorage.getItem('flowdesk_local_db_Stages');
    if (!rawStages) return;

    const stages: Stage[] = JSON.parse(rawStages);
    let changed = false;
    const updated = stages.map((s) => {
      if (!s.color) {
        changed = true;
        return {
          ...s,
          color: getDefaultStageColor(s.name, s.kind),
        };
      }
      return s;
    });

    if (changed) {
      localStorage.setItem('flowdesk_local_db_Stages', JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Failed to backfill stage colors', e);
  }
}

/**
 * Executes a one-time migration to standardize all pipelines on the 4 default stages:
 * Started (normal), Middle (normal), Ended (done), Blockade (blocked)
 * and remaps existing tasks without losing any data.
 */
export function migrateExistingDataIfNeeded(): void {
  try {
    const MIGRATION_KEY = 'flowdesk_stages_v2_migrated';
    if (localStorage.getItem(MIGRATION_KEY) === 'true') {
      return;
    }

    const rawDepts = localStorage.getItem('flowdesk_local_db_Departments');
    const rawTasks = localStorage.getItem('flowdesk_local_db_Tasks');
    const rawStages = localStorage.getItem('flowdesk_local_db_Stages');

    if (!rawDepts) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const departments: Department[] = JSON.parse(rawDepts);
    const tasks: TaskItem[] = rawTasks ? JSON.parse(rawTasks) : [];
    const oldStages: Stage[] = rawStages ? JSON.parse(rawStages) : [];

    // Map old stage ID to its old name
    const oldStageNameMap = new Map<string, string>();
    oldStages.forEach((s) => {
      oldStageNameMap.set(s.id, s.name.toLowerCase());
    });

    const newStagesList: Stage[] = [];
    const deptStageMap = new Map<string, { started: string; middle: string; ended: string; blockade: string }>();

    departments.forEach((dept) => {
      const defaultStages = createDefaultStagesForDepartment(dept.id);
      newStagesList.push(...defaultStages);
      deptStageMap.set(dept.id, {
        started: defaultStages[0].id,
        middle: defaultStages[1].id,
        ended: defaultStages[2].id,
        blockade: defaultStages[3].id,
      });
    });

    // Remap tasks
    const updatedTasks = tasks.map((task) => {
      const deptStages = deptStageMap.get(task.department_id);
      if (!deptStages) {
        return task;
      }

      const oldStageName = task.stage_id ? oldStageNameMap.get(task.stage_id) || '' : '';

      // Classification rule:
      // Done/Completed/Shipped -> Ended
      // In Progress/Review/Copywriting/Active Campaign/Figma System -> Middle
      // Backlog/To Do/Ideation/Exploration -> Started
      let targetStageId = deptStages.started;

      if (
        Boolean(task.done_at) ||
        oldStageName.includes('done') ||
        oldStageName.includes('complete') ||
        oldStageName.includes('shipped')
      ) {
        targetStageId = deptStages.ended;
      } else if (
        oldStageName.includes('progress') ||
        oldStageName.includes('review') ||
        oldStageName.includes('copywriting') ||
        oldStageName.includes('campaign') ||
        oldStageName.includes('figma')
      ) {
        targetStageId = deptStages.middle;
      } else if (oldStageName.includes('block')) {
        targetStageId = deptStages.blockade;
      } else {
        targetStageId = deptStages.started;
      }

      return {
        ...task,
        stage_id: targetStageId,
      };
    });

    // Write back
    localStorage.setItem('flowdesk_local_db_Stages', JSON.stringify(newStagesList));
    localStorage.setItem('flowdesk_local_db_Tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('flowdesk_local_db_Templates', JSON.stringify(INITIAL_MOCK_TEMPLATES));
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Flowdesk v2 stages migration completed successfully.');
  } catch (err) {
    console.warn('Migration error:', err);
  }
}
