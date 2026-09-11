package db

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"multi-window-media-sequencer/internal/models"
)

func TestDB_InitAndSeed(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	database, err := New(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer database.Close()

	windows, err := database.GetWindows()
	if err != nil {
		t.Fatalf("failed to get windows: %v", err)
	}

	if len(windows) != 3 {
		t.Errorf("expected 3 seeded windows, got %d", len(windows))
	}

	for _, w := range windows {
		if len(w.Playlist) == 0 {
			t.Errorf("window %s playlist is empty", w.ID)
		}
	}
}

func TestDB_AddAndDeleteMediaItem(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	database, err := New(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer database.Close()

	// Initial count on win-1
	w1, err := database.GetWindow("win-1")
	if err != nil || w1 == nil {
		t.Fatalf("failed to get win-1: %v", err)
	}
	initialLen := len(w1.Playlist)

	// Add media item to win-1
	req := models.AddMediaItemRequest{
		Type:            models.MediaTypeImage,
		URL:             "https://example.com/new.jpg",
		DurationSeconds: 15,
	}
	created, err := database.AddMediaItem("win-1", req)
	if err != nil {
		t.Fatalf("failed to add media item: %v", err)
	}
	if created.URL != "https://example.com/new.jpg" {
		t.Errorf("unexpected created item url: %s", created.URL)
	}

	w1Updated, err := database.GetWindow("win-1")
	if err != nil {
		t.Fatalf("failed to get updated win-1: %v", err)
	}
	if len(w1Updated.Playlist) != initialLen+1 {
		t.Errorf("expected playlist length %d, got %d", initialLen+1, len(w1Updated.Playlist))
	}

	// Delete media item
	if err := database.DeleteMediaItem(created.ID); err != nil {
		t.Fatalf("failed to delete media item: %v", err)
	}

	w1AfterDel, err := database.GetWindow("win-1")
	if err != nil {
		t.Fatalf("failed to get win-1 after delete: %v", err)
	}
	if len(w1AfterDel.Playlist) != initialLen {
		t.Errorf("expected playlist length %d after delete, got %d", initialLen, len(w1AfterDel.Playlist))
	}
}

func TestDB_SyncOperations(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	database, err := New(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer database.Close()

	now := time.Now().Unix()

	// 1. Initially no active sync
	sync, err := database.GetActiveSync(now)
	if err != nil {
		t.Fatalf("GetActiveSync failed: %v", err)
	}
	if sync != nil {
		t.Errorf("expected nil active sync, got %+v", sync)
	}

	// 2. Trigger sync for 10s starting now
	triggered, err := database.TriggerSync(nil, models.MediaTypeVideo, "https://example.com/sync.mp4", 10, now)
	if err != nil {
		t.Fatalf("TriggerSync failed: %v", err)
	}
	if triggered.ID == "" {
		t.Fatalf("expected valid sync ID")
	}

	// 3. Active during window (now + 5s)
	activeSync, err := database.GetActiveSync(now + 5)
	if err != nil {
		t.Fatalf("GetActiveSync failed: %v", err)
	}
	if activeSync == nil || activeSync.ID != triggered.ID {
		t.Fatalf("expected active sync %s, got %+v", triggered.ID, activeSync)
	}

	// 4. Overwrite active sync with a new sync trigger
	newSync, err := database.TriggerSync(nil, models.MediaTypeImage, "https://example.com/urgent-override.jpg", 15, now+6)
	if err != nil {
		t.Fatalf("TriggerSync overwrite failed: %v", err)
	}

	// At t = now + 7, latest sync MUST take precedence and overwrite the prior sync
	overwrittenSync, err := database.GetActiveSync(now + 7)
	if err != nil || overwrittenSync == nil {
		t.Fatalf("expected active overwritten sync: %v", err)
	}
	if overwrittenSync.ID != newSync.ID || overwrittenSync.URL != "https://example.com/urgent-override.jpg" {
		t.Errorf("expected newest sync to supersede older sync, got id=%s url=%s", overwrittenSync.ID, overwrittenSync.URL)
	}

	// 5. Inactive after all durations (now + 25s)
	expiredSync, err := database.GetActiveSync(now + 25)
	if err != nil {
		t.Fatalf("GetActiveSync failed: %v", err)
	}
	if expiredSync != nil {
		t.Errorf("expected nil sync after expiration, got %+v", expiredSync)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
