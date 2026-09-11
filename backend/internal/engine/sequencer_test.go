package engine

import (
	"testing"

	"multi-window-media-sequencer/internal/models"
)

func TestCalculatePlayback_EmptyPlaylist(t *testing.T) {
	window := models.Window{
		ID:                   "win-1",
		Name:                 "Empty Window",
		CycleEpoch:           1000,
		CycleDurationSeconds: 18000,
	}

	state := CalculatePlayback(window, nil, 1050, nil)

	if state.ActiveItem == nil {
		t.Fatalf("expected non-nil ActiveItem fallback")
	}
	if state.ActiveItem.Type != models.MediaTypeBlank {
		t.Errorf("expected MediaTypeBlank, got %s", state.ActiveItem.Type)
	}
	if state.CycleElapsedSeconds != 50 {
		t.Errorf("expected CycleElapsedSeconds=50, got %d", state.CycleElapsedSeconds)
	}
}

func TestCalculatePlayback_MultiItemSequence(t *testing.T) {
	window := models.Window{
		ID:                   "win-1",
		Name:                 "Main Display",
		CycleEpoch:           1000,
		CycleDurationSeconds: 18000,
	}

	items := []models.MediaItem{
		{ID: "m1", WindowID: "win-1", OrderIndex: 0, Type: models.MediaTypeImage, URL: "https://example.com/1.jpg", DurationSeconds: 10},
		{ID: "m2", WindowID: "win-1", OrderIndex: 1, Type: models.MediaTypeVideo, URL: "https://example.com/2.mp4", DurationSeconds: 20},
		{ID: "m3", WindowID: "win-1", OrderIndex: 2, Type: models.MediaTypeBlank, URL: "", DurationSeconds: 30},
	}
	// Total playlist duration = 60s

	// Test at t = 1000 (0s elapsed): item m1, offset 0, remaining 10
	s0 := CalculatePlayback(window, items, 1000, nil)
	if s0.ActiveItem.ID != "m1" || s0.ActiveItemOffsetSec != 0 || s0.ActiveItemRemainingSec != 10 {
		t.Errorf("t=0 failed: got item=%s, offset=%d, rem=%d", s0.ActiveItem.ID, s0.ActiveItemOffsetSec, s0.ActiveItemRemainingSec)
	}

	// Test at t = 1005 (5s elapsed): item m1, offset 5, remaining 5
	s1 := CalculatePlayback(window, items, 1005, nil)
	if s1.ActiveItem.ID != "m1" || s1.ActiveItemOffsetSec != 5 || s1.ActiveItemRemainingSec != 5 {
		t.Errorf("t=5 failed: got item=%s, offset=%d, rem=%d", s1.ActiveItem.ID, s1.ActiveItemOffsetSec, s1.ActiveItemRemainingSec)
	}

	// Test at t = 1010 (10s elapsed): item m2, offset 0, remaining 20
	s2 := CalculatePlayback(window, items, 1010, nil)
	if s2.ActiveItem.ID != "m2" || s2.ActiveItemOffsetSec != 0 || s2.ActiveItemRemainingSec != 20 {
		t.Errorf("t=10 failed: got item=%s, offset=%d, rem=%d", s2.ActiveItem.ID, s2.ActiveItemOffsetSec, s2.ActiveItemRemainingSec)
	}

	// Test at t = 1025 (25s elapsed): item m2, offset 15, remaining 5
	s3 := CalculatePlayback(window, items, 1025, nil)
	if s3.ActiveItem.ID != "m2" || s3.ActiveItemOffsetSec != 15 || s3.ActiveItemRemainingSec != 5 {
		t.Errorf("t=25 failed: got item=%s, offset=%d, rem=%d", s3.ActiveItem.ID, s3.ActiveItemOffsetSec, s3.ActiveItemRemainingSec)
	}

	// Test at t = 1030 (30s elapsed): item m3, offset 0, remaining 30
	s4 := CalculatePlayback(window, items, 1030, nil)
	if s4.ActiveItem.ID != "m3" || s4.ActiveItemOffsetSec != 0 || s4.ActiveItemRemainingSec != 30 {
		t.Errorf("t=30 failed: got item=%s, offset=%d, rem=%d", s4.ActiveItem.ID, s4.ActiveItemOffsetSec, s4.ActiveItemRemainingSec)
	}

	// Test at t = 1060 (60s elapsed): playlist loops back to m1!
	s5 := CalculatePlayback(window, items, 1060, nil)
	if s5.ActiveItem.ID != "m1" || s5.ActiveItemOffsetSec != 0 || s5.ActiveItemRemainingSec != 10 {
		t.Errorf("t=60 loop failed: got item=%s, offset=%d, rem=%d", s5.ActiveItem.ID, s5.ActiveItemOffsetSec, s5.ActiveItemRemainingSec)
	}

	// Test at t = 1125 (125s elapsed -> 125 % 60 = 5s elapsed): item m1, offset 5, remaining 5
	s6 := CalculatePlayback(window, items, 1125, nil)
	if s6.ActiveItem.ID != "m1" || s6.ActiveItemOffsetSec != 5 || s6.ActiveItemRemainingSec != 5 {
		t.Errorf("t=125 loop failed: got item=%s, offset=%d, rem=%d", s6.ActiveItem.ID, s6.ActiveItemOffsetSec, s6.ActiveItemRemainingSec)
	}
}

