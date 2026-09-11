package engine

import (
	"multi-window-media-sequencer/internal/models"
)

// CalculatePlayback computes the exact playback state for a window at nowUnix purely as a function of wall-clock time.
func CalculatePlayback(window models.Window, items []models.MediaItem, nowUnix int64, activeSync *models.SyncState) models.PlaybackState {
	cycleDuration := window.CycleDurationSeconds
	if cycleDuration <= 0 {
		cycleDuration = 18000 // 5 hours default
	}

	epoch := window.CycleEpoch
	diff := nowUnix - epoch
	if diff < 0 {
		diff = 0
	}

	cycleElapsed := diff % int64(cycleDuration)
	cycleRemaining := int64(cycleDuration) - cycleElapsed

	state := models.PlaybackState{
		WindowID:              window.ID,
		ServerTime:            nowUnix,
		CycleEpoch:            epoch,
		CycleDurationSeconds:  cycleDuration,
		CycleElapsedSeconds:   cycleElapsed,
		CycleRemainingSeconds: cycleRemaining,
	}

	// Calculate natural item from playlist
	if len(items) > 0 {
		var totalDuration int64
		for _, it := range items {
			dur := it.DurationSeconds
			if dur <= 0 {
				dur = 1
			}
			totalDuration += int64(dur)
		}

		if totalDuration > 0 {
			playlistElapsed := cycleElapsed % totalDuration
			var runningSum int64

			for i, it := range items {
				itemDur := int64(it.DurationSeconds)
				if itemDur <= 0 {
					itemDur = 1
				}

				if playlistElapsed < runningSum+itemDur {
					offset := playlistElapsed - runningSum
					remaining := itemDur - offset
					itemCopy := it

					state.NaturalItem = &itemCopy
					state.NaturalItemIndex = i
					state.NaturalItemOffsetSec = offset
					state.NaturalItemRemainingSec = remaining
					break
				}
				runningSum += itemDur
			}
		}
	}

	if state.NaturalItem == nil {
		// Fallback blank item if playlist is empty or invalid
		fallback := models.MediaItem{
			ID:              "fallback-blank",
			WindowID:        window.ID,
			OrderIndex:      0,
			Type:            models.MediaTypeBlank,
			URL:             "",
			DurationSeconds: cycleDuration,
		}
		state.NaturalItem = &fallback
		state.NaturalItemIndex = 0
		state.NaturalItemOffsetSec = cycleElapsed
		state.NaturalItemRemainingSec = cycleRemaining
	}

	// Check if sync is currently active
	isSyncing := false
	if activeSync != nil && activeSync.DurationSeconds > 0 {
		syncEnd := activeSync.StartedAt + int64(activeSync.DurationSeconds)
		if nowUnix >= activeSync.StartedAt && nowUnix < syncEnd {
			isSyncing = true
			syncRemaining := syncEnd - nowUnix
			syncOffset := nowUnix - activeSync.StartedAt

			state.IsSyncActive = true
			state.SyncRemainingSeconds = syncRemaining

			syncedItem := models.MediaItem{
				ID:              activeSync.ID,
				WindowID:        window.ID,
				OrderIndex:      -1,
				Type:            activeSync.Type,
				URL:             activeSync.URL,
				DurationSeconds: activeSync.DurationSeconds,
			}
			state.ActiveItem = &syncedItem
			state.ActiveItemIndex = -1
			state.ActiveItemOffsetSec = syncOffset
			state.ActiveItemRemainingSec = syncRemaining
		}
	}

	if !isSyncing {
		state.IsSyncActive = false
		state.SyncRemainingSeconds = 0
		state.ActiveItem = state.NaturalItem
		state.ActiveItemIndex = state.NaturalItemIndex
		state.ActiveItemOffsetSec = state.NaturalItemOffsetSec
		state.ActiveItemRemainingSec = state.NaturalItemRemainingSec
	}

	return state
}
