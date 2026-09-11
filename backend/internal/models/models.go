package models

import "time"

type MediaType string

const (
	MediaTypeImage MediaType = "image"
	MediaTypeVideo MediaType = "video"
	MediaTypeBlank MediaType = "blank"
)

// Window represents a display window with a fixed cycle epoch.
type Window struct {
	ID                   string      `json:"id"`
	Name                 string      `json:"name"`
	CycleEpoch           int64       `json:"cycle_epoch"` // Unix timestamp in seconds
	CycleDurationSeconds int         `json:"cycle_duration_seconds"` // Default 18000 (5 hours)
	CreatedAt            time.Time   `json:"created_at"`
	UpdatedAt            time.Time   `json:"updated_at"`
	Playlist             []MediaItem `json:"playlist,omitempty"`
}

// MediaItem represents an item in a window's playlist.
type MediaItem struct {
	ID              string    `json:"id"`
	WindowID        string    `json:"window_id"`
	OrderIndex      int       `json:"order_index"`
	Type            MediaType `json:"type"`
	URL             string    `json:"url"`
	DurationSeconds int       `json:"duration_seconds"`
	CreatedAt       time.Time `json:"created_at"`
}

// SyncState represents a global sync playback event.
type SyncState struct {
	ID              string    `json:"id"`
	MediaItemID     *string   `json:"media_item_id,omitempty"`
	Type            MediaType `json:"type"`
	URL             string    `json:"url"`
	DurationSeconds int       `json:"duration_seconds"`
	StartedAt       int64     `json:"started_at"` // Unix timestamp in seconds
	CreatedAt       time.Time `json:"created_at"`
}

// SyncStatusResponse is returned by the sync status endpoint.
type SyncStatusResponse struct {
	IsActive         bool       `json:"is_active"`
	Sync             *SyncState `json:"sync,omitempty"`
	RemainingSeconds int64      `json:"remaining_seconds"`
	CurrentServerTime int64     `json:"server_time"` // Current Unix timestamp in seconds
}

// PlaybackState represents the resolved playback state for a window at a given moment in time.
type PlaybackState struct {
	WindowID              string     `json:"window_id"`
	ServerTime            int64      `json:"server_time"`
	CycleEpoch            int64      `json:"cycle_epoch"`
	CycleDurationSeconds  int        `json:"cycle_duration_seconds"`
	CycleElapsedSeconds   int64      `json:"cycle_elapsed_seconds"`
	CycleRemainingSeconds int64      `json:"cycle_remaining_seconds"`
	
	// Active rendered item (either SyncedItem if sync active, or NaturalItem)
	ActiveItem            *MediaItem `json:"active_item"`
	ActiveItemIndex       int        `json:"active_item_index"`
	ActiveItemOffsetSec   int64      `json:"active_item_offset_seconds"`
	ActiveItemRemainingSec int64     `json:"active_item_remaining_seconds"`

	// Sync status
	IsSyncActive          bool       `json:"is_sync_active"`
	SyncRemainingSeconds  int64      `json:"sync_remaining_seconds"`

	// Natural wall-clock item (unaffected by sync)
	NaturalItem           *MediaItem `json:"natural_item"`
	NaturalItemIndex      int        `json:"natural_item_index"`
	NaturalItemOffsetSec  int64      `json:"natural_item_offset_seconds"`
	NaturalItemRemainingSec int64    `json:"natural_item_remaining_seconds"`
}

// AddMediaItemRequest payload for adding a media item to a playlist.
type AddMediaItemRequest struct {
	Type            MediaType `json:"type"`
	URL             string    `json:"url"`
	DurationSeconds int       `json:"duration_seconds"`
	OrderIndex      *int      `json:"order_index,omitempty"` // If omitted, append to end
}

// TriggerSyncRequest payload for triggering a sync event.
type TriggerSyncRequest struct {
	MediaItemID     *string   `json:"media_item_id,omitempty"`
	Type            MediaType `json:"type,omitempty"`
	URL             string    `json:"url,omitempty"`
	DurationSeconds int       `json:"duration_seconds,omitempty"` // Default 10 if <= 0
}
