import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TabName } from '../types';

const SYNC_CHANNEL_NAME = 'flowdesk_cross_device_sync_v1';
const VOLATILE_SYNC_TABS: TabName[] = ['Tasks', 'Projects', 'Stages', 'Subtasks', 'Notes', 'Ideas', 'TimeLogs'];

interface SyncMessage {
  type: 'MUTATION_OCCURRED' | 'FORCE_REVALIDATE';
  tab?: TabName;
  timestamp: number;
}

let syncBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel not supported or blocked in this environment', err);
  }
}

/**
 * Broadcasts a local mutation to all other tabs/windows of Flowdesk in the browser.
 */
export function broadcastSyncMutation(tab: TabName) {
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({
        type: 'MUTATION_OCCURRED',
        tab,
        timestamp: Date.now(),
      } as SyncMessage);
    } catch (e) {
      console.warn('Failed to broadcast sync mutation:', e);
    }
  }
}

/**
 * Hook mounted in AppLayout that orchestrates real-time cross-device and cross-tab revalidation.
 * Automatically handles:
 * 1. Window focus events (user returns to browser or laptop window)
 * 2. Document visibility changes (mobile app returns from background, switching tabs)
 * 3. Network reconnect events (coming back online)
 * 4. Cross-tab BroadcastChannel notifications
 */
export function useSyncCoordinator() {
  const queryClient = useQueryClient();
  const lastRevalidationTimeRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounced revalidation to prevent burst network spam while guaranteeing immediate refresh
    const triggerRevalidation = (targetTabs: TabName[] = VOLATILE_SYNC_TABS) => {
      const now = Date.now();
      // Throttle rapid consecutive events within 1.5 seconds
      if (now - lastRevalidationTimeRef.current < 1500) {
        if (!debounceTimerRef.current) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            lastRevalidationTimeRef.current = Date.now();
            targetTabs.forEach((tab) => {
              queryClient.invalidateQueries({ queryKey: [tab] });
            });
          }, 1500);
        }
        return;
      }

      lastRevalidationTimeRef.current = now;
      targetTabs.forEach((tab) => {
        queryClient.invalidateQueries({ queryKey: [tab] });
      });
    };

    // 1. Listen for cross-tab mutations
    const handleBroadcastMessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data && (event.data.type === 'MUTATION_OCCURRED' || event.data.type === 'FORCE_REVALIDATE')) {
        const affectedTab = event.data.tab;
        if (affectedTab) {
          queryClient.invalidateQueries({ queryKey: [affectedTab] });
        } else {
          triggerRevalidation(VOLATILE_SYNC_TABS);
        }
      }
    };

    if (syncBroadcastChannel) {
      syncBroadcastChannel.addEventListener('message', handleBroadcastMessage);
    }

    // 2. Window focus revalidation
    const handleWindowFocus = () => {
      triggerRevalidation(VOLATILE_SYNC_TABS);
    };

    // 3. Page visibility change (mobile returning from background, tab switches)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRevalidation(VOLATILE_SYNC_TABS);
      }
    };

    // 4. Online reconnection
    const handleOnline = () => {
      triggerRevalidation(VOLATILE_SYNC_TABS);
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (syncBroadcastChannel) {
        syncBroadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [queryClient]);
}
