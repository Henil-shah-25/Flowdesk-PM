import { useQuery, useMutation, useQueryClient, useIsFetching, useIsMutating } from '@tanstack/react-query';
import { api, generateLocalId } from '../lib/api';
import type { TabName, TabRecordMap, SyncStatus } from '../types';
import { useState, useEffect } from 'react';

export function useSyncStatus(): SyncStatus {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return 'offline';
  }

  if (isFetching > 0 || isMutating > 0) {
    return 'syncing';
  }

  return 'synced';
}

const VOLATILE_TABLES: readonly string[] = [
  'Tasks',
  'Projects',
  'Stages',
  'Subtasks',
  'Notes',
  'TimeLogs',
  'Ideas',
  'Leave',
];

/**
 * Generic query hook to fetch items from any table.
 * Includes short 15-second polling for volatile tables (Tasks, Projects, Stages)
 * with instant pause in background and immediate revalidation on focus.
 */
export function useTableData<T extends TabName>(tab: T) {
  const isVolatile = VOLATILE_TABLES.includes(tab);

  return useQuery({
    queryKey: [tab],
    queryFn: () => api.list(tab),
    // 10s for volatile tables, 60s for static reference tables (Departments, Teams, Templates)
    staleTime: isVolatile ? 1000 * 10 : 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    // Active background polling fallback: 15 seconds for volatile real-time data
    refetchInterval: isVolatile ? 15000 : 60000,
    refetchIntervalInBackground: false, // Automatically stops polling when tab/app is hidden or minimized
    refetchOnWindowFocus: true, // Immediate revalidation on tab/window focus
    refetchOnReconnect: true,
  });
}

function invalidateTabAndRelated<T extends TabName>(qc: ReturnType<typeof useQueryClient>, tab: T) {
  qc.invalidateQueries({ queryKey: [tab] });
  if (tab === 'Tasks') {
    qc.invalidateQueries({ queryKey: ['Projects'] });
    qc.invalidateQueries({ queryKey: ['Stages'] });
    qc.invalidateQueries({ queryKey: ['Settings'] });
  } else if (tab === 'Settings') {
    qc.invalidateQueries({ queryKey: ['Tasks'] });
  } else if (tab === 'Stages') {
    qc.invalidateQueries({ queryKey: ['Tasks'] });
  } else if (tab === 'Projects') {
    qc.invalidateQueries({ queryKey: ['Departments'] });
    qc.invalidateQueries({ queryKey: ['Tasks'] });
  }
}

/**
 * Hook to create a new record with instant optimistic update
 */
export function useCreateRecord<T extends TabName>(tab: T) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (newRecord: Partial<TabRecordMap[T]>) => api.create(tab, newRecord),
    onMutate: async (newRecord) => {
      await qc.cancelQueries({ queryKey: [tab] });
      const previousData = qc.getQueryData<Array<TabRecordMap[T]>>([tab]) || [];

      const recordObj = newRecord as Record<string, unknown>;
      const optimisticItem = {
        ...recordObj,
        id: recordObj.id || generateLocalId(),
        created_at: recordObj.created_at || new Date().toISOString(),
      } as unknown as TabRecordMap[T];

      qc.setQueryData<Array<TabRecordMap[T]>>([tab], [...previousData, optimisticItem]);

      return { previousData };
    },
    onError: (_err, _newRecord, context) => {
      if (context?.previousData) {
        qc.setQueryData([tab], context.previousData);
      }
    },
    onSettled: () => {
      invalidateTabAndRelated(qc, tab);
    },
  });
}

/**
 * Hook to update a record with instant optimistic update
 */
export function useUpdateRecord<T extends TabName>(tab: T) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TabRecordMap[T]> }) =>
      api.update(tab, id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [tab] });
      const previousData = qc.getQueryData<Array<TabRecordMap[T]>>([tab]) || [];

      qc.setQueryData<Array<TabRecordMap[T]>>([tab], (old = []) =>
        old.map((item) => {
          const itemObj = item as unknown as Record<string, unknown>;
          const itemId = itemObj.id || itemObj.key;
          if (String(itemId) === String(id)) {
            return { ...itemObj, ...(patch as Record<string, unknown>) } as unknown as TabRecordMap[T];
          }
          return item;
        })
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData([tab], context.previousData);
      }
    },
    onSettled: () => {
      invalidateTabAndRelated(qc, tab);
    },
  });
}

/**
 * Hook to delete a record with instant optimistic update
 */
export function useDeleteRecord<T extends TabName>(tab: T) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(tab, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [tab] });
      const previousData = qc.getQueryData<Array<TabRecordMap[T]>>([tab]) || [];

      qc.setQueryData<Array<TabRecordMap[T]>>([tab], (old = []) =>
        old.filter((item) => {
          const itemObj = item as unknown as Record<string, unknown>;
          const itemId = itemObj.id || itemObj.key;
          return String(itemId) !== String(id);
        })
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData([tab], context.previousData);
      }
    },
    onSettled: () => {
      invalidateTabAndRelated(qc, tab);
    },
  });
}

/**
 * Hook to batch update records
 */
export function useBatchUpdateRecord<T extends TabName>(tab: T) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (rows: Array<Partial<TabRecordMap[T]>>) => api.batchUpdate(tab, rows),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: [tab] });
      const previousData = qc.getQueryData<Array<TabRecordMap[T]>>([tab]) || [];

      const rowsMap = new Map<string, Record<string, unknown>>();
      rows.forEach((r) => {
        const obj = r as Record<string, unknown>;
        const id = obj.id || obj.key;
        if (id) rowsMap.set(String(id), obj);
      });

      qc.setQueryData<Array<TabRecordMap[T]>>([tab], (old) => {
        const currentList = old || [];
        const existingIds = new Set<string>();
        const updated = currentList.map((item) => {
          const itemObj = item as unknown as Record<string, unknown>;
          const itemId = String(itemObj.id || itemObj.key || '');
          if (itemId) existingIds.add(itemId);
          if (itemId && rowsMap.has(itemId)) {
            return { ...itemObj, ...rowsMap.get(itemId) } as unknown as TabRecordMap[T];
          }
          return item;
        });

        const toAppend = rows.filter((r) => {
          const obj = r as Record<string, unknown>;
          const id = String(obj.id || obj.key || '');
          return id && !existingIds.has(id);
        }) as unknown as Array<TabRecordMap[T]>;

        return [...updated, ...toAppend];
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData([tab], context.previousData);
      }
    },
    onSettled: () => {
      invalidateTabAndRelated(qc, tab);
    },
  });
}

/**
 * Hook to batch delete records
 */
export function useBatchDeleteRecord<T extends TabName>(tab: T) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.batchDelete(tab, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: [tab] });
      const previousData = qc.getQueryData<Array<TabRecordMap[T]>>([tab]) || [];
      const idSet = new Set(ids.map(String));

      qc.setQueryData<Array<TabRecordMap[T]>>([tab], (old = []) =>
        old.filter((item) => {
          const itemObj = item as unknown as Record<string, unknown>;
          const itemId = itemObj.id || itemObj.key;
          return !idSet.has(String(itemId));
        })
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData([tab], context.previousData);
      }
    },
    onSettled: () => {
      invalidateTabAndRelated(qc, tab);
    },
  });
}
