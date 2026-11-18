import type { Project, Department, Stage, TaskItem, ProjectType } from '../types';
import { INITIAL_STORAGE } from './mockData';
import { api, isLiveApiConfigured } from './api';

export interface DepartmentSpec {
  name: string;
  color: string;
  subDepartments: string[];
}

export const DEFAULT_DEPARTMENT_SPECS: DepartmentSpec[] = [
  {
    name: 'Tech',
    color: '#5B5BF0',
    subDepartments: ['Design', 'Frontend', 'Backend', 'QA', 'Deployment'],
  },
  {
    name: 'Marketing',
    color: '#3BA7F5',
    subDepartments: ['Sales', 'SEO', 'Social Media', 'SMM', 'Content', 'Email'],
  },
  {
    name: 'HR',
    color: '#2DBE8C',
    subDepartments: ['Recruitment', 'Onboarding', 'Policies'],
  },
  {
    name: 'Finance',
    color: '#F5A524',
    subDepartments: [],
  },
  {
    name: 'Design',
    color: '#F25F5C',
    subDepartments: [],
  },
  {
    name: 'Operations',
    color: '#8B5CF6',
    subDepartments: [],
  },
  {
    name: 'Research',
    color: '#10B981',
    subDepartments: ['Planning', 'Data Collection', 'Analysis', 'Reporting'],
  },
];

export const DEFAULT_STAGES_CONFIG: Array<{
  name: string;
  kind: 'normal' | 'done' | 'blocked';
  color: 'sky' | 'lime' | 'charcoal' | 'coral';
}> = [
  { name: 'Started', kind: 'normal', color: 'sky' },
  { name: 'Middle', kind: 'normal', color: 'lime' },
  { name: 'Ended', kind: 'done', color: 'charcoal' },
  { name: 'Blockade', kind: 'blocked', color: 'coral' },
];

/**
 * Returns default enabled department names by project type:
 * - "Project": Tech and Design ON, others OFF
 * - "Marketing Campaign": Marketing (all subs ON) and Design ON, others OFF
 * - "Research Campaign": Research (all subs ON) ON, others OFF
 * - "Other": all OFF except those user picks
 */
export function getDefaultEnabledDepartmentNames(projectType?: string): string[] {
  switch (projectType as ProjectType) {
    case 'Marketing Campaign':
      return ['Marketing', 'Design'];
    case 'Research Campaign':
      return ['Research'];
    case 'Other':
      return [];
    case 'Project':
    default:
      return ['Tech', 'Design'];
  }
}

const STORAGE_PREFIX = 'flowdesk_local_db_';

