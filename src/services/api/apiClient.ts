import type { TabName, TabRecordMap } from '../../types';
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
        return await remoteRequest<Array<TabRecordMap[T]>>('list', { tab });
      } catch (err) {
        console.warn(`Remote list for ${tab} failed, falling back to local cache`, err);
        return getLocalTable<TabRecordMap[T]>(tab);
      }
    }
    return getLocalTable<TabRecordMap[T]>(tab);
  },

  async create<T extends TabName>(tab: T, row: Partial<TabRecordMap[T]>): Promise<TabRecordMap[T]> {
    if (isLiveApiConfigured) {
      try {
        const remoteItem = await remoteRequest<TabRecordMap[T]>('create', { tab, row });
        // Also sync into local cache
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const remoteObj = remoteItem as unknown as Record<string, unknown>;
        const existingIdx = items.findIndex(
          (i) => String(i.id) === String(remoteObj.id)
        );
        if (existingIdx >= 0) {
          items[existingIdx] = remoteObj;
        } else {
          items.push(remoteObj);
        }
        setLocalTable(tab, items);
        return remoteItem;
      } catch (err) {
        console.warn(`Remote create for ${tab} failed, falling back to local cache`, err);
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
    return newRecord as unknown as TabRecordMap[T];
  },

  async update<T extends TabName>(
    tab: T,
    id: string,
    patch: Partial<TabRecordMap[T]>
  ): Promise<TabRecordMap[T]> {
    if (isLiveApiConfigured) {
      try {
        const remoteUpdated = await remoteRequest<TabRecordMap[T]>('update', { tab, id, patch });
        const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
        const remoteObj = remoteUpdated as unknown as Record<string, unknown>;
        const index = items.findIndex(
          (item) => String(item.id) === String(id) || (tab === 'Settings' && String(item.key) === String(id))
        );
        if (index >= 0) {
          items[index] = { ...items[index], ...remoteObj };
          setLocalTable(tab, items);
        }
        return remoteUpdated;
      } catch (err) {
        console.warn(`Remote update for ${tab} failed, falling back to local cache`, err);
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const index = items.findIndex(
      (item) => String(item.id) === String(id) || (tab === 'Settings' && String(item.key) === String(id))
    );

    if (index === -1) {
      throw new Error(`Item ${id} not found in ${tab}`);
    }

    const updated = {
      ...items[index],
      ...(patch as Record<string, unknown>),
    };

    items[index] = updated;
    setLocalTable(tab, items);
    return updated as unknown as TabRecordMap[T];
  },

  async delete<T extends TabName>(tab: T, id: string): Promise<{ deleted: boolean; id: string }> {
    if (isLiveApiConfigured) {
      try {
        await remoteRequest<{ deleted: boolean; id: string }>('delete', { tab, id });
      } catch (err) {
        console.warn(`Remote delete for ${tab} failed, falling back to local cache`, err);
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const filtered = items.filter(
      (item) => String(item.id) !== String(id) && !(tab === 'Settings' && String(item.key) === String(id))
    );

    setLocalTable(tab, filtered);
    return { deleted: true, id };
  },

  async batchUpdate<T extends TabName>(
    tab: T,
    rows: Array<Partial<TabRecordMap[T]>>
  ): Promise<Array<TabRecordMap[T]>> {
    let remoteResults: Array<TabRecordMap[T]> | null = null;
    if (isLiveApiConfigured) {
      try {
        remoteResults = await remoteRequest<Array<TabRecordMap[T]>>('batchUpdate', { tab, rows });
      } catch (err) {
        console.warn(`Remote batchUpdate for ${tab} failed, falling back to local cache`, err);
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const itemMap = new Map<string, Record<string, unknown>>();
    items.forEach((i) => {
      const key = tab === 'Settings' ? String(i.key) : String(i.id);
      itemMap.set(key, i);
    });

    const results: Array<Record<string, unknown>> = [];
    const sourceRows = remoteResults && remoteResults.length > 0 ? remoteResults : rows;

    sourceRows.forEach((r) => {
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
    return results as unknown as Array<TabRecordMap[T]>;
  },

  async batchDelete<T extends TabName>(
    tab: T,
    ids: string[]
  ): Promise<{ deleted: number; ids: string[] }> {
    if (isLiveApiConfigured) {
      try {
        return await remoteRequest<{ deleted: number; ids: string[] }>('batchDelete', { tab, ids });
      } catch (err) {
        console.warn(`Remote batchDelete for ${tab} failed, falling back to local cache`, err);
      }
    }

    const items = getLocalTable<unknown>(tab) as Array<Record<string, unknown>>;
    const idSet = new Set(ids.map(String));
    const filtered = items.filter(
      (item) => !idSet.has(String(item.id)) && !(tab === 'Settings' && idSet.has(String(item.key)))
    );

    const deletedCount = items.length - filtered.length;
    setLocalTable(tab, filtered);
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
