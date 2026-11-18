import { SEED_TEMPLATES } from './templates';
import { createDefaultStagesForDepartment } from './stages';
import type { ProjectType, StageKind, Project, Department, Stage, TaskItem } from '../types';

export interface PreMadeProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  color: string;
  departments: {
    name: string;
    color: string;
    subDepartments: string[];
  }[];
}

export const PREMADE_PROJECT_TEMPLATES: PreMadeProjectTemplate[] = [
  {
    id: 'tmpl_saas_launch',
    name: 'SaaS Launch',
    description: 'Full stack product development, landing page SEO, marketing push, and onboarding.',
    type: 'Project',
    color: '#CDD6A6',
    departments: [
      {
        name: 'Tech',
        color: '#CDD6A6',
        subDepartments: ['Design', 'Frontend', 'Backend', 'QA', 'Deployment'],
      },
      {
        name: 'Marketing',
        color: '#BFD3E6',
        subDepartments: ['SEO', 'Content', 'Social Media', 'Email'],
      },
      {
        name: 'HR',
        color: '#F2D5C4',
        subDepartments: ['Onboarding', 'Recruitment'],
      },
    ],
  },
  {
    id: 'tmpl_marketing_campaign',
    name: 'Marketing Campaign',
    description: 'Omni-channel marketing machine with SEO, Sales outreach, Paid Ads, and Email sequences.',
    type: 'Marketing Campaign',
    color: '#BFD3E6',
    departments: [
      {
        name: 'Marketing',
        color: '#BFD3E6',
        subDepartments: ['SEO', 'Sales', 'Social Media', 'SMM', 'Content', 'Email'],
      },
    ],
  },
  {
    id: 'tmpl_content_machine',
    name: 'Content Machine',
    description: 'Long-form pillar content, weekly newsletter distribution, social media repurposing.',
    type: 'Marketing Campaign',
    color: '#F2D5C4',
    departments: [
      {
        name: 'Marketing',
        color: '#BFD3E6',
        subDepartments: ['Content', 'Social Media', 'SEO', 'Email'],
      },
    ],
  },
  {
    id: 'tmpl_product_sprint',
    name: 'Product Sprint',
    description: 'Rapid product feature iteration: UI/UX prototype, Frontend, Backend API, and QA audit.',
    type: 'Project',
    color: '#C6F432',
    departments: [
      {
        name: 'Tech',
        color: '#CDD6A6',
        subDepartments: ['Design', 'Frontend', 'Backend', 'QA'],
      },
    ],
  },
];

const CUSTOM_PROJECT_TEMPLATES_KEY = 'flowdesk_custom_project_templates';

export interface SavedProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  color: string;
  savedAt: string;
  departments: {
    name: string;
    color: string;
    subDepartments: string[];
    stages: { name: string; kind: StageKind; order: number }[];
    tasks: { title: string; priority: string; estimate_min: number }[];
  }[];
}

export function getCustomProjectTemplates(): SavedProjectTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROJECT_TEMPLATES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load custom project templates', err);
  }
  return [];
}

export function saveProjectAsTemplate(
  projectName: string,
  templateName: string,
  projectType: ProjectType,
  projectColor: string,
  projectDepts: { id: string; name: string; color?: string; parent_id?: string }[],
  stages: { id: string; department_id: string; name: string; kind: StageKind; order: number }[],
  tasks: { department_id: string; title: string; priority: string; estimate_min?: number }[]
): SavedProjectTemplate {
  const parents = projectDepts.filter((d) => !d.parent_id);

  const deptData = parents.map((p) => {
    const subs = projectDepts.filter((d) => d.parent_id === p.id);
    const pStages = stages.filter((s) => s.department_id === p.id);
    const pTasks = tasks.filter((t) => t.department_id === p.id);

    return {
      name: p.name,
      color: p.color || '#5B5BF0',
      subDepartments: subs.map((s) => s.name),
      stages: pStages.map((s) => ({ name: s.name, kind: s.kind, order: s.order })),
      tasks: pTasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        estimate_min: t.estimate_min || 30,
      })),
    };
  });

  const newTemplate: SavedProjectTemplate = {
    id: `custom_tmpl_${Date.now()}`,
    name: templateName.trim() || `${projectName} Template`,
    description: `Saved from project "${projectName}" on ${new Date().toLocaleDateString()}`,
    type: projectType,
    color: projectColor,
    savedAt: new Date().toISOString(),
    departments: deptData,
  };

  const existing = getCustomProjectTemplates();
  const updated = [newTemplate, ...existing];
  try {
    localStorage.setItem(CUSTOM_PROJECT_TEMPLATES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save project template', err);
  }

  return newTemplate;
}

