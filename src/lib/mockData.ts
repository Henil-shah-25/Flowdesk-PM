import type {
  Project,
  Department,
  Stage,
  TaskItem,
  Idea,
  TimeLog,
  Template,
  Setting,
} from '../types';
import { INITIAL_MOCK_TEMPLATES } from './templates';
import { createDefaultStagesForDepartment } from './stages';

export const initialMockProjects: Project[] = [
  {
    id: 'proj_1',
    name: 'Flowdesk Foundation',
    type: 'Project',
    color: '#CDD6A6', // Sage
    status: 'active',
    due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
    archived: false,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'subproj_1',
    parent_id: 'proj_1',
    name: 'Product Hunt Launch Campaign',
    type: 'Marketing Campaign',
    color: '#BFD3E6', // Sky
    status: 'active',
    due_date: new Date(Date.now() + 86400000 * 6).toISOString(),
    archived: false,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'subproj_2',
    parent_id: 'proj_1',
    name: 'User Onboarding Research',
    type: 'Research Campaign',
    color: '#F2D5C4', // Peach
    status: 'active',
    due_date: new Date(Date.now() + 86400000 * 14).toISOString(),
    archived: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'proj_2',
    name: 'Brand Identity & Guidelines',
    type: 'Project',
    color: '#CDD6A6', // Sage
    status: 'active',
    due_date: new Date(Date.now() + 86400000 * 14).toISOString(),
    archived: false,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'proj_3',
    name: 'Q3 Mobile Beta',
    type: 'Project',
    color: '#F5A524', // Amber
    status: 'active',
    due_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    archived: false,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString()
  }
];

export const initialMockDepartments: Department[] = [
  // Tech
  {
    id: 'dept_tech',
    project_id: 'proj_1',
    name: 'Tech',
    color: '#CDD6A6',
    enabled: true,
    order: 1
  },
  // Marketing & Sub-departments
  {
    id: 'dept_mkt',
    project_id: 'proj_1',
    name: 'Marketing',
    color: '#BFD3E6',
    enabled: true,
    order: 2
  },
  {
    id: 'dept_mkt_sales',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'Sales',
    color: '#BFD3E6',
    enabled: true,
    order: 1
  },
  {
    id: 'dept_mkt_seo',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'SEO',
    color: '#BFD3E6',
    enabled: true,
    order: 2
  },
  {
    id: 'dept_mkt_social',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'Social Media',
    color: '#BFD3E6',
    enabled: true,
    order: 3
  },
  {
    id: 'dept_mkt_smm',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'SMM',
    color: '#BFD3E6',
    enabled: false,
    order: 4
  },
  {
    id: 'dept_mkt_content',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'Content',
    color: '#BFD3E6',
    enabled: true,
    order: 5
  },
  {
    id: 'dept_mkt_email',
    project_id: 'proj_1',
    parent_id: 'dept_mkt',
    name: 'Email',
    color: '#BFD3E6',
    enabled: true,
    order: 6
  },
  // HR
  {
    id: 'dept_hr',
    project_id: 'proj_1',
    name: 'HR',
    color: '#F2D5C4',
    enabled: true,
    order: 3
  },
  // Finance
  {
    id: 'dept_fin',
    project_id: 'proj_1',
    name: 'Finance',
    color: '#F5A524',
    enabled: true,
    order: 4
  },
  // Design
  {
    id: 'dept_design',
    project_id: 'proj_1',
    name: 'Design',
    color: '#CDD6A6',
    enabled: true,
    order: 5
  },
  // Operations
  {
    id: 'dept_ops',
    project_id: 'proj_1',
    name: 'Operations',
    color: '#BFD3E6',
    enabled: true,
    order: 6
  }
];

// Generate default 4 stages (Started, Middle, Ended, Blockade) for every department & sub-department
export const initialMockStages: Stage[] = initialMockDepartments.flatMap((dept) =>
  createDefaultStagesForDepartment(dept.id)
);