func TestCalculatePlayback_FiveHourCycleHardReset(t *testing.T) {
	window := models.Window{
		ID:                   "win-1",
		Name:                 "Main Display",
		CycleEpoch:           0,
		CycleDurationSeconds: 18000, // 5 hours
	}

	// Playlist total duration = 70 seconds (18000 % 70 = 10 remainder)
	items := []models.MediaItem{
		{ID: "m1", WindowID: "win-1", OrderIndex: 0, Type: models.MediaTypeImage, DurationSeconds: 30},
		{ID: "m2", WindowID: "win-1", OrderIndex: 1, Type: models.MediaTypeVideo, DurationSeconds: 40},
	}

	// At t = 17990s: cycleElapsed = 17990. 17990 % 70 = 0 -> item m1, offset 0
	sPre1 := CalculatePlayback(window, items, 17990, nil)
	if sPre1.ActiveItem.ID != "m1" || sPre1.ActiveItemOffsetSec != 0 {
		t.Errorf("t=17990 failed: got item=%s, offset=%d", sPre1.ActiveItem.ID, sPre1.ActiveItemOffsetSec)
	}

	// At t = 17999s: cycleElapsed = 17999. 17999 % 70 = 9 -> item m1, offset 9, remaining 21
	sPre2 := CalculatePlayback(window, items, 17999, nil)
	if sPre2.ActiveItem.ID != "m1" || sPre2.ActiveItemOffsetSec != 9 || sPre2.ActiveItemRemainingSec != 21 {
		t.Errorf("t=17999 failed: got item=%s, offset=%d, rem=%d", sPre2.ActiveItem.ID, sPre2.ActiveItemOffsetSec, sPre2.ActiveItemRemainingSec)
	}

	// At t = 18000s (exact 5-hour mark): cycleElapsed = 18000 % 18000 = 0 -> hard reset to start of playlist (m1, offset 0)!
	sBoundary := CalculatePlayback(window, items, 18000, nil)
	if sBoundary.CycleElapsedSeconds != 0 {
		t.Errorf("expected CycleElapsedSeconds=0 at 5hr boundary, got %d", sBoundary.CycleElapsedSeconds)
	}
	if sBoundary.ActiveItem.ID != "m1" || sBoundary.ActiveItemOffsetSec != 0 || sBoundary.ActiveItemRemainingSec != 30 {
		t.Errorf("t=18000 5hr hard-reset failed: got item=%s, offset=%d, rem=%d", sBoundary.ActiveItem.ID, sBoundary.ActiveItemOffsetSec, sBoundary.ActiveItemRemainingSec)
	}

	// At t = 36005s (second 5-hour cycle, 5s in): cycleElapsed = 5 -> m1, offset 5, remaining 25
	sNextCycle := CalculatePlayback(window, items, 36005, nil)
	if sNextCycle.CycleElapsedSeconds != 5 {
		t.Errorf("expected CycleElapsedSeconds=5 at 10hr+5s, got %d", sNextCycle.CycleElapsedSeconds)
	}
	if sNextCycle.ActiveItem.ID != "m1" || sNextCycle.ActiveItemOffsetSec != 5 || sNextCycle.ActiveItemRemainingSec != 25 {
		t.Errorf("t=36005 failed: got item=%s, offset=%d", sNextCycle.ActiveItem.ID, sNextCycle.ActiveItemOffsetSec)
	}
}

