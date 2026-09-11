# Multi-Window Media Sequencer with Sync Playback

A high-performance full-stack application where multiple independent display windows continuously loop their own configured media playlists (images, MP4 videos, blank intermission slots) inside a fixed 5-hour cycle, with zero-drift synchronized broadcast overrides across all windows.

---

## 🌟 Architecture & Key Design Principles

### 1. Wall-Clock Derived Playback (Zero State Bookkeeping)
Traditional media playback systems maintain stateful pointers, timers, or next-item queues, which are prone to drift, desynchronization across browser tabs, and complex pause/resume state corruption.

In this architecture, at any moment $t$ (Unix timestamp in seconds), the currently playing media item is a **pure deterministic function of wall-clock time**:
$$\text{elapsed} = (t - \text{cycle\_epoch}) \pmod{\text{cycle\_duration\_seconds}}$$
where:
- $\text{cycle\_epoch}$ is a fixed Unix timestamp set once at creation time and never resets during ordinary edits.
- $\text{cycle\_duration\_seconds} = 18000\text{s}$ (5 hours).

The sequencer sums the cumulative durations of playlist items to find:
$$\text{playlist\_elapsed} = \text{elapsed} \pmod{\text{total\_playlist\_duration}}$$
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
- **Non-evenly dividing playlists**: If a playlist's total duration does not evenly divide 18,000s (e.g., 37s or 70s), at $t = 17,999\text{s}$ the player renders the item corresponding to $17,999 \pmod{\text{total\_duration}}$, and at $t = 18,000\text{s}$ it resets to item 0 at offset 0.

### 3. Stateless Global Sync Overrides & Zero-Drift Resumption
When a sync event is triggered with duration $D$ starting at $T_{start}$:
- While $t \in [T_{start}, T_{start} + D)$, every window displays the synchronized media item.
- The underlying natural wall-clock calculation continues advancing uninterrupted in the background.
- At $t \ge T_{start} + D$, each window automatically resumes its natural sequence at the exact item and second it would naturally be at, requiring **zero explicit pause/resume bookkeeping**.
- **Mid-Item Video Resumption**: When a window resumes a video mid-item, the video element initializes/seeks directly to the current offset (`video.currentTime = offset`) rather than restarting from 0.

### 4. Video Drift Correction Threshold
To guarantee smooth video playback without stutter or micro-jitter on every tick, client-side video synchronization applies a threshold: `video.currentTime` is only re-adjusted if the drift between the video element and wall-clock offset exceeds **1.5 seconds**.

### 5. Concurrent Sync Trigger Behavior
If a sync event is triggered while another sync is currently active, the newest sync **overwrites / supersedes** the previous sync immediately, resetting the active sync media and timer.

### 6. Empty Playlist Fallback State
If a window has no media items (or total duration is 0), the sequencer emits a safe fallback `blank` item covering the cycle duration. If a sync is triggered, the blank display is overridden by the synced media and seamlessly returns to blank when sync expires.

### 7. Playlist Edits & Timing Shifts
When a media item is added or deleted from a window's playlist:
- $\text{cycle\_epoch}$ remains **strictly unchanged** to prevent unexpected jump resets.
- By design, inserting or removing an item modifies the cumulative timeline; subsequent items shift relative to wall-clock time according to the new sequence length.

---

## 🛠️ Tech Stack

- **Backend**: Golang (`net/http`, RESTful JSON API)
- **Database**: SQLite with `modernc.org/sqlite` (Pure Go, 100% CGO-free, WAL mode)
- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS Design System
- **Containerization**: Multi-stage Docker build

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

### 1. Start the Go Backend
```bash
cd backend
go run ./cmd/server
```
*The backend starts on `http://localhost:8080` and creates `sequencer.db` with auto-seeded windows.*

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

---

## 🐳 Docker & Production Deployment

### 1. Running with Docker Compose
```bash
docker-compose up --build
```

### 2. Backend Deployment (Render / Fly.io / Railway)
- **Runtime**: Docker (uses [`backend/Dockerfile`](file:///d:/Multi-Window%20Media%20Sequencer%20with%20Sync%20Playback/backend/Dockerfile))
- **Environment Variables**:
  | Variable | Default Value | Description |
  |---|---|---|
  | `PORT` | `8080` | Port for the HTTP server |
  | `DB_PATH` | `/data/sequencer.db` | SQLite database file location |
  | `FRONTEND_ORIGIN` | `*` | Allowed CORS origin (e.g. `https://your-frontend.vercel.app`) |
  | `DEFAULT_SYNC_DURATION_SECONDS` | `10` | Default sync broadcast duration |

> **Note on Free-Tier Hosting**: When deployed on Render free tier, the service may spin down after 15 minutes of inactivity. The first request after spin-down may take ~30–50s to cold-start. SQLite data persists via Docker volumes.

### 3. Frontend Deployment (Vercel / Netlify)
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  | Variable | Example Value | Description |
  |---|---|---|
  | `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | Base URL of deployed Go backend |

---

## 🧪 Verification & Testing Guide

1. **Multi-Window Playback**: Open `http://localhost:5173` across multiple browser windows. Verify that all windows show synchronized clock headers and smooth item transitions.
2. **Global Sync Override**: In the top control panel, click `🚨 Emergency Alert (10s)`. Verify all 3 windows immediately transition to the emergency video, display the broadcast countdown HUD, and simultaneously return to their natural loop positions without drift.
3. **Mid-Item Video Resume**: Observe a window scheduled to play a video when sync ends; confirm the video element seeks directly to the current offset rather than frame 0.
4. **Dynamic Playlist Edits**: Click `Add Media` on Window 1, select a sample preset, and submit. Verify that Window 1 updates its timeline immediately without resetting `cycle_epoch`.