function getStoredTable<T>(tab: string): T[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tab}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read ${tab} from localStorage`, e);
  }
  const fallback = ((INITIAL_STORAGE as Record<string, unknown[]>)[tab] || []) as T[];
  setStoredTable(tab, fallback);
  return fallback;
}

function setStoredTable<T>(tab: string, items: T[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tab}`, JSON.stringify(items));
  } catch (e) {
    console.warn(`Failed to write ${tab} to localStorage`, e);
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Auto-creates departments, sub-departments and 4 stages for a project or sub-project.
 * If template tasks exist, loads them into Started for departments that are ON.
 * Can be called with raw storage or safely called from React mutations.
 */
export function autoSetupProjectSync(
  projectId: string,
  projectType: string = 'Project',
  chosenEnabledDepts?: string[]
): { createdDepartmentsCount: number; createdStagesCount: number; createdTasksCount: number } {
  const departments = getStoredTable<Department>('Departments');
  const stages = getStoredTable<Stage>('Stages');
  const tasks = getStoredTable<TaskItem>('Tasks');

  const enabledNames = new Set(
    chosenEnabledDepts && chosenEnabledDepts.length > 0
      ? chosenEnabledDepts
      : getDefaultEnabledDepartmentNames(projectType)
  );

  let newDepartments: Department[] = [...departments];
  let newStages: Stage[] = [...stages];
  let newTasks: TaskItem[] = [...tasks];

  let createdDepts = 0;
  let createdStgs = 0;
  let createdTsks = 0;

  // Process default departments
  DEFAULT_DEPARTMENT_SPECS.forEach((spec, specIdx) => {
    let parentDept = newDepartments.find(
      (d) => d.project_id === projectId && !d.parent_id && d.name.toLowerCase() === spec.name.toLowerCase()
    );

    const isParentEnabled = enabledNames.has(spec.name);

    if (!parentDept) {
      parentDept = {
        id: generateId(`dept_${spec.name.toLowerCase()}`),
        project_id: projectId,
        name: spec.name,
        color: spec.color,
        enabled: isParentEnabled,
        order: specIdx + 1,
      };
      newDepartments.push(parentDept);
      createdDepts++;
    }

    // Ensure parent department has the 4 stages
    const parentStages = newStages.filter((s) => s.department_id === parentDept!.id);
    if (parentStages.length === 0) {
      DEFAULT_STAGES_CONFIG.forEach((sc, scIdx) => {
        const stageId = generateId(`stg_${parentDept!.id}_${sc.name.toLowerCase()}`);
        const stg: Stage = {
          id: stageId,
          department_id: parentDept!.id,
          name: sc.name,
          color: sc.color,
          kind: sc.kind,
          order: scIdx + 1,
        };
        newStages.push(stg);
        createdStgs++;
      });
    }

    // Process sub-departments
    spec.subDepartments.forEach((subName, subIdx) => {
      let subDept = newDepartments.find(
        (d) =>
          d.project_id === projectId &&
          d.parent_id === parentDept!.id &&
          d.name.toLowerCase() === subName.toLowerCase()
      );

      // Sub-departments inherit parent enabled state
      const isSubEnabled = isParentEnabled;

      if (!subDept) {
        subDept = {
          id: generateId(`subdept_${subName.toLowerCase().replace(/\s+/g, '_')}`),
          project_id: projectId,
          parent_id: parentDept!.id,
          name: subName,
          color: spec.color,
          enabled: isSubEnabled,
          order: subIdx + 1,
        };
        newDepartments.push(subDept);
        createdDepts++;
      }

      // Ensure sub-department has 4 stages
      const subStages = newStages.filter((s) => s.department_id === subDept!.id);
      if (subStages.length === 0) {
        DEFAULT_STAGES_CONFIG.forEach((sc, scIdx) => {
          const stageId = generateId(`stg_${subDept!.id}_${sc.name.toLowerCase()}`);
          const stg: Stage = {
            id: stageId,
            department_id: subDept!.id,
            name: sc.name,
            color: sc.color,
            kind: sc.kind,
            order: scIdx + 1,
          };
          newStages.push(stg);
          createdStgs++;
        });
      }
    });
  });

  // Persist if any additions occurred
  if (createdDepts > 0) {
    setStoredTable('Departments', newDepartments);
  }
  if (createdStgs > 0) {
    setStoredTable('Stages', newStages);
  }
  if (createdTsks > 0) {
    setStoredTable('Tasks', newTasks);
  }

  return {
    createdDepartmentsCount: createdDepts,
    createdStagesCount: createdStgs,
    createdTasksCount: createdTsks,
  };
}

/**
 * Async auto-setup that provisions departments & stages and syncs them to Google Sheets
 * if the live API is configured.
 */
export async function autoSetupProject(
  projectId: string,
  projectType: string = 'Project',
  chosenEnabledDepts?: string[]
): Promise<{ createdDepartmentsCount: number; createdStagesCount: number; createdTasksCount: number }> {
  const syncRes = autoSetupProjectSync(projectId, projectType, chosenEnabledDepts);

  if (isLiveApiConfigured && (syncRes.createdDepartmentsCount > 0 || syncRes.createdStagesCount > 0)) {
    try {
      const allDepts = getStoredTable<Department>('Departments');
      const projDepts = allDepts.filter((d) => d.project_id === projectId);
      const projDeptIds = new Set(projDepts.map((d) => d.id));
      const allStages = getStoredTable<Stage>('Stages');
      const projStages = allStages.filter((s) => projDeptIds.has(s.department_id));

      if (projDepts.length > 0) {
        await api.batchUpdate('Departments', projDepts);
      }
      if (projStages.length > 0) {
        await api.batchUpdate('Stages', projStages);
      }
    } catch (err) {
      console.warn('Failed to sync auto-setup departments/stages to remote API:', err);
    }
  }

  return syncRes;
}

/**
 * Idempotent repair for every existing project or sub-project that has no departments or missing stages.
 * Never deletes or duplicates existing departments, stages, or tasks.
 */
export function repairEmptyProjects(force = false): {
  repairedProjectsCount: number;
  totalNewDepartments: number;
  totalNewStages: number;
  totalNewTasks: number;
} {
  const REPAIR_KEY = 'flowdesk_projects_repaired_v3';
  if (!force && localStorage.getItem(REPAIR_KEY) === 'true') {
    return {
      repairedProjectsCount: 0,
      totalNewDepartments: 0,
      totalNewStages: 0,
      totalNewTasks: 0,
    };
  }

  const projects = getStoredTable<Project>('Projects');

  let repairedProjects = 0;
  let totalNewDepts = 0;
  let totalNewStgs = 0;
  let totalNewTsks = 0;

  projects.forEach((proj) => {
    const currentDepts = getStoredTable<Department>('Departments');
    const projDepts = currentDepts.filter((d) => d.project_id === proj.id);
    if (projDepts.length === 0) {
      const res = autoSetupProjectSync(proj.id, proj.type || 'Project');
      repairedProjects++;
      totalNewDepts += res.createdDepartmentsCount;
      totalNewStgs += res.createdStagesCount;
      totalNewTsks += res.createdTasksCount;
    } else {
      // Check if existing departments are missing default stages
      const res = autoSetupProjectSync(proj.id, proj.type || 'Project');
      if (res.createdDepartmentsCount > 0 || res.createdStagesCount > 0) {
        repairedProjects++;
        totalNewDepts += res.createdDepartmentsCount;
        totalNewStgs += res.createdStagesCount;
        totalNewTsks += res.createdTasksCount;
      }
    }
  });

  localStorage.setItem(REPAIR_KEY, 'true');

  if (isLiveApiConfigured && (totalNewDepts > 0 || totalNewStgs > 0)) {
    const allDepts = getStoredTable<Department>('Departments');
    const allStages = getStoredTable<Stage>('Stages');
    api.batchUpdate('Departments', allDepts).catch(() => {});
    api.batchUpdate('Stages', allStages).catch(() => {});
  }

  return {
    repairedProjectsCount: repairedProjects,
    totalNewDepartments: totalNewDepts,
    totalNewStages: totalNewStgs,
    totalNewTasks: totalNewTsks,
  };
}

/**
 * Restores missing default departments, sub-departments, and the 4 stages
 * for a project or all projects without duplicating existing ones or auto-loading tasks.
 */
export function restoreDefaultDepartments(projectId?: string): {
  restoredDepartmentsCount: number;
  restoredStagesCount: number;
} {
  const projects = getStoredTable<Project>('Projects');
  const targetProjects = projectId
    ? projects.filter((p) => p.id === projectId)
    : projects;

  let restoredDepts = 0;
  let restoredStgs = 0;

  targetProjects.forEach((proj) => {
    const res = autoSetupProjectSync(proj.id, proj.type || 'Project');
    restoredDepts += res.createdDepartmentsCount;
    restoredStgs += res.createdStagesCount;
  });

  if (isLiveApiConfigured && (restoredDepts > 0 || restoredStgs > 0)) {
    const allDepts = getStoredTable<Department>('Departments');
    const allStages = getStoredTable<Stage>('Stages');
    api.batchUpdate('Departments', allDepts).catch(() => {});
    api.batchUpdate('Stages', allStages).catch(() => {});
  }

  return {
    restoredDepartmentsCount: restoredDepts,
    restoredStagesCount: restoredStgs,
  };
}
