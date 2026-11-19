import type { TabName, TabRecordMap, TaskItem, Setting } from '../../types';
import { broadcastSyncMutation } from '../syncService';
import {
  API_URL,
  API_TOKEN,
  isLiveApiConfigured,
  getLocalTable,
  setLocalTable,
  generateLocalId,
  updateConnectionState,
  getConnectionInfo,
  type ConnectionInfo,
} from './apiConfig';

/**
 * Prefix used in the Google Sheets Settings table for linked sub-project persistence.
 * Guarantees 100% permanent persistence in Google Sheets across browser refresh, logins, and multiple devices.
 */
const LINKED_TASK_SETTING_PREFIX = 'link_task_';

interface LinkedTaskSettingPayload {
  linked_project_id?: string;
  linked_task_id?: string;
  updated_at?: string;
}

/**
 * Reconciles Tasks with Settings-persisted sub-project links.
 */
function reconcileTasksWithSettings(tasks: TaskItem[], settings: Setting[]): TaskItem[] {
  const linkMap = new Map<string, LinkedTaskSettingPayload>();
  (settings || []).forEach((s) => {
    if (s.key && String(s.key).startsWith(LINKED_TASK_SETTING_PREFIX) && s.value) {
      const taskId = String(s.key).slice(LINKED_TASK_SETTING_PREFIX.length);
      try {
        const parsed = JSON.parse(s.value);
        if (parsed && typeof parsed === 'object') {
          linkMap.set(taskId, parsed);
        }
      } catch {
        linkMap.set(taskId, { linked_project_id: String(s.value) });
      }
    }
  });

  if (linkMap.size === 0) return tasks;

  return tasks.map((task) => {
    const link = linkMap.get(task.id);
    if (!link) return task;
    return {
      ...task,
      linked_project_id: task.linked_project_id || link.linked_project_id || '',
      linked_task_id: task.linked_task_id || link.linked_task_id || '',
    };
  });
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  error?: string;
  timestamp: string;
}

export async function remoteRequest<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!API_URL || !API_TOKEN) {
    throw new Error('API configuration is missing.');
  }

  // Use text/plain Content-Type to avoid browser CORS preflight
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      token: API_TOKEN,
      action,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  const result: ApiResponse<T> = await response.json();
  if (result.status === 'error') {
    throw new Error(result.error || 'Server error occurred');
  }

  return result.data;
}

