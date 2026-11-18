import { QueryClient } from '@tanstack/react-query';
import { api, generateLocalId } from './api';
import type { TaskItem, Project, Department, Stage } from '../types';

export interface CreateTaskOptions {
  title: string;
  projectId?: string;
  departmentId?: string;
  stageId?: string;
  assigneeId?: string;
  priority?: TaskItem['priority'];
  estimateMin?: number;
  dueDate?: string;
  description?: string;
  source?: 'manual' | 'template' | 'idea';
}

export interface ResolvedTaskContext {
  projectId: string;
  departmentId: string;
  stageId: string;
}

/**
 * Validates and safely resolves project_id, department_id, and stage_id.
 * Ensures the task will never become an orphaned record that disappears from the pipeline.
 */
export function resolveTaskContext({
  projectId,
  departmentId,
  stageId,
  projects,
  departments,
  stages,
}: {
  projectId?: string;
  departmentId?: string;
  stageId?: string;
  projects: Project[];
  departments: Department[];
  stages: Stage[];
}): ResolvedTaskContext {
  // 1. Resolve Project
  let validProject = projects.find((p) => p.id === projectId && !p.archived);
  if (!validProject) {
    validProject = projects.find((p) => !p.archived) || projects[0];
  }
  const resolvedProjectId = validProject ? validProject.id : (projectId || '');

  // 2. Resolve Department within the project
  const projectDepartments = departments.filter((d) => d.project_id === resolvedProjectId);
  let validDepartment = projectDepartments.find((d) => d.id === departmentId);
  if (!validDepartment) {
    // Pick the first enabled department, or any department in the project
    validDepartment = projectDepartments.find(
      (d) => d.enabled !== false && d.enabled !== 'false' && d.enabled !== 0
    ) || projectDepartments[0];
  }
  const resolvedDeptId = validDepartment ? validDepartment.id : (departmentId || departments[0]?.id || '');

  // 3. Resolve Stage within the department
  const deptStages = stages
    .filter((s) => s.department_id === resolvedDeptId)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  let validStage = deptStages.find((s) => s.id === stageId);
  if (!validStage) {
    // Default to 'started' / normal stage, or first stage
    validStage = deptStages.find(
      (s) => s.name.toLowerCase().includes('start') || s.kind === 'normal'
    ) || deptStages[0];
  }
  const resolvedStageId = validStage ? validStage.id : (stageId || stages[0]?.id || '');

  return {
    projectId: resolvedProjectId,
    departmentId: resolvedDeptId,
    stageId: resolvedStageId,
  };
}

/**
 * Centralized task creation service.
 * Applies context validation, generates proper IDs, applies optimistic update
 * across TanStack Query cache, and persists to Google Sheets.
 */
export async function createTaskWithContext(
  options: CreateTaskOptions,
  queryClient: QueryClient
): Promise<TaskItem> {
  const existingProjects = queryClient.getQueryData<Project[]>(['Projects']) || [];
  const existingDepartments = queryClient.getQueryData<Department[]>(['Departments']) || [];
  const existingStages = queryClient.getQueryData<Stage[]>(['Stages']) || [];
  const existingTasks = queryClient.getQueryData<TaskItem[]>(['Tasks']) || [];

  const { projectId, departmentId, stageId } = resolveTaskContext({
    projectId: options.projectId,
    departmentId: options.departmentId,
    stageId: options.stageId,
    projects: existingProjects,
    departments: existingDepartments,
    stages: existingStages,
  });

  const stageTasks = existingTasks.filter((t) => t.stage_id === stageId);
  const nextOrder = stageTasks.length + 1;

  const newTask: TaskItem = {
    id: generateLocalId(),
    project_id: projectId,
    department_id: departmentId,
    stage_id: stageId,
    title: options.title.trim(),
    description: options.description?.trim() || '',
    priority: options.priority || 'medium',
    estimate_min: options.estimateMin ?? 30,
    actual_min: 0,
    due_date: options.dueDate || '',
    order: nextOrder,
    assignee_id: options.assigneeId || '',
    source: options.source || 'manual',
    created_at: new Date().toISOString(),
  };

  // Immediate optimistic update to Query cache
  queryClient.setQueryData<TaskItem[]>(['Tasks'], (old = []) => [...old, newTask]);

  try {
    // Persist to Google Sheets backend
    const saved = await api.create('Tasks', newTask);
    
    // Sync backend-returned record (which may have server-generated id)
    if (saved && saved.id) {
      queryClient.setQueryData<TaskItem[]>(['Tasks'], (old = []) =>
        old.map((t) => (t.id === newTask.id ? (saved as TaskItem) : t))
      );
    }
    return (saved as TaskItem) || newTask;
  } catch (error) {
    console.error('Failed to create task on backend:', error);
    // Keep optimistic item in local cache, queryClient handles offline/local state
    return newTask;
  }
}
