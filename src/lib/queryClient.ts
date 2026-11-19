import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 10s stale time: permits zero-latency instant local renders while eliminating 5-minute freeze
      staleTime: 1000 * 10,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours offline cache
      refetchOnWindowFocus: true, // Auto-revalidates when returning to tab/window
      refetchOnReconnect: true, // Auto-revalidates when regaining internet connection
      refetchIntervalInBackground: false, // Conserves battery when backgrounded
      retry: 2,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Configure synchronous localStorage persister
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'FLOWDESK_QUERY_OFFLINE_CACHE',
});

// Activate persistent cache with version buster
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: 'flowdesk_sync_v2',
});