func TestCalculatePlayback_PlaylistEditsPreserveEpoch(t *testing.T) {
	epoch := int64(1000)
	window := models.Window{
		ID:                   "win-1",
		Name:                 "Main Display",
		CycleEpoch:           epoch,
		CycleDurationSeconds: 18000,
	}

	initialItems := []models.MediaItem{
		{ID: "m1", WindowID: "win-1", OrderIndex: 0, DurationSeconds: 20},
		{ID: "m2", WindowID: "win-1", OrderIndex: 1, DurationSeconds: 20},
	}

	// At t = 1015 (15s after epoch): m1 at offset 15
	sBefore := CalculatePlayback(window, initialItems, 1015, nil)
	if sBefore.ActiveItem.ID != "m1" || sBefore.ActiveItemOffsetSec != 15 {
		t.Errorf("initial state failed: got item=%s, offset=%d", sBefore.ActiveItem.ID, sBefore.ActiveItemOffsetSec)
	}

	// User adds m3 (10s) to playlist. Epoch remains untouched!
	editedItems := []models.MediaItem{
		{ID: "m1", WindowID: "win-1", OrderIndex: 0, DurationSeconds: 20},
		{ID: "m2", WindowID: "win-1", OrderIndex: 1, DurationSeconds: 20},
		{ID: "m3", WindowID: "win-1", OrderIndex: 2, DurationSeconds: 10},
	}
	// Total duration is now 50s.
	// At t = 1015, elapsed is still 15s -> still m1 at offset 15!
	sAfter := CalculatePlayback(window, editedItems, 1015, nil)
	if sAfter.ActiveItem.ID != "m1" || sAfter.ActiveItemOffsetSec != 15 {
		t.Errorf("edited state failed at t=1015: got item=%s, offset=%d", sAfter.ActiveItem.ID, sAfter.ActiveItemOffsetSec)
	}

	// At t = 1045 (45s elapsed): in initialItems (40s total), 45 % 40 = 5 -> m1 offset 5.
	// In editedItems (50s total), 45 % 50 = 45 -> m3 (which runs from 40..50) offset 5!
	sAfter45 := CalculatePlayback(window, editedItems, 1045, nil)
	if sAfter45.ActiveItem.ID != "m3" || sAfter45.ActiveItemOffsetSec != 5 || sAfter45.ActiveItemRemainingSec != 5 {
		t.Errorf("edited state failed at t=1045: got item=%s, offset=%d, rem=%d", sAfter45.ActiveItem.ID, sAfter45.ActiveItemOffsetSec, sAfter45.ActiveItemRemainingSec)
	}
}

func TestCalculatePlayback_SyncOverrideAndSeamlessResume(t *testing.T) {
	window := models.Window{
		ID:                   "win-1",
		Name:                 "Main Display",
		CycleEpoch:           1000,
		CycleDurationSeconds: 18000,
	}

	items := []models.MediaItem{
		{ID: "m1", WindowID: "win-1", OrderIndex: 0, Type: models.MediaTypeImage, DurationSeconds: 30},
		{ID: "m2", WindowID: "win-1", OrderIndex: 1, Type: models.MediaTypeVideo, DurationSeconds: 30},
	}

	// Sync triggered at t=1010 for duration=10s (ends at t=1020)
	sync := &models.SyncState{
		ID:              "sync-1",
		Type:            models.MediaTypeVideo,
		URL:             "https://example.com/urgent-broadcast.mp4",
		DurationSeconds: 10,
		StartedAt:       1010,
	}

	// 1. Before sync starts (t = 1008): Normal playback (m1 at offset 8)
	sPre := CalculatePlayback(window, items, 1008, sync)
	if sPre.IsSyncActive {
		t.Errorf("expected sync inactive at t=1008")
	}
	if sPre.ActiveItem.ID != "m1" || sPre.ActiveItemOffsetSec != 8 {
		t.Errorf("expected m1 at offset 8, got %s offset %d", sPre.ActiveItem.ID, sPre.ActiveItemOffsetSec)
	}

	// 2. During sync (t = 1014, which is 4s into sync):
	// ActiveItem MUST be the sync item (offset 4, remaining 6).
	// NaturalItem MUST STILL BE m1 at offset 14, remaining 16!
	sDuring := CalculatePlayback(window, items, 1014, sync)
	if !sDuring.IsSyncActive {
		t.Errorf("expected sync active at t=1014")
	}
	if sDuring.ActiveItem.ID != "sync-1" || sDuring.ActiveItemOffsetSec != 4 || sDuring.ActiveItemRemainingSec != 6 {
		t.Errorf("sync active item mismatch: id=%s, offset=%d, rem=%d", sDuring.ActiveItem.ID, sDuring.ActiveItemOffsetSec, sDuring.ActiveItemRemainingSec)
	}
	if sDuring.NaturalItem.ID != "m1" || sDuring.NaturalItemOffsetSec != 14 || sDuring.NaturalItemRemainingSec != 16 {
		t.Errorf("natural background item mismatch: id=%s, offset=%d, rem=%d", sDuring.NaturalItem.ID, sDuring.NaturalItemOffsetSec, sDuring.NaturalItemRemainingSec)
	}

	// 3. Immediately after sync ends (t = 1020):
	// ActiveItem seamlessly resumes natural playback at t=1020 (m1 at offset 20, remaining 10).
	sPost := CalculatePlayback(window, items, 1020, sync)
	if sPost.IsSyncActive {
		t.Errorf("expected sync inactive at t=1020")
	}
	if sPost.ActiveItem.ID != "m1" || sPost.ActiveItemOffsetSec != 20 || sPost.ActiveItemRemainingSec != 10 {
		t.Errorf("expected seamless resume to m1 offset 20 at t=1020, got id=%s, offset=%d, rem=%d", sPost.ActiveItem.ID, sPost.ActiveItemOffsetSec, sPost.ActiveItemRemainingSec)
	}

	// 4. Later at t = 1035 (35s elapsed from epoch 1000):
	// Natural sequence has transitioned to m2 at offset 5! Zero drift or pause lag.
	sLater := CalculatePlayback(window, items, 1035, sync)
	if sLater.ActiveItem.ID != "m2" || sLater.ActiveItemOffsetSec != 5 || sLater.ActiveItemRemainingSec != 25 {
		t.Errorf("expected m2 at offset 5 at t=1035, got id=%s, offset=%d, rem=%d", sLater.ActiveItem.ID, sLater.ActiveItemOffsetSec, sLater.ActiveItemRemainingSec)
	}
}

