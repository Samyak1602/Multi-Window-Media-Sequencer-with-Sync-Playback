package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"multi-window-media-sequencer/internal/api"
	"multi-window-media-sequencer/internal/db"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./sequencer.db"
	}

	// Ensure db directory exists if it has a directory path
	dir := filepath.Dir(dbPath)
	if dir != "." && dir != "" {
		_ = os.MkdirAll(dir, 0755)
	}

	syncDurationStr := os.Getenv("DEFAULT_SYNC_DURATION_SECONDS")
	syncDuration := 10
	if syncDurationStr != "" {
		if val, err := strconv.Atoi(syncDurationStr); err == nil && val > 0 {
			syncDuration = val
		}
	}

	log.Printf("[Sequencer Backend] Initializing SQLite database at %s...", dbPath)
	database, err := db.New(dbPath)
	if err != nil {
		log.Fatalf("Fatal error initializing database: %v", err)
	}
	defer database.Close()

	server := api.NewServer(database, syncDuration)
	handler := server.Routes()

	addr := ":" + port
	log.Printf("[Sequencer Backend] Server listening on http://localhost%s (CORS origin: %s)", addr, os.Getenv("FRONTEND_ORIGIN"))
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}
