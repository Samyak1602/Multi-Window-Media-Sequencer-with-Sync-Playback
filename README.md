# Multi-Window Media Sequencer with Sync Playback

A high-performance full-stack application where multiple independent display windows continuously loop their own configured media playlists (images, MP4 videos, blank intermission slots) inside a fixed 5-hour cycle, with zero-drift synchronized broadcast overrides across all windows.

---

## 🌟 Architecture & Key Design Principles

### 1. Wall-Clock Derived Playback (Zero State Bookkeeping)
Traditional media playback systems maintain stateful pointers, timers, or next-item queues, which are prone to drift, desynchronization across browser tabs, and complex pause/resume state corruption.

In this architecture, at any moment `t` (Unix timestamp in seconds), the currently playing media item is a **pure deterministic function of wall-clock time**:

```
elapsed = (now_unix - cycle_epoch) % cycle_duration_seconds
```

where:
- `cycle_epoch` is a fixed Unix timestamp set once at creation time and never resets during ordinary edits.
- `cycle_duration_seconds` = 18000s (5 hours).

The sequencer sums the cumulative durations of playlist items to find:

```
playlist_elapsed = elapsed % total_playlist_duration
```

and iterates cumulative durations to find the exact item index, the second offset within that item, and the remaining time.

```
+-----------------------------------------------------------------------------------+
|                           5-Hour Cycle (18,000s)                                  |
| [ Item 1 (15s) ] [ Item 2 (20s) ] [ Item 3 (15s) ] [ Item 1 ... ] ... Hard Reset |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │
                           now_unix - cycle_epoch (mod 18000)
```

### 2. 5-Hour Cycle Hard Reset Boundary
Every exactly 18,000 seconds (5 hours), the cycle resets to offset 0 (the first item of the playlist), regardless of where the previous loop landed.
- **Non-evenly dividing playlists**: If a playlist's total duration does not evenly divide 18,000s (e.g., 37s or 70s), at `t = 17,999s` the player renders the item corresponding to `17,999 % total_duration`, and at `t = 18,000s` it resets to item 0 at offset 0.

### 3. Stateless Global Sync Overrides & Zero-Drift Resumption
When a sync event is triggered with duration `D` starting at `T_start`:
- While `t >= T_start` and `t < T_start + D`, every window displays the synchronized media item.
- The underlying natural wall-clock calculation continues advancing uninterrupted in the background.
- At `t >= T_start + D`, each window automatically resumes its natural sequence at the exact item and second it would naturally be at, requiring **zero explicit pause/resume bookkeeping**.
- **Mid-Item Video Resumption**: When a window resumes a video mid-item, the video element initializes/seeks directly to the current offset (`video.currentTime = offset`) rather than restarting from 0.

### 4. Video Drift Correction Threshold
To guarantee smooth video playback without stutter or micro-jitter on every tick, client-side video synchronization applies a threshold: `video.currentTime` is only re-adjusted if the drift between the video element and wall-clock offset exceeds **1.5 seconds**.

### 5. Concurrent Sync Trigger Behavior
If a sync event is triggered while another sync is currently active, the newest sync **overwrites / supersedes** the previous sync immediately, resetting the active sync media and timer.

### 6. Empty Playlist Fallback State
If a window has no media items (or total duration is 0), the sequencer emits a safe fallback `blank` item covering the cycle duration. If a sync is triggered, the blank display is overridden by the synced media and seamlessly returns to blank when sync expires.

### 7. Playlist Edits & Timing Shifts
When a media item is added or deleted from a window's playlist:
- `cycle_epoch` remains **strictly unchanged** to prevent unexpected jump resets.
- By design, inserting or removing an item modifies the cumulative timeline; subsequent items shift relative to wall-clock time according to the new sequence length.

---

## 🛠️ Tech Stack

- **Backend**: Golang (`net/http`, RESTful JSON API, native Go buildpack on Render)
- **Database**: SQLite with `modernc.org/sqlite` (Pure Go, 100% CGO-free, WAL mode)
- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS Design System (hosted on Vercel / Netlify)
- **Local Containerization**: Dockerfile & Docker Compose (available for local containerized development)

---

## 📡 REST API Reference

### 1. `GET /api/health`
Returns service health and current server timestamp.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "server_time": 1773400000
  }
  ```

### 2. `GET /api/windows`
Returns all display windows with their configured playlists and real-time resolved `playback_state`.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "win-1",
      "name": "Window 1 - Lobby Display",
      "cycle_epoch": 1773400000,
      "cycle_duration_seconds": 18000,
      "playlist": [
        {
          "id": "m1-1",
          "window_id": "win-1",
          "order_index": 0,
          "type": "image",
          "url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
          "duration_seconds": 15
        }
      ],
      "playback_state": {
        "window_id": "win-1",
        "server_time": 1773400025,
        "cycle_epoch": 1773400000,
        "cycle_duration_seconds": 18000,
        "cycle_elapsed_seconds": 25,
        "cycle_remaining_seconds": 17975,
        "active_item": { ... },
        "active_item_index": 1,
        "active_item_offset_seconds": 10,
        "active_item_remaining_seconds": 5,
        "is_sync_active": false,
        "sync_remaining_seconds": 0,
        "natural_item": { ... }
      }
    }
  ]
  ```

