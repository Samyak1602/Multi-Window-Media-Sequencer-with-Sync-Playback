export type MediaType = 'image' | 'video' | 'blank';

export interface MediaItem {
  id: string;
  window_id: string;
  order_index: number;
  type: MediaType;
  url: string;
  duration_seconds: number;
  created_at?: string;
}

export interface WindowModel {
  id: string;
  name: string;
  cycle_epoch: number;
  cycle_duration_seconds: number;
  created_at?: string;
  updated_at?: string;
  playlist: MediaItem[];
}

export interface SyncState {
  id: string;
  media_item_id?: string;
  type: MediaType;
  url: string;
  duration_seconds: number;
  started_at: number;
  created_at?: string;
}

export interface SyncStatusResponse {
  is_active: boolean;
  sync?: SyncState | null;
  remaining_seconds: number;
  server_time: number;
}

export interface PlaybackState {
  window_id: string;
  server_time: number;
  cycle_epoch: number;
  cycle_duration_seconds: number;
  cycle_elapsed_seconds: number;
  cycle_remaining_seconds: number;
  active_item: MediaItem | null;
  active_item_index: number;
  active_item_offset_seconds: number;
  active_item_remaining_seconds: number;
  is_sync_active: boolean;
  sync_remaining_seconds: number;
  natural_item: MediaItem | null;
  natural_item_index: number;
  natural_item_offset_seconds: number;
  natural_item_remaining_seconds: number;
}

export interface WindowWithPlayback extends WindowModel {
  playback_state: PlaybackState;
}

export interface AddMediaItemPayload {
  type: MediaType;
  url: string;
  duration_seconds: number;
  order_index?: number;
}

export interface TriggerSyncPayload {
  media_item_id?: string;
  type?: MediaType;
  url?: string;
  duration_seconds?: number;
}