func TestCalculatePlayback_PrimeDurationBoundary(t *testing.T) {
	window := models.Window{
		ID:                   "win-prime",
		Name:                 "Prime Duration Display",
		CycleEpoch:           0,
		CycleDurationSeconds: 18000,
	}

	// Total duration = 37s (prime, does not divide 18000; 18000 % 37 = 18)
	items := []models.MediaItem{
		{ID: "m1", WindowID: "win-prime", OrderIndex: 0, Type: models.MediaTypeImage, DurationSeconds: 17},
		{ID: "m2", WindowID: "win-prime", OrderIndex: 1, Type: models.MediaTypeVideo, DurationSeconds: 20},
	}

	// At t = 17999s: cycleElapsed = 17999. 17999 % 37 = 17 -> item m2 at offset 0, remaining 20
	s17999 := CalculatePlayback(window, items, 17999, nil)
	if s17999.ActiveItem.ID != "m2" || s17999.ActiveItemOffsetSec != 0 || s17999.ActiveItemRemainingSec != 20 {
		t.Errorf("t=17999 failed: got id=%s, offset=%d, rem=%d", s17999.ActiveItem.ID, s17999.ActiveItemOffsetSec, s17999.ActiveItemRemainingSec)
	}

	// At t = 18000s (hard reset boundary): cycleElapsed = 0 -> item m1 at offset 0, remaining 17
	s18000 := CalculatePlayback(window, items, 18000, nil)
	if s18000.CycleElapsedSeconds != 0 {
		t.Errorf("expected CycleElapsedSeconds=0, got %d", s18000.CycleElapsedSeconds)
	}
	if s18000.ActiveItem.ID != "m1" || s18000.ActiveItemOffsetSec != 0 || s18000.ActiveItemRemainingSec != 17 {
		t.Errorf("t=18000 failed: got id=%s, offset=%d, rem=%d", s18000.ActiveItem.ID, s18000.ActiveItemOffsetSec, s18000.ActiveItemRemainingSec)
	}

	// At t = 18001s: cycleElapsed = 1 -> item m1 at offset 1, remaining 16
	s18001 := CalculatePlayback(window, items, 18001, nil)
	if s18001.ActiveItem.ID != "m1" || s18001.ActiveItemOffsetSec != 1 || s18001.ActiveItemRemainingSec != 16 {
		t.Errorf("t=18001 failed: got id=%s, offset=%d, rem=%d", s18001.ActiveItem.ID, s18001.ActiveItemOffsetSec, s18001.ActiveItemRemainingSec)
	}
}

func TestCalculatePlayback_EmptyPlaylistWithSync(t *testing.T) {
	window := models.Window{
		ID:                   "win-empty",
		Name:                 "Empty Window",
		CycleEpoch:           1000,
		CycleDurationSeconds: 18000,
	}

	sync := &models.SyncState{
		ID:              "sync-override",
		Type:            models.MediaTypeImage,
		URL:             "https://example.com/sync.jpg",
		DurationSeconds: 10,
		StartedAt:       1050,
	}

	// During sync (t = 1055)
	sDuring := CalculatePlayback(window, nil, 1055, sync)
	if !sDuring.IsSyncActive || sDuring.ActiveItem.ID != "sync-override" {
		t.Errorf("expected sync active on empty window, got %+v", sDuring)
	}
	if sDuring.NaturalItem.Type != models.MediaTypeBlank {
		t.Errorf("expected fallback blank natural item, got %+v", sDuring.NaturalItem)
	}

	// After sync (t = 1060)
	sAfter := CalculatePlayback(window, nil, 1060, sync)
	if sAfter.IsSyncActive || sAfter.ActiveItem.Type != models.MediaTypeBlank {
		t.Errorf("expected fallback blank active item after sync, got %+v", sAfter)
	}
}
