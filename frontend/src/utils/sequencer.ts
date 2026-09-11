import type { WindowModel, MediaItem, SyncState, PlaybackState } from '../types';

/**
 * Calculates playback state purely as a function of wall-clock time.
 * Matches backend engine logic identically.
 */
export function calculateClientPlayback(
  window: WindowModel,
  items: MediaItem[],
  nowUnix: number,
  activeSync?: SyncState | null
): PlaybackState {
  const cycleDuration = window.cycle_duration_seconds > 0 ? window.cycle_duration_seconds : 18000;
  const epoch = window.cycle_epoch;
  
  let diff = nowUnix - epoch;
  if (diff < 0) {
    diff = 0;
  }

  const cycleElapsed = diff % cycleDuration;
  const cycleRemaining = cycleDuration - cycleElapsed;

  const state: PlaybackState = {
    window_id: window.id,
    server_time: nowUnix,
    cycle_epoch: epoch,
    cycle_duration_seconds: cycleDuration,
    cycle_elapsed_seconds: cycleElapsed,
    cycle_remaining_seconds: cycleRemaining,
    active_item: null,
    active_item_index: 0,
    active_item_offset_seconds: 0,
    active_item_remaining_seconds: 0,
    is_sync_active: false,
    sync_remaining_seconds: 0,
    natural_item: null,
    natural_item_index: 0,
    natural_item_offset_seconds: 0,
    natural_item_remaining_seconds: 0,
  };

  // 1. Calculate natural item
  if (items && items.length > 0) {
    let totalDuration = 0;
    for (const it of items) {
      totalDuration += Math.max(1, it.duration_seconds);
    }

    if (totalDuration > 0) {
      const playlistElapsed = cycleElapsed % totalDuration;
      let runningSum = 0;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const itemDur = Math.max(1, it.duration_seconds);

        if (playlistElapsed < runningSum + itemDur) {
          const offset = playlistElapsed - runningSum;
          const remaining = itemDur - offset;

          state.natural_item = it;
          state.natural_item_index = i;
          state.natural_item_offset_seconds = offset;
          state.natural_item_remaining_seconds = remaining;
          break;
        }
        runningSum += itemDur;
      }
    }
  }

  // Fallback blank item if playlist is empty
  if (!state.natural_item) {
    state.natural_item = {
      id: 'fallback-blank',
      window_id: window.id,
      order_index: 0,
      type: 'blank',
      url: '',
      duration_seconds: cycleDuration,
    };
    state.natural_item_index = 0;
    state.natural_item_offset_seconds = cycleElapsed;
    state.natural_item_remaining_seconds = cycleRemaining;
  }

  // 2. Check if sync is active
  let isSyncing = false;
  if (activeSync && activeSync.duration_seconds > 0) {
    const syncEnd = activeSync.started_at + activeSync.duration_seconds;
    if (nowUnix >= activeSync.started_at && nowUnix < syncEnd) {
      isSyncing = true;
      const syncRemaining = syncEnd - nowUnix;
      const syncOffset = nowUnix - activeSync.started_at;

      state.is_sync_active = true;
      state.sync_remaining_seconds = syncRemaining;
      state.active_item = {
        id: activeSync.id,
        window_id: window.id,
        order_index: -1,
        type: activeSync.type,
        url: activeSync.url,
        duration_seconds: activeSync.duration_seconds,
      };
      state.active_item_index = -1;
      state.active_item_offset_seconds = syncOffset;
      state.active_item_remaining_seconds = syncRemaining;
    }
  }

  if (!isSyncing) {
    state.is_sync_active = false;
    state.sync_remaining_seconds = 0;
    state.active_item = state.natural_item;
    state.active_item_index = state.natural_item_index;
    state.active_item_offset_seconds = state.natural_item_offset_seconds;
    state.active_item_remaining_seconds = state.natural_item_remaining_seconds;
  }

  return state;
}

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function formatTimePrecise(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
