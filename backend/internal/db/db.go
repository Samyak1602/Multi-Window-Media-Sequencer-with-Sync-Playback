package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"

	"multi-window-media-sequencer/internal/models"
)

type DB struct {
	conn *sql.DB
}

// New creates and initializes the SQLite database, runs migrations, and inserts seed data if needed.
func New(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Enable WAL mode & foreign keys for concurrency and integrity
	if _, err := conn.Exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;"); err != nil {
		return nil, fmt.Errorf("failed to set pragma: %w", err)
	}

	database := &DB{conn: conn}
	if err := database.migrate(); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	if err := database.seed(); err != nil {
		return nil, fmt.Errorf("seeding failed: %w", err)
	}

	return database, nil
}

func (d *DB) Close() error {
	return d.conn.Close()
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS windows (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		cycle_epoch INTEGER NOT NULL,
		cycle_duration_seconds INTEGER NOT NULL DEFAULT 18000,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS media_items (
		id TEXT PRIMARY KEY,
		window_id TEXT NOT NULL,
		order_index INTEGER NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('image', 'video', 'blank')),
		url TEXT NOT NULL,
		duration_seconds INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (window_id) REFERENCES windows(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_media_items_window ON media_items(window_id, order_index);

	CREATE TABLE IF NOT EXISTS sync_states (
		id TEXT PRIMARY KEY,
		media_item_id TEXT,
		type TEXT NOT NULL,
		url TEXT NOT NULL,
		duration_seconds INTEGER NOT NULL DEFAULT 10,
		started_at INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_sync_states_started ON sync_states(started_at);
	`
	_, err := d.conn.Exec(schema)
	return err
}

func (d *DB) seed() error {
	var count int
	if err := d.conn.QueryRow("SELECT COUNT(*) FROM windows").Scan(&count); err != nil {
		return err
	}

	if count > 0 {
		return nil // Already seeded
	}

	now := time.Now().Unix()

	// Seed 3 standard windows with a fixed reference cycle_epoch set to now
	windows := []models.Window{
		{
			ID:                   "win-1",
			Name:                 "Window 1 - Lobby Display",
			CycleEpoch:           now,
			CycleDurationSeconds: 18000,
		},
		{
			ID:                   "win-2",
			Name:                 "Window 2 - Storefront Showcase",
			CycleEpoch:           now,
			CycleDurationSeconds: 18000,
		},
		{
			ID:                   "win-3",
			Name:                 "Window 3 - Cafeteria Screen",
			CycleEpoch:           now,
			CycleDurationSeconds: 18000,
		},
	}

	for _, w := range windows {
		_, err := d.conn.Exec(
			"INSERT INTO windows (id, name, cycle_epoch, cycle_duration_seconds) VALUES (?, ?, ?, ?)",
			w.ID, w.Name, w.CycleEpoch, w.CycleDurationSeconds,
		)
		if err != nil {
			return err
		}
	}

	// Seed media items for Window 1
	w1Items := []models.MediaItem{
		{
			ID:              "m1-1",
			WindowID:        "win-1",
			OrderIndex:      0,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 15,
		},
		{
			ID:              "m1-2",
			WindowID:        "win-1",
			OrderIndex:      1,
			Type:            models.MediaTypeVideo,
			URL:             "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
			DurationSeconds: 15,
		},
		{
			ID:              "m1-3",
			WindowID:        "win-1",
			OrderIndex:      2,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 12,
		},
		{
			ID:              "m1-4",
			WindowID:        "win-1",
			OrderIndex:      3,
			Type:            models.MediaTypeBlank,
			URL:             "",
			DurationSeconds: 8,
		},
	}

	// Seed media items for Window 2
	w2Items := []models.MediaItem{
		{
			ID:              "m2-1",
			WindowID:        "win-2",
			OrderIndex:      0,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 18,
		},
		{
			ID:              "m2-2",
			WindowID:        "win-2",
			OrderIndex:      1,
			Type:            models.MediaTypeBlank,
			URL:             "",
			DurationSeconds: 7,
		},
		{
			ID:              "m2-3",
			WindowID:        "win-2",
			OrderIndex:      2,
			Type:            models.MediaTypeVideo,
			URL:             "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
			DurationSeconds: 15,
		},
		{
			ID:              "m2-4",
			WindowID:        "win-2",
			OrderIndex:      3,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 14,
		},
	}

	// Seed media items for Window 3
	w3Items := []models.MediaItem{
		{
			ID:              "m3-1",
			WindowID:        "win-3",
			OrderIndex:      0,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 14,
		},
		{
			ID:              "m3-2",
			WindowID:        "win-3",
			OrderIndex:      1,
			Type:            models.MediaTypeVideo,
			URL:             "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
			DurationSeconds: 15,
		},
		{
			ID:              "m3-3",
			WindowID:        "win-3",
			OrderIndex:      2,
			Type:            models.MediaTypeImage,
			URL:             "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
			DurationSeconds: 16,
		},
		{
			ID:              "m3-4",
			WindowID:        "win-3",
			OrderIndex:      3,
			Type:            models.MediaTypeBlank,
			URL:             "",
			DurationSeconds: 9,
		},
	}

	allItems := append(append(w1Items, w2Items...), w3Items...)
	for _, item := range allItems {
		_, err := d.conn.Exec(
			"INSERT INTO media_items (id, window_id, order_index, type, url, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)",
			item.ID, item.WindowID, item.OrderIndex, item.Type, item.URL, item.DurationSeconds,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// GetWindows returns all windows with their playlists populated.
func (d *DB) GetWindows() ([]models.Window, error) {
	rows, err := d.conn.Query("SELECT id, name, cycle_epoch, cycle_duration_seconds, created_at, updated_at FROM windows ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var windows []models.Window
	for rows.Next() {
		var w models.Window
		if err := rows.Scan(&w.ID, &w.Name, &w.CycleEpoch, &w.CycleDurationSeconds, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		windows = append(windows, w)
	}

	for i := range windows {
		items, err := d.GetMediaItems(windows[i].ID)
		if err != nil {
			return nil, err
		}
		windows[i].Playlist = items
	}

	return windows, nil
}

// GetWindow returns a single window by ID with its playlist.
func (d *DB) GetWindow(id string) (*models.Window, error) {
	var w models.Window
	err := d.conn.QueryRow(
		"SELECT id, name, cycle_epoch, cycle_duration_seconds, created_at, updated_at FROM windows WHERE id = ?",
		id,
	).Scan(&w.ID, &w.Name, &w.CycleEpoch, &w.CycleDurationSeconds, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	items, err := d.GetMediaItems(w.ID)
	if err != nil {
		return nil, err
	}
	w.Playlist = items

	return &w, nil
}

// GetMediaItems returns all media items for a given window ordered by order_index.
func (d *DB) GetMediaItems(windowID string) ([]models.MediaItem, error) {
	rows, err := d.conn.Query(
		"SELECT id, window_id, order_index, type, url, duration_seconds, created_at FROM media_items WHERE window_id = ? ORDER BY order_index ASC",
		windowID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.MediaItem
	for rows.Next() {
		var m models.MediaItem
		if err := rows.Scan(&m.ID, &m.WindowID, &m.OrderIndex, &m.Type, &m.URL, &m.DurationSeconds, &m.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, nil
}

// GetMediaItemByID retrieves a media item by its primary key ID.
func (d *DB) GetMediaItemByID(id string) (*models.MediaItem, error) {
	var m models.MediaItem
	err := d.conn.QueryRow(
		"SELECT id, window_id, order_index, type, url, duration_seconds, created_at FROM media_items WHERE id = ?",
		id,
	).Scan(&m.ID, &m.WindowID, &m.OrderIndex, &m.Type, &m.URL, &m.DurationSeconds, &m.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// AddMediaItem inserts a media item into a window's playlist.
func (d *DB) AddMediaItem(windowID string, req models.AddMediaItemRequest) (*models.MediaItem, error) {
	tx, err := d.conn.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Determine order index
	var targetIndex int
	if req.OrderIndex != nil {
		targetIndex = *req.OrderIndex
		// Shift existing items >= targetIndex
		_, err = tx.Exec(
			"UPDATE media_items SET order_index = order_index + 1 WHERE window_id = ? AND order_index >= ?",
			windowID, targetIndex,
		)
		if err != nil {
			return nil, err
		}
	} else {
		// Append to the end
		var maxIndex sql.NullInt64
		err = tx.QueryRow("SELECT MAX(order_index) FROM media_items WHERE window_id = ?", windowID).Scan(&maxIndex)
		if err != nil {
			return nil, err
		}
		if maxIndex.Valid {
			targetIndex = int(maxIndex.Int64) + 1
		} else {
			targetIndex = 0
		}
	}

	itemID := "m-" + uuid.New().String()[:8]
	dur := req.DurationSeconds
	if dur <= 0 {
		dur = 10
	}

	_, err = tx.Exec(
		"INSERT INTO media_items (id, window_id, order_index, type, url, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)",
		itemID, windowID, targetIndex, req.Type, req.URL, dur,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return d.GetMediaItemByID(itemID)
}

// DeleteMediaItem deletes a media item and shifts remaining order indices.
func (d *DB) DeleteMediaItem(id string) error {
	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var windowID string
	var orderIndex int
	err = tx.QueryRow("SELECT window_id, order_index FROM media_items WHERE id = ?", id).Scan(&windowID, &orderIndex)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	_, err = tx.Exec("DELETE FROM media_items WHERE id = ?", id)
	if err != nil {
		return err
	}

	// Re-compact order indices
	_, err = tx.Exec("UPDATE media_items SET order_index = order_index - 1 WHERE window_id = ? AND order_index > ?", windowID, orderIndex)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// TriggerSync inserts a new active sync state.
func (d *DB) TriggerSync(mediaItemID *string, mediaType models.MediaType, url string, durationSeconds int, startedAt int64) (*models.SyncState, error) {
	if durationSeconds <= 0 {
		durationSeconds = 10
	}
	if startedAt <= 0 {
		startedAt = time.Now().Unix()
	}

	syncID := "sync-" + uuid.New().String()[:8]

	_, err := d.conn.Exec(
		"INSERT INTO sync_states (id, media_item_id, type, url, duration_seconds, started_at) VALUES (?, ?, ?, ?, ?, ?)",
		syncID, mediaItemID, mediaType, url, durationSeconds, startedAt,
	)
	if err != nil {
		return nil, err
	}

	return &models.SyncState{
		ID:              syncID,
		MediaItemID:     mediaItemID,
		Type:            mediaType,
		URL:             url,
		DurationSeconds: durationSeconds,
		StartedAt:       startedAt,
		CreatedAt:       time.Now(),
	}, nil
}

// GetActiveSync returns the latest sync state if it is currently active at nowUnix.
func (d *DB) GetActiveSync(nowUnix int64) (*models.SyncState, error) {
	var s models.SyncState
	var mediaItemID sql.NullString

	err := d.conn.QueryRow(
		`SELECT id, media_item_id, type, url, duration_seconds, started_at, created_at 
		 FROM sync_states 
		 WHERE started_at <= ? AND (started_at + duration_seconds) > ? 
		 ORDER BY started_at DESC, created_at DESC 
		 LIMIT 1`,
		nowUnix, nowUnix,
	).Scan(&s.ID, &mediaItemID, &s.Type, &s.URL, &s.DurationSeconds, &s.StartedAt, &s.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if mediaItemID.Valid {
		s.MediaItemID = &mediaItemID.String
	}

	return &s, nil
}

// CancelActiveSync terminates any currently active syncs by updating duration so they expire immediately.
func (d *DB) CancelActiveSync(nowUnix int64) error {
	_, err := d.conn.Exec("UPDATE sync_states SET duration_seconds = MAX(0, ? - started_at) WHERE started_at <= ? AND (started_at + duration_seconds) > ?", nowUnix, nowUnix, nowUnix)
	return err
}
