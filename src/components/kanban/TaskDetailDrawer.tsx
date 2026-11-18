import React from 'react';
import { TaskDetail } from '../tasks/TaskDetail';
import type { TaskItem } from '../../types';

export interface TaskDetailDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updated: Partial<TaskItem>) => void;
  onDelete?: (taskId: string) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !task) return null;

  return <TaskDetail taskId={task.id} onClose={onClose} />;
};