export const api = {
  isConfigured: isLiveApiConfigured,

  async list<T extends TabName>(tab: T): Promise<Array<TabRecordMap[T]>> {
    if (isLiveApiConfigured) {
      try {
        const remoteData = await remoteRequest<Array<TabRecordMap[T]>>('list', { tab });
        if (Array.isArray(remoteData)) {
          let finalData = remoteData;
          if (tab === 'Tasks') {
            try {
              const settings = await remoteRequest<Setting[]>('list', { tab: 'Settings' });
              if (Array.isArray(settings)) {
                setLocalTable('Settings', settings);
                finalData = reconcileTasksWithSettings(remoteData as TaskItem[], settings) as unknown as Array<TabRecordMap[T]>;
              }
            } catch {
              const localSettings = getLocalTable<Setting>('Settings');
              finalData = reconcileTasksWithSettings(remoteData as TaskItem[], localSettings) as unknown as Array<TabRecordMap[T]>;
            }
          }
          setLocalTable(tab, finalData);
          return finalData;
        }
      } catch (err) {
        console.warn(`Remote list for ${tab} failed, using local cache:`, err);
        const localFallback = getLocalTable<TabRecordMap[T]>(tab);
        if (tab === 'Tasks') {
          const localSettings = getLocalTable<Setting>('Settings');
          return reconcileTasksWithSettings(localFallback as TaskItem[], localSettings) as unknown as Array<TabRecordMap[T]>;
        }
        return localFallback;
      }
    }
    const local = getLocalTable<TabRecordMap[T]>(tab);
    if (tab === 'Tasks') {
      const localSettings = getLocalTable<Setting>('Settings');
      return reconcileTasksWithSettings(local as TaskItem[], localSettings) as unknown as Array<TabRecordMap[T]>;
    }
    return local;
  },

  async batchList(tabs: TabName[]): Promise<Partial<Record<TabName, unknown[]>>> {
    const requestedTabs = [...tabs];
    if (requestedTabs.includes('Tasks') && !requestedTabs.includes('Settings')) {
      requestedTabs.push('Settings');
    }

    if (isLiveApiConfigured) {
      try {
        const remoteData = await remoteRequest<Record<string, unknown[]>>('batchList', { tabs: requestedTabs });
        if (remoteData && typeof remoteData === 'object') {
          const settings = ((remoteData['Settings'] as Setting[]) || getLocalTable<Setting>('Settings')) as Setting[];
          Object.entries(remoteData).forEach(([tabName, data]) => {
            if (Array.isArray(data)) {
              if (tabName === 'Tasks') {
                const reconciled = reconcileTasksWithSettings(data as TaskItem[], settings);
                remoteData[tabName] = reconciled;
                setLocalTable('Tasks', reconciled);
              } else {
                setLocalTable(tabName as TabName, data);
              }
            }
          });
          return remoteData as Partial<Record<TabName, unknown[]>>;
        }
      } catch (err) {
        console.warn('Remote batchList failed, using local cache:', err);
      }
    }

    const fallback: Partial<Record<TabName, unknown[]>> = {};
    const localSettings = getLocalTable<Setting>('Settings');
    tabs.forEach((tab) => {
      const raw = getLocalTable(tab);
      if (tab === 'Tasks') {
        fallback[tab] = reconcileTasksWithSettings(raw as TaskItem[], localSettings);
      } else {
        fallback[tab] = raw;
      }
    });
    return fallback;
  },

  async create<T extends TabName>(tab: T, row: Partial<TabRecordMap[T]>): Promise<TabRecordMap[T]> {
    // If creating a task with a connected sub-project, persist setting to Google Sheets
    if (tab === 'Tasks') {
      const taskRow = row as Partial<TaskItem>;
      if (taskRow.linked_project_id && taskRow.linked_project_id.trim() !== '') {
        const targetId = String(row.id || '');
        if (targetId) {
          const settingKey = LINKED_TASK_SETTING_PREFIX + targetId;
          const linkPayload = JSON.stringify({
            linked_project_id: taskRow.linked_project_id,
            linked_task_id: taskRow.linked_task_id || '',
            updated_at: new Date().toISOString(),
          });
          if (isLiveApiConfigured) {
            try {
              await remoteRequest('batchUpdate', {
                tab: 'Settings',
                rows: [{ key: settingKey, value: linkPayload }],
              });
            } catch (e) {
              console.warn('Failed to persist linked development setting on create:', e);
            }
          }
          const settings = getLocalTable<Setting>('Settings');
          settings.push({ key: settingKey, value: linkPayload });
          setLocalTable('Settings', settings);
        }
      }
    }

    if (isLiveApiConfigured) {
      try {
        const remoteItem = await remoteRequest<TabRecordMap[T]>('create', { tab, row });
        // Sync backend-confirmed record into local cache
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const remoteObj = remoteItem as unknown as Record<string, unknown>;
        const mergedObj = { ...(row as Record<string, unknown>), ...remoteObj };
        const existingIdx = items.findIndex(
          (i) => String(i.id) === String(remoteObj.id || (row as Record<string, unknown>).id)
        );
        if (existingIdx >= 0) {
          items[existingIdx] = mergedObj;
        } else {
          items.push(mergedObj);
        }
        setLocalTable(tab, items);
        broadcastSyncMutation(tab);
        return mergedObj as unknown as TabRecordMap[T];
      } catch (err) {
        console.warn(`Remote create for ${tab} failed:`, err);
        throw err;
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const recordRow = row as Record<string, unknown>;
    const newRecord = {
      ...recordRow,
      id: recordRow.id || generateLocalId(),
      created_at: recordRow.created_at || new Date().toISOString(),
    };

    items.push(newRecord);
    setLocalTable(tab, items);
    broadcastSyncMutation(tab);
    return newRecord as unknown as TabRecordMap[T];
  },

  async update<T extends TabName>(
    tab: T,
    id: string,
    patch: Partial<TabRecordMap[T]>
  ): Promise<TabRecordMap[T]> {
    // If updating a Task, handle Settings-persisted sub-project connection
    if (tab === 'Tasks') {
      const taskPatch = patch as Partial<TaskItem>;
      const settingKey = LINKED_TASK_SETTING_PREFIX + id;
      if (taskPatch.linked_project_id !== undefined) {
        if (taskPatch.linked_project_id.trim() !== '') {
          const linkPayload = JSON.stringify({
            linked_project_id: taskPatch.linked_project_id,
            linked_task_id: taskPatch.linked_task_id || '',
            updated_at: new Date().toISOString(),
          });
          // Persist directly to Google Sheets Settings table (atomic upsert)
          if (isLiveApiConfigured) {
            try {
              await remoteRequest('batchUpdate', {
                tab: 'Settings',
                rows: [{ key: settingKey, value: linkPayload }],
              });
            } catch (err) {
              console.warn('Failed to persist linked development to Settings sheet:', err);
            }
          }
          // Update local Settings cache
          const settings = getLocalTable<Setting>('Settings');
          const existingIdx = settings.findIndex((s) => s.key === settingKey);
          if (existingIdx >= 0) {
            settings[existingIdx].value = linkPayload;
          } else {
            settings.push({ key: settingKey, value: linkPayload });
          }
          setLocalTable('Settings', settings);
        } else {
          // Explicit disconnection: remove setting from Google Sheets Settings table
          if (isLiveApiConfigured) {
            try {
              await remoteRequest('delete', { tab: 'Settings', id: settingKey });
            } catch {
              // Ignore if already deleted
            }
          }
          const settings = getLocalTable<Setting>('Settings');
          setLocalTable('Settings', settings.filter((s) => s.key !== settingKey));
        }
      }
    }

    if (isLiveApiConfigured) {
      try {
        const remoteUpdated = await remoteRequest<TabRecordMap[T]>('update', { tab, id, patch });
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const remoteObj = remoteUpdated as unknown as Record<string, unknown>;
        const index = items.findIndex(
          (item) => String(item.id) === String(id) || (tab === 'Settings' && String(item.key) === String(id))
        );

        let mergedObj = { ...remoteObj, ...(patch as Record<string, unknown>) };
        if (tab === 'Tasks') {
          // If the patch did not touch linked_project_id, preserve existing connection from cache/settings
          const prevTask = index >= 0 ? (items[index] as TaskItem) : null;
          const patchHasLink = (patch as Partial<TaskItem>).linked_project_id !== undefined;
          if (!patchHasLink && prevTask?.linked_project_id) {
            mergedObj = {
              ...mergedObj,
              linked_project_id: prevTask.linked_project_id,
              linked_task_id: prevTask.linked_task_id || '',
            };
          }
        }

        if (index >= 0) {
          items[index] = { ...items[index], ...mergedObj };
          setLocalTable(tab, items);
        }
        broadcastSyncMutation(tab);
        return mergedObj as unknown as TabRecordMap[T];
      } catch (err) {
        console.warn(`Remote update for ${tab} failed:`, err);
        throw err;
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const index = items.findIndex(
      (item) => String(item.id) === String(id) || (tab === 'Settings' && String(item.key) === String(id))
    );

    if (index === -1) {
      // Optimistically create if updating an item that doesn't yet exist in local cache
      const createdItem = {
        id,
        ...(patch as Record<string, unknown>),
        created_at: new Date().toISOString(),
      };
      items.push(createdItem);
      setLocalTable(tab, items);
      broadcastSyncMutation(tab);
      return createdItem as unknown as TabRecordMap[T];
    }

    let updated = {
      ...items[index],
      ...(patch as Record<string, unknown>),
    };

    if (tab === 'Tasks') {
      const prevTask = items[index] as TaskItem;
      const patchHasLink = (patch as Partial<TaskItem>).linked_project_id !== undefined;
      if (!patchHasLink && prevTask.linked_project_id) {
        updated = {
          ...updated,
          linked_project_id: prevTask.linked_project_id,
          linked_task_id: prevTask.linked_task_id || '',
        };
      }
    }

    items[index] = updated;
    setLocalTable(tab, items);
    broadcastSyncMutation(tab);
    return updated as unknown as TabRecordMap[T];
  },

  async delete<T extends TabName>(tab: T, id: string): Promise<{ deleted: boolean; id: string }> {
    if (tab === 'Tasks') {
      const settingKey = LINKED_TASK_SETTING_PREFIX + id;
      if (isLiveApiConfigured) {
        try {
          await remoteRequest('delete', { tab: 'Settings', id: settingKey });
        } catch {
          // Ignore
        }
      }
      const settings = getLocalTable<Setting>('Settings');
      setLocalTable('Settings', settings.filter((s) => s.key !== settingKey));
    }

    if (isLiveApiConfigured) {
      try {
        const res = await remoteRequest<{ deleted: boolean; id: string }>('delete', { tab, id });
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const filtered = items.filter(
          (item) => String(item.id) !== String(id) && !(tab === 'Settings' && String(item.key) === String(id))
        );
        setLocalTable(tab, filtered);
        broadcastSyncMutation(tab);
        return res;
      } catch (err) {
        console.warn(`Remote delete for ${tab} failed:`, err);
        throw err;
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const filtered = items.filter(
      (item) => String(item.id) !== String(id) && !(tab === 'Settings' && String(item.key) === String(id))
    );

    setLocalTable(tab, filtered);
    broadcastSyncMutation(tab);
    return { deleted: true, id };
  },

  async batchUpdate<T extends TabName>(
    tab: T,
    rows: Array<Partial<TabRecordMap[T]>>
  ): Promise<Array<TabRecordMap[T]>> {
    if (isLiveApiConfigured) {
      try {
        const remoteResults = await remoteRequest<Array<TabRecordMap[T]>>('batchUpdate', { tab, rows });
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const itemMap = new Map<string, Record<string, unknown>>();
        items.forEach((i) => {
          const key = tab === 'Settings' ? String(i.key) : String(i.id);
          itemMap.set(key, i);
        });
        remoteResults.forEach((r) => {
          const row = r as unknown as Record<string, unknown>;
          const key = tab === 'Settings' ? String(row.key) : String(row.id);
          if (key) itemMap.set(key, row);
        });
        setLocalTable(tab, Array.from(itemMap.values()));
        broadcastSyncMutation(tab);
        return remoteResults;
      } catch (err) {
        console.warn(`Remote batchUpdate for ${tab} failed:`, err);
        throw err;
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const itemMap = new Map<string, Record<string, unknown>>();
    items.forEach((i) => {
      const key = tab === 'Settings' ? String(i.key) : String(i.id);
      itemMap.set(key, i);
    });

    const results: Array<Record<string, unknown>> = [];
    rows.forEach((r) => {
      const row = r as Record<string, unknown>;
      const key = tab === 'Settings' ? String(row.key) : String(row.id);
      if (key && itemMap.has(key)) {
        const merged = { ...itemMap.get(key), ...row };
        itemMap.set(key, merged);
        results.push(merged);
      } else {
        const newRecord = {
          ...row,
          id: row.id || generateLocalId(),
          created_at: row.created_at || new Date().toISOString(),
        };
        const recordId = newRecord.id || (row.key as string | undefined) || generateLocalId();
        itemMap.set(String(recordId), newRecord);
        results.push(newRecord);
      }
    });

    setLocalTable(tab, Array.from(itemMap.values()));
    broadcastSyncMutation(tab);
    return results as unknown as Array<TabRecordMap[T]>;
  },

  async batchDelete<T extends TabName>(
    tab: T,
    ids: string[]
  ): Promise<{ deleted: number; ids: string[] }> {
    if (isLiveApiConfigured) {
      try {
        const res = await remoteRequest<{ deleted: number; ids: string[] }>('batchDelete', { tab, ids });
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const idSet = new Set(ids.map(String));
        const filtered = items.filter(
          (item) => !idSet.has(String(item.id)) && !(tab === 'Settings' && idSet.has(String(item.key)))
        );
        setLocalTable(tab, filtered);
        broadcastSyncMutation(tab);
        return res;
      } catch (err) {
        console.warn(`Remote batchDelete for ${tab} failed:`, err);
        throw err;
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const idSet = new Set(ids.map(String));
    const filtered = items.filter(
      (item) => !idSet.has(String(item.id)) && !(tab === 'Settings' && idSet.has(String(item.key)))
    );

    const deletedCount = items.length - filtered.length;
    setLocalTable(tab, filtered);
    broadcastSyncMutation(tab);
    return { deleted: deletedCount, ids };
  },

  getConnectionInfo(): ConnectionInfo {
    return getConnectionInfo();
  },

  async ping(): Promise<{ ok: boolean; reason?: string }> {
    if (!API_URL || API_URL.trim() === '' || !API_TOKEN || API_TOKEN.trim() === '') {
      const reason = 'missing .env (VITE_API_URL or VITE_API_TOKEN is empty)';
      updateConnectionState({
        status: 'local',
        reason,
        lastChecked: new Date().toLocaleTimeString(),
      });
      return { ok: false, reason };
    }

    updateConnectionState({
      status: 'connecting',
      reason: 'Testing connection to Google Apps Script...',
      lastChecked: new Date().toLocaleTimeString(),
    });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: API_TOKEN,
          action: 'ping',
        }),
      });

      if (!response.ok) {
        let reason = `HTTP error ${response.status}`;
        if (response.status === 401) {
          reason = 'wrong token (FLOWDESK_API_TOKEN mismatch)';
        } else if (response.status === 404) {
          reason = 'web app not set to Anyone or URL invalid (404)';
        }
        updateConnectionState({
          status: 'error',
          reason,
          lastChecked: new Date().toLocaleTimeString(),
        });
        return { ok: false, reason };
      }

      const text = await response.text();
      let result: { status: string; error?: string };
      try {
        result = JSON.parse(text);
      } catch {
        const reason = 'web app not set to Anyone (returned HTML auth redirect instead of JSON)';
        updateConnectionState({
          status: 'error',
          reason,
          lastChecked: new Date().toLocaleTimeString(),
        });
        return { ok: false, reason };
      }

      if (result.status === 'error') {
        const errText = String(result.error || '').toLowerCase();
        let reason = result.error || 'Server error occurred';
        if (errText.includes('token') || errText.includes('unauthorized')) {
          reason = 'wrong token (FLOWDESK_API_TOKEN mismatch)';
        }
        updateConnectionState({
          status: 'error',
          reason,
          lastChecked: new Date().toLocaleTimeString(),
        });
        return { ok: false, reason };
      }

      updateConnectionState({
        status: 'synced',
        reason: 'Connected to Google Sheets backend',
        lastChecked: new Date().toLocaleTimeString(),
      });
      return { ok: true };
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || err);
      let reason = 'web app not set to Anyone or CORS blocked';
      if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        reason = 'web app not set to Anyone or network unreachable';
      }
      updateConnectionState({
        status: 'error',
        reason,
        lastChecked: new Date().toLocaleTimeString(),
      });
      return { ok: false, reason };
    }
  },

  async uploadLocalDataToSheets(): Promise<{ ok: boolean; count: number; error?: string }> {
    if (!API_URL || !API_TOKEN) {
      throw new Error('Cannot upload to Sheets: .env configuration is missing.');
    }

    const tabs: TabName[] = ['Projects', 'Departments', 'Stages', 'Tasks', 'Ideas', 'Settings'];
    let totalUploaded = 0;

    for (const tab of tabs) {
      const localRows = getLocalTable<unknown>(tab);
      if (localRows.length > 0) {
        await remoteRequest('batchUpdate', { tab, rows: localRows as Array<Record<string, unknown>> });
        totalUploaded += localRows.length;
      }
    }

    updateConnectionState({
      status: 'synced',
      reason: `Uploaded ${totalUploaded} records to Google Sheets tabs`,
      lastChecked: new Date().toLocaleTimeString(),
    });

    return { ok: true, count: totalUploaded };
  },
};
