export type TabName =
  | 'Projects'
  | 'Departments'
  | 'Stages'
  | 'Tasks'
  | 'Ideas'
  | 'TimeLogs'
  | 'Templates'
  | 'Subtasks'
  | 'Notes'
  | 'Settings'
  | 'Teams'
  | 'Members'
  | 'Messages'
  | 'Leave';

export type ProjectType =
  | 'Project'
  | 'Marketing Campaign'
  | 'Research Campaign'
  | 'Other';

export interface Project {
  id: string;
  parent_id?: string;
  name: string;
  type?: ProjectType | string;
  color?: string; // Indigo, Mint, Amber, Coral, Sky
  status: 'active' | 'completed' | 'on_hold' | 'archived';
  due_date?: string;
  archived: boolean | string | number;
  created_at: string;
}

export interface Department {
  id: string;
  project_id: string;
  parent_id?: string;
  name: string;
  color?: string;
  enabled: boolean | string | number;
  order: number;
}

export type StageKind = 'normal' | 'done' | 'blocked';
export type StageColor = 'sky' | 'lime' | 'coral' | 'sage' | 'peach' | 'charcoal' | string;

export interface Stage {
  id: string;
  department_id: string;
  project_id?: string;
  name: string;
  kind: StageKind;
  color?: StageColor;
  order: number;
  description?: string;
  wip_limit?: number;
  is_archived?: boolean | string | number;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean | string | number;
  order: number;
  created_at: string;
}

export interface TaskNote {
  id: string;
  task_id: string;
  body: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  department_id: string;
  stage_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimate_min: number;
  actual_min: number;
  due_date?: string;
  order: number;
  done_at?: string;
  recurring?: 'none' | 'daily' | 'weekly' | string;
  archived?: boolean | string | number;
  source?: 'template' | 'manual' | 'idea';
  template_id?: string;
  assignee_id?: string;
  assignee_name?: string;
  checklist?: ChecklistItem[] | string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  body: string;
  color?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  z?: number;
  status: 'inbox' | 'promoted' | 'archived';
  project_id?: string;
  department_id?: string;
  stage_id?: string;
  created_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  mode: 'pomodoro' | 'stopwatch' | 'manual';
  start: string;
  end: string;
  duration_min: number;
}

export interface Template {
  id: string;
  department_name: string;
  sub_name: string;
  group_name?: string;
  task_title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimate_min?: number;
  order?: number;
  subtasks?: string; // separated by " | "
}

export interface Setting {
  key: string;
  value: string;
}

export interface Team {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id?: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  created_at: string;
}

export interface MessageItem {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  member_id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  created_at: string;
}

export type TabRecordMap = {
  Projects: Project;
  Departments: Department;
  Stages: Stage;
  Tasks: TaskItem;
  Ideas: Idea;
  TimeLogs: TimeLog;
  Templates: Template;
  Subtasks: Subtask;
  Notes: TaskNote;
  Settings: Setting;
  Teams: Team;
  Members: TeamMember;
  Messages: MessageItem;
  Leave: LeaveRequest;
};

export type SyncStatus = 'synced' | 'syncing' | 'offline';
