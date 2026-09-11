package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"multi-window-media-sequencer/internal/db"
	"multi-window-media-sequencer/internal/models"
)

func setupTestServer(t *testing.T) (*Server, *db.DB) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")
	database, err := db.New(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	server := NewServer(database, 10)
	return server, database
}

func TestAPI_Health(t *testing.T) {
	server, database := setupTestServer(t)
	defer database.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rr := httptest.NewRecorder()

	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var res map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res["status"] != "ok" {
		t.Errorf("expected status ok, got %v", res["status"])
	}
}

func TestAPI_GetWindows(t *testing.T) {
	server, database := setupTestServer(t)
	defer database.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/windows", nil)
	rr := httptest.NewRecorder()

	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var res []WindowWithPlayback
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode windows: %v", err)
	}

	if len(res) != 3 {
		t.Errorf("expected 3 windows, got %d", len(res))
	}

	for _, w := range res {
		if w.PlaybackState.ActiveItem == nil {
			t.Errorf("window %s missing active item", w.ID)
		}
	}
}

func TestAPI_AddAndDeleteMedia(t *testing.T) {
	server, database := setupTestServer(t)
	defer database.Close()

	// 1. Add media item
	body, _ := json.Marshal(models.AddMediaItemRequest{
		Type:            models.MediaTypeImage,
		URL:             "https://example.com/test.jpg",
		DurationSeconds: 12,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/windows/win-1/media", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", rr.Code, rr.Body.String())
	}

	var created models.MediaItem
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatalf("failed to decode created item: %v", err)
	}

	if created.ID == "" || created.URL != "https://example.com/test.jpg" {
		t.Errorf("invalid created item: %+v", created)
	}

	// 2. Delete media item
	delReq := httptest.NewRequest(http.MethodDelete, "/api/media/"+created.ID, nil)
	delRR := httptest.NewRecorder()

	server.Routes().ServeHTTP(delRR, delReq)

	if delRR.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on delete, got %d: %s", delRR.Code, delRR.Body.String())
	}
}

func TestAPI_SyncLifecycle(t *testing.T) {
	server, database := setupTestServer(t)
	defer database.Close()

	// 1. Check initial sync status -> not active
	reqStatus := httptest.NewRequest(http.MethodGet, "/api/sync/status", nil)
	rrStatus := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrStatus, reqStatus)

	var s1 models.SyncStatusResponse
	json.NewDecoder(rrStatus.Body).Decode(&s1)
	if s1.IsActive {
		t.Errorf("expected initial sync inactive")
	}

	// 2. Trigger sync for 5 seconds
	body, _ := json.Marshal(models.TriggerSyncRequest{
		Type:            models.MediaTypeVideo,
		URL:             "https://example.com/emergency.mp4",
		DurationSeconds: 5,
	})
	reqTrigger := httptest.NewRequest(http.MethodPost, "/api/sync", bytes.NewBuffer(body))
	rrTrigger := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrTrigger, reqTrigger)

	if rrTrigger.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created on sync trigger, got %d: %s", rrTrigger.Code, rrTrigger.Body.String())
	}

	// 3. Check status immediately -> active
	rrStatus2 := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrStatus2, reqStatus)
	var s2 models.SyncStatusResponse
	json.NewDecoder(rrStatus2.Body).Decode(&s2)
	if !s2.IsActive || s2.Sync == nil || s2.RemainingSeconds <= 0 {
		t.Errorf("expected sync active, got: %+v", s2)
	}

	// 4. Windows should reflect sync active
	reqWin := httptest.NewRequest(http.MethodGet, "/api/windows/win-1", nil)
	rrWin := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrWin, reqWin)
	var win WindowWithPlayback
	json.NewDecoder(rrWin.Body).Decode(&win)
	if !win.PlaybackState.IsSyncActive {
		t.Errorf("expected win-1 playback state to have IsSyncActive=true")
	}
	if win.PlaybackState.ActiveItem.URL != "https://example.com/emergency.mp4" {
		t.Errorf("expected active item to be synced URL, got %s", win.PlaybackState.ActiveItem.URL)
	}

	// 5. Cancel sync
	reqCancel := httptest.NewRequest(http.MethodPost, "/api/sync/cancel", nil)
	rrCancel := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrCancel, reqCancel)
	if rrCancel.Code != http.StatusOK {
		t.Errorf("expected 200 on cancel, got %d", rrCancel.Code)
	}

	// 6. Check status after cancel -> inactive
	rrStatus3 := httptest.NewRecorder()
	server.Routes().ServeHTTP(rrStatus3, reqStatus)
	var s3 models.SyncStatusResponse
	json.NewDecoder(rrStatus3.Body).Decode(&s3)
	if s3.IsActive {
		t.Errorf("expected sync inactive after cancel")
	}
}

func init() {
	time.Local = time.UTC
}