### 3. `GET /api/windows/{id}`
Returns a single window with its playlist and live playback state.

### 4. `POST /api/windows/{id}/media`
Adds a media item to a window's playlist.
- **Request Body**:
  ```json
  {
    "type": "image",
    "url": "https://example.com/photo.jpg",
    "duration_seconds": 15,
    "order_index": 2
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "m-8f92a10c",
    "window_id": "win-1",
    "order_index": 2,
    "type": "image",
    "url": "https://example.com/photo.jpg",
    "duration_seconds": 15
  }
  ```

### 5. `DELETE /api/media/{id}`
Deletes a media item and automatically re-indexes remaining items.
- **Response `200 OK`**:
  ```json
  {
    "message": "Media item deleted successfully"
  }
  ```

### 6. `POST /api/sync`
Triggers a synchronized override across all display windows.
- **Request Body**:
  ```json
  {
    "type": "video",
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "duration_seconds": 10
  }
  ```
  *(Or specify `"media_item_id": "m1-2"` to reference an existing item)*
- **Response `201 Created`**:
  ```json
  {
    "is_active": true,
    "sync": {
      "id": "sync-a1b2c3d4",
      "type": "video",
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "duration_seconds": 10,
      "started_at": 1773400030
    },
    "remaining_seconds": 10,
    "server_time": 1773400030
  }
  ```

### 7. `GET /api/sync/status`
Returns whether a sync broadcast is currently active, remaining seconds, and server time.

### 8. `POST /api/sync/cancel`
Immediately terminates the active sync broadcast, resuming natural sequences across all windows.

---

## 🚀 Local Development Setup

### Prerequisites
- **Go**: 1.22+ or 1.24+
- **Node.js**: 18+ or 20+
- **npm**: 9+

### 1. Start the Go Backend (Native)
```bash
cd backend
go run ./cmd/server
```
*The backend starts on `http://localhost:8080` and creates `./sequencer.db` with auto-seeded windows.*

To run the automated backend test suite:
```bash
cd backend
go test -v ./...
```

### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend starts on `http://localhost:5173`.*

### 3. Optional: Running via Docker locally
The repo includes a `Dockerfile` and `docker-compose.yml` for containerized local workflows:
```bash
docker-compose up --build
```
*(Note: Docker is provided for local dev flexibility; the deployed backend runs natively on Render's Go environment).*

---

## 🌐 Production Deployment

### 1. Backend Deployment: Render (Native Go Environment)
Since our SQLite driver (`modernc.org/sqlite`) is pure Go with zero CGO dependencies, the backend deploys seamlessly on Render's native Go runtime:

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `media-sequencer-backend`
   - **Environment / Runtime**: **Go**
   - **Root Directory**: `backend`
   - **Build Command**: `go build -o app ./cmd/server`
   - **Start Command**: `./app`
   - **Instance Type**: **Free**
4. Set Environment Variables:
   | Key | Value | Description |
   |---|---|---|
   | `PORT` | `8080` | Port Render routes traffic to |
   | `DB_PATH` | `./sequencer.db` | Relative SQLite database file path |
   | `FRONTEND_ORIGIN` | `*` *(or your Vercel URL)* | Allowed CORS origin |
   | `DEFAULT_SYNC_DURATION_SECONDS` | `10` | Default sync broadcast duration |
5. Set **Health Check Path** to `/api/health`.
6. Click **Create Web Service**.

> [!NOTE]
> **Render Free-Tier Ephemeral Filesystem & Cold Starts**:
> 1. **Ephemeral Disk**: Render's free tier has an ephemeral filesystem without persistent disk attachments. When the free-tier service spins down after 15m of inactivity or restarts, the SQLite database re-seeds automatically upon startup to the clean seed dataset. This is a known hosting limitation of free tiers, not a bug.
> 2. **Cold Start**: The first request after a spin-down may take ~30–50s to boot up. Subsequent requests respond instantly.

---

### 2. Frontend Deployment: Vercel / Netlify
1. In [Vercel](https://vercel.com), click **Add New...** -> **Project** and select your repository.
2. Configure the build settings:
   - **Framework Preset**: **Vite**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://your-backend.onrender.com` *(your deployed Render backend URL)* |
4. Click **Deploy**.

> [!IMPORTANT]
> **API Base URL Wiring**: Vite embeds `VITE_API_BASE_URL` into the production client bundle at build time. When your backend URL is set in Vercel/Netlify environment variables, ensure a build is triggered so the compiled JS bundle calls the live Render backend.

---

## 🧪 Verification & Testing Guide

1. **Multi-Window Playback**: Open the deployed frontend URL across multiple browser tabs. Confirm that all tabs display synchronized clocks and identical item transitions.
2. **Global Sync Override**: In the controller panel, click `🚨 Emergency Alert (10s)`. Confirm all windows immediately switch to the sync broadcast, show the countdown HUD, and simultaneously return to their natural loop positions without drift.
3. **Mid-Item Video Resumption**: Observe a window scheduled to play a video when sync ends; confirm the video element seeks directly to the current offset rather than restarting from frame 0.
4. **Dynamic Playlist Edits**: Click `Add Media` on any window, select a sample preset, and submit. Confirm the playlist updates live while preserving `cycle_epoch`.
