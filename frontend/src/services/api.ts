import type { WindowWithPlayback, SyncStatusResponse, AddMediaItemPayload, TriggerSyncPayload, MediaItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function getWindows(): Promise<WindowWithPlayback[]> {
  const res = await fetch(`${API_BASE_URL}/api/windows`);
  if (!res.ok) {
    throw new Error(`Failed to fetch windows: ${res.statusText}`);
  }
  return res.json();
}

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/sync/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sync status: ${res.statusText}`);
  }
  return res.json();
}

export async function addMediaItem(windowId: string, payload: AddMediaItemPayload): Promise<MediaItem> {
  const res = await fetch(`${API_BASE_URL}/api/windows/${windowId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to add media item: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteMediaItem(mediaId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/media/${mediaId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete media item: ${res.statusText}`);
  }
}

export async function triggerSync(payload: TriggerSyncPayload): Promise<SyncStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to trigger sync: ${res.statusText}`);
  }
  return res.json();
}

export async function cancelSync(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sync/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel sync: ${res.statusText}`);
  }
}