/**
 * Instantiate a project from a pre-made or custom template
 */
export async function instantiateProjectTemplate({
  template,
  projectName,
  dueDate,
  createProject,
  createDepartment,
  createStage,
  createTask,
}: {
  template: PreMadeProjectTemplate | SavedProjectTemplate;
  projectName: string;
  dueDate?: string;
  createProject: (row: Partial<Project>) => Promise<Project>;
  createDepartment: (row: Partial<Department>) => Promise<Department>;
  createStage: (row: Partial<Stage>) => Promise<Stage>;
  createTask: (row: Partial<TaskItem>) => Promise<TaskItem>;
}): Promise<Project> {
  const createdProject = await createProject({
    name: projectName.trim() || template.name,
    type: template.type,
    color: template.color,
    status: 'active',
    archived: false,
    due_date: dueDate || new Date(Date.now() + 86400000 * 14).toISOString(),
    created_at: new Date().toISOString(),
  });

  for (let deptIdx = 0; deptIdx < template.departments.length; deptIdx++) {
    const deptInfo = template.departments[deptIdx];
    const createdParentDept = await createDepartment({
      project_id: createdProject.id,
      name: deptInfo.name,
      color: deptInfo.color,
      enabled: true,
      order: deptIdx + 1,
    });

    // Create 4 default stages for parent department
    const parentStages = createDefaultStagesForDepartment(createdParentDept.id);
    let parentStartedStageId = '';
    for (const stg of parentStages) {
      const createdStg = await createStage(stg);
      if (stg.kind === 'normal' && !parentStartedStageId) {
        parentStartedStageId = createdStg.id;
      }
    }

    // Populate parent tasks if any
    const parentSeedTasks = SEED_TEMPLATES.filter(
      (t) => t.department_name.toLowerCase() === deptInfo.name.toLowerCase() && !t.sub_name
    );
    for (let taskIdx = 0; taskIdx < parentSeedTasks.length; taskIdx++) {
      const tmplTask = parentSeedTasks[taskIdx];
      await createTask({
        project_id: createdProject.id,
        department_id: createdParentDept.id,
        stage_id: parentStartedStageId,
        title: tmplTask.task_title,
        priority: tmplTask.priority,
        estimate_min: tmplTask.estimate_min,
        actual_min: 0,
        order: taskIdx + 1,
        created_at: new Date().toISOString(),
      });
    }

    // Create sub-departments if any
    if (deptInfo.subDepartments) {
      for (let subIdx = 0; subIdx < deptInfo.subDepartments.length; subIdx++) {
        const subName = deptInfo.subDepartments[subIdx];
        const createdSubDept = await createDepartment({
          project_id: createdProject.id,
          parent_id: createdParentDept.id,
          name: subName,
          color: deptInfo.color,
          enabled: true,
          order: subIdx + 1,
        });

        // Create 4 default stages for each sub-department
        const subStages = createDefaultStagesForDepartment(createdSubDept.id);
        let subStartedStageId = '';
        for (const stg of subStages) {
          const createdStg = await createStage(stg);
          if (stg.kind === 'normal' && !subStartedStageId) {
            subStartedStageId = createdStg.id;
          }
        }

        // Populate sub-department tasks from SEED_TEMPLATES
        const subSeedTasks = SEED_TEMPLATES.filter(
          (t) =>
            t.sub_name.toLowerCase() === subName.toLowerCase() ||
            (t.department_name.toLowerCase() === deptInfo.name.toLowerCase() &&
              t.sub_name.toLowerCase() === subName.toLowerCase())
        );

        for (let taskIdx = 0; taskIdx < subSeedTasks.length; taskIdx++) {
          const tmplTask = subSeedTasks[taskIdx];
          await createTask({
            project_id: createdProject.id,
            department_id: createdSubDept.id,
            stage_id: subStartedStageId,
            title: tmplTask.task_title,
            priority: tmplTask.priority,
            estimate_min: tmplTask.estimate_min,
            actual_min: 0,
            order: taskIdx + 1,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return createdProject;
}
