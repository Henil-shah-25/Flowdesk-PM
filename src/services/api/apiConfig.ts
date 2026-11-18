import type { TabName } from '../../types';
import { INITIAL_STORAGE } from '../../lib/mockData';

export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const API_TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined;

export const isLiveApiConfigured = Boolean(
  API_URL && API_TOKEN && API_URL.trim() !== '' && API_TOKEN.trim() !== ''
);

export type ConnectionStatus = 'local' | 'connecting' | 'synced' | 'error';

export interface ConnectionInfo {
  status: ConnectionStatus;
  reason?: string;
  apiUrl?: string;
  hasToken: boolean;
  lastChecked?: string;
}

let connectionState: ConnectionInfo = {
  status: isLiveApiConfigured ? 'synced' : 'local',
  reason: isLiveApiConfigured
    ? 'Live Google Sheets backend configured'
    : 'Local mode (missing or empty .env configuration)',
  apiUrl: API_URL || '',
  hasToken: Boolean(API_TOKEN && API_TOKEN.trim() !== ''),
};

const connectionListeners = new Set<(info: ConnectionInfo) => void>();

export function subscribeConnection(fn: (info: ConnectionInfo) => void): () => void {
  connectionListeners.add(fn);
  fn(connectionState);
  return () => {
    connectionListeners.delete(fn);
  };
}

export function getConnectionInfo(): ConnectionInfo {
  return connectionState;
}

export function updateConnectionState(patch: Partial<ConnectionInfo>): void {
  connectionState = { ...connectionState, ...patch };
  connectionListeners.forEach((fn) => fn(connectionState));
}

export const STORAGE_PREFIX = 'flowdesk_local_db_';

export function getLocalTable<T>(tab: TabName): T[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tab}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed to read ${tab} from localStorage`, e);
  }
  const defaultData = (INITIAL_STORAGE[tab] || []) as T[];
  setLocalTable(tab, defaultData);
  return defaultData;
}

export function setLocalTable<T>(tab: TabName, data: T[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tab}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to write ${tab} to localStorage`, e);
  }
}

// Generate simple client-side ID for local mocks
export function generateLocalId(): string {
  return 'local_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
