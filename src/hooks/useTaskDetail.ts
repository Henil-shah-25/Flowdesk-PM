import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useTaskDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('task');

  const openTask = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('task', id);
      return next;
    });
  }, [setSearchParams]);

  const closeTask = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('task');
      return next;
    });
  }, [setSearchParams]);

  return {
    taskId,
    isOpen: Boolean(taskId),
    openTask,
    closeTask,
  };
}
