import type { WindowWithPlayback, SyncStatusResponse, AddMediaItemPayload, TriggerSyncPayload, MediaItem } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

async function parseErrorMessage(res: Response, fallbackPrefix: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `${fallbackPrefix} (HTTP ${res.status})`;
    try {
      const json = JSON.parse(text);
      if (json.error) return json.error;
      if (json.message) return json.message;
    } catch {
      return text;
    }
    return text;
  } catch {
    return `${fallbackPrefix} (HTTP ${res.status} ${res.statusText})`.trim();
  }
}

export async function getWindows(): Promise<WindowWithPlayback[]> {
  const res = await fetch(`${API_BASE_URL}/api/windows`);
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to fetch windows');
    throw new Error(msg);
  }
  return res.json();
}

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/sync/status`);
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to fetch sync status');
    throw new Error(msg);
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
    const msg = await parseErrorMessage(res, 'Failed to add media item');
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteMediaItem(mediaId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/media/${mediaId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to delete media item');
    throw new Error(msg);
  }
}

export async function triggerSync(payload: TriggerSyncPayload): Promise<SyncStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to trigger sync');
    throw new Error(msg);
  }
  return res.json();
}

export async function cancelSync(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sync/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res, 'Failed to cancel sync');
    throw new Error(msg);
  }
}