export const initialMockTasks: TaskItem[] = [
  // Tech tasks
  {
    id: 'task_1',
    project_id: 'proj_1',
    department_id: 'dept_tech',
    stage_id: 'stg_dept_tech_middle',
    title: 'Implement Pipeline Board & Stage Editing',
    description: 'Ensure drag-and-drop with @dnd-kit, inline stage renaming, and task drawer works.',
    priority: 'high',
    estimate_min: 120,
    actual_min: 60,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    order: 1,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    checklist: [
      { id: 'c1', text: 'Column headers with count and indicator', completed: true },
      { id: 'c2', text: 'Inline rename on stage title', completed: true },
      { id: 'c3', text: 'Checklist subtasks in detail drawer', completed: false },
    ],
    linked_project_id: 'subproj_1',
    linked_task_id: 'task_5'
  },
  {
    id: 'task_2',
    project_id: 'proj_1',
    department_id: 'dept_tech',
    stage_id: 'stg_dept_tech_ended',
    title: 'Google Apps Script text/plain sync',
    description: 'Verify CORS preflight-free POST dispatcher.',
    priority: 'medium',
    estimate_min: 60,
    actual_min: 60,
    due_date: new Date(Date.now() - 86400000).toISOString(),
    done_at: new Date().toISOString(),
    order: 2,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  // Marketing / SEO tasks
  {
    id: 'task_3',
    project_id: 'proj_1',
    department_id: 'dept_mkt_seo',
    stage_id: 'stg_dept_mkt_seo_middle',
    title: 'On-page: Keyword research & search intent mapping',
    description: 'Optimize metadata for personal project management search intents.',
    priority: 'medium',
    estimate_min: 75,
    actual_min: 30,
    due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
    order: 1,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'task_4',
    project_id: 'proj_1',
    department_id: 'dept_mkt_content',
    stage_id: 'stg_dept_mkt_content_ended',
    title: 'Flowdesk Announcement Blog Post',
    description: 'Draft walkthrough highlighting zero-gradient glassmorphism.',
    priority: 'low',
    estimate_min: 90,
    actual_min: 90,
    due_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    done_at: new Date().toISOString(),
    order: 2,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  // Sub-project tasks
  {
    id: 'task_5',
    project_id: 'subproj_1',
    department_id: 'dept_mkt',
    stage_id: 'stg_dept_mkt_started',
    title: 'Prepare Product Hunt Maker Assets',
    description: 'Generate square icons, gallery screenshots, and maker comment.',
    priority: 'urgent',
    estimate_min: 150,
    actual_min: 0,
    due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    order: 1,
    created_at: new Date().toISOString()
  },
  // Overdue task for proj_3
  {
    id: 'task_6',
    project_id: 'proj_3',
    department_id: 'dept_tech',
    stage_id: 'stg_dept_tech_started',
    title: 'Beta feedback survey distribution',
    description: 'Needs immediate review.',
    priority: 'urgent',
    estimate_min: 45,
    actual_min: 0,
    due_date: new Date(Date.now() - 86400000 * 3).toISOString(),
    order: 1,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString()
  }
];

export const initialMockIdeas: Idea[] = [
  {
    id: 'idea_1',
    title: 'Daily Micro-Habit Streak Widget',
    body: 'Integrate a quiet, 3-circle completion tracker in the Today tab.',
    color: '#9CC0E8', // Sky
    x: 80,
    y: 80,
    w: 220,
    h: 220,
    rotation: -1.5,
    z: 1,
    status: 'inbox',
    project_id: 'proj_1',
    created_at: new Date().toISOString()
  },
  {
    id: 'idea_2',
    title: 'Focus Audio Soundscapes',
    body: 'Soft brown noise / rain audio toggle right inside the timer.',
    color: '#B4C58E', // Sage
    x: 340,
    y: 110,
    w: 220,
    h: 220,
    rotation: 2.1,
    z: 2,
    status: 'inbox',
    created_at: new Date().toISOString()
  }
];

export const initialMockTimeLogs: TimeLog[] = [
  {
    id: 'log_1',
    task_id: 'task_1',
    project_id: 'proj_1',
    mode: 'pomodoro',
    start: new Date(Date.now() - 86400000 * 2).toISOString(),
    end: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    duration_min: 60
  },
  {
    id: 'log_2',
    task_id: 'task_2',
    project_id: 'proj_1',
    mode: 'pomodoro',
    start: new Date(Date.now() - 86400000 * 5).toISOString(),
    end: new Date(Date.now() - 86400000 * 5 + 5400000).toISOString(),
    duration_min: 90
  },
  {
    id: 'log_3',
    task_id: 'task_3',
    project_id: 'proj_1',
    mode: 'pomodoro',
    start: new Date(Date.now() - 86400000 * 12).toISOString(),
    end: new Date(Date.now() - 86400000 * 12 + 7200000).toISOString(),
    duration_min: 120
  },
  {
    id: 'log_4',
    task_id: 'task_1',
    project_id: 'proj_2',
    mode: 'stopwatch',
    start: new Date(Date.now() - 86400000 * 25).toISOString(),
    end: new Date(Date.now() - 86400000 * 25 + 9000000).toISOString(),
    duration_min: 150
  },
  {
    id: 'log_5',
    task_id: 'task_2',
    project_id: 'proj_1',
    mode: 'pomodoro',
    start: new Date(Date.now() - 86400000 * 45).toISOString(),
    end: new Date(Date.now() - 86400000 * 45 + 10800000).toISOString(),
    duration_min: 180
  },
  {
    id: 'log_6',
    task_id: 'task_4',
    project_id: 'proj_3',
    mode: 'pomodoro',
    start: new Date(Date.now() - 86400000 * 70).toISOString(),
    end: new Date(Date.now() - 86400000 * 70 + 7200000).toISOString(),
    duration_min: 120
  }
];

export const initialMockTemplates: Template[] = INITIAL_MOCK_TEMPLATES;

export const initialMockSettings: Setting[] = [
  { key: 'theme', value: 'light' },
  { key: 'pomodoro_duration', value: '25' },
  { key: 'short_break', value: '5' },
  { key: 'long_break', value: '15' }
];

export const INITIAL_STORAGE: Record<string, unknown[]> = {
  Projects: [],
  Departments: [],
  Stages: [],
  Tasks: [],
  Ideas: [],
  TimeLogs: [],
  Templates: [],
  Subtasks: [],
  Notes: [],
  Settings: initialMockSettings,
  Teams: [],
  Members: [],
  Messages: [],
  Leave: []
};
