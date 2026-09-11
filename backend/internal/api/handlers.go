package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"multi-window-media-sequencer/internal/db"
	"multi-window-media-sequencer/internal/engine"
	"multi-window-media-sequencer/internal/models"
)

type Server struct {
	db                  *db.DB
	defaultSyncDuration int
}

func NewServer(database *db.DB, defaultSyncDuration int) *Server {
	if defaultSyncDuration <= 0 {
		defaultSyncDuration = 10
	}
	return &Server{
		db:                  database,
		defaultSyncDuration: defaultSyncDuration,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/windows", s.handleWindows)
	mux.HandleFunc("/api/windows/", s.handleWindowSubroutes)
	mux.HandleFunc("/api/media/", s.handleMediaItemSubroutes)
	mux.HandleFunc("/api/sync", s.handleSync)
	mux.HandleFunc("/api/sync/status", s.handleSyncStatus)
	mux.HandleFunc("/api/sync/cancel", s.handleSyncCancel)

	return CorsMiddleware(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":      "ok",
		"server_time": time.Now().Unix(),
	})
}

// WindowWithPlayback represents a window enriched with its real-time playback state.
type WindowWithPlayback struct {
	models.Window
	PlaybackState models.PlaybackState `json:"playback_state"`
}

func (s *Server) handleWindows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	windows, err := s.db.GetWindows()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to retrieve windows: "+err.Error())
		return
	}

	now := time.Now().Unix()
	activeSync, _ := s.db.GetActiveSync(now)

	result := make([]WindowWithPlayback, len(windows))
	for i, win := range windows {
		pb := engine.CalculatePlayback(win, win.Playlist, now, activeSync)
		result[i] = WindowWithPlayback{
			Window:        win,
			PlaybackState: pb,
		}
	}

	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleWindowSubroutes(w http.ResponseWriter, r *http.Request) {
	// Path: /api/windows/{id} or /api/windows/{id}/media
	path := strings.TrimPrefix(r.URL.Path, "/api/windows/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}

	windowID := parts[0]

	if len(parts) == 1 {
		// GET /api/windows/{id}
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		win, err := s.db.GetWindow(windowID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to get window: "+err.Error())
			return
		}
		if win == nil {
			writeError(w, http.StatusNotFound, "Window not found")
			return
		}

		now := time.Now().Unix()
		activeSync, _ := s.db.GetActiveSync(now)
		pb := engine.CalculatePlayback(*win, win.Playlist, now, activeSync)

		writeJSON(w, http.StatusOK, WindowWithPlayback{
			Window:        *win,
			PlaybackState: pb,
		})
		return
	}

	if len(parts) == 2 && parts[1] == "media" {
		// POST /api/windows/{id}/media
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req models.AddMediaItemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		if req.Type != models.MediaTypeImage && req.Type != models.MediaTypeVideo && req.Type != models.MediaTypeBlank {
			writeError(w, http.StatusBadRequest, "Invalid media type. Must be 'image', 'video', or 'blank'")
			return
		}

		if req.Type != models.MediaTypeBlank && req.URL == "" {
			writeError(w, http.StatusBadRequest, "URL is required for image and video media items")
			return
		}

		if req.DurationSeconds <= 0 {
			req.DurationSeconds = 10
		}

		item, err := s.db.AddMediaItem(windowID, req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to add media item: "+err.Error())
			return
		}

		writeJSON(w, http.StatusCreated, item)
		return
	}

	http.NotFound(w, r)
}

func (s *Server) handleMediaItemSubroutes(w http.ResponseWriter, r *http.Request) {
	// DELETE /api/media/{id}
	id := strings.TrimPrefix(r.URL.Path, "/api/media/")
	if id == "" {
		http.NotFound(w, r)
		return
	}

	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := s.db.DeleteMediaItem(id); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete media item: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Media item deleted successfully"})
}

func (s *Server) handleSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.TriggerSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	dur := req.DurationSeconds
	if dur <= 0 {
		dur = s.defaultSyncDuration
	}

	mediaType := req.Type
	url := req.URL

	// If media_item_id is specified, resolve type and url from database
	if req.MediaItemID != nil && *req.MediaItemID != "" {
		item, err := s.db.GetMediaItemByID(*req.MediaItemID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to resolve media item: "+err.Error())
			return
		}
		if item != nil {
			mediaType = item.Type
			url = item.URL
			if req.DurationSeconds <= 0 && item.DurationSeconds > 0 {
				dur = item.DurationSeconds
			}
		}
	}

	if mediaType == "" {
		mediaType = models.MediaTypeVideo
	}
	if url == "" && mediaType != models.MediaTypeBlank {
		url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
	}

	now := time.Now().Unix()
	sync, err := s.db.TriggerSync(req.MediaItemID, mediaType, url, dur, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to trigger sync: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, models.SyncStatusResponse{
		IsActive:          true,
		Sync:              sync,
		RemainingSeconds:  int64(dur),
		CurrentServerTime: now,
	})
}

func (s *Server) handleSyncStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	now := time.Now().Unix()
	activeSync, err := s.db.GetActiveSync(now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check sync status: "+err.Error())
		return
	}

	if activeSync == nil {
		writeJSON(w, http.StatusOK, models.SyncStatusResponse{
			IsActive:          false,
			Sync:              nil,
			RemainingSeconds:  0,
			CurrentServerTime: now,
		})
		return
	}

	rem := (activeSync.StartedAt + int64(activeSync.DurationSeconds)) - now
	if rem < 0 {
		rem = 0
	}

	writeJSON(w, http.StatusOK, models.SyncStatusResponse{
		IsActive:          true,
		Sync:              activeSync,
		RemainingSeconds:  rem,
		CurrentServerTime: now,
	})
}

func (s *Server) handleSyncCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	now := time.Now().Unix()
	if err := s.db.CancelActiveSync(now); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to cancel sync: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Active sync cancelled",
		"server_time": now,
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
