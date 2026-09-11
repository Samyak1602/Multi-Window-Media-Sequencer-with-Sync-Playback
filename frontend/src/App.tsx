import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SyncControlPanel } from './components/SyncControlPanel';
import { WindowCard } from './components/WindowCard';
import { AddMediaModal } from './components/AddMediaModal';
import { ArchitectureExplainerModal } from './components/ArchitectureExplainerModal';
import { 
  getWindows, 
  getSyncStatus, 
  addMediaItem, 
  deleteMediaItem, 
  triggerSync, 
  cancelSync 
} from './services/api';
import type { 
  WindowWithPlayback, 
  SyncStatusResponse, 
  AddMediaItemPayload, 
  TriggerSyncPayload,
  PlaybackState
} from './types';
import { calculateClientPlayback } from './utils/sequencer';
import { AlertTriangle, MonitorPlay } from 'lucide-react';

export const App: React.FC = () => {
  const [windows, setWindows] = useState<WindowWithPlayback[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [targetAddWindowId, setTargetAddWindowId] = useState<string>('');
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState<boolean>(false);

  // Poll backend for windows and sync status
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [fetchedWindows, fetchedSync] = await Promise.all([
        getWindows(),
        getSyncStatus(),
      ]);

      const clientNow = Math.floor(Date.now() / 1000);
      if (fetchedSync?.server_time) {
        setServerTimeOffset(fetchedSync.server_time - clientNow);
      }

      setWindows(fetchedWindows);
      setSyncStatus(fetchedSync);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setErrorMessage(err.message || 'Unable to connect to backend server. Make sure the Go backend is running on port 8080.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial load + short polling every 1.5s
  useEffect(() => {
    loadData(true);
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [loadData]);

  // High-frequency client-side wall-clock tick (every 250ms) for ultra-smooth animations and zero-drift UI
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000) + serverTimeOffset;
      setCurrentTime(now);
    }, 250);

    return () => clearInterval(clockInterval);
  }, [serverTimeOffset]);

  // Compute live playback states for all windows on every tick
  const livePlaybackStates: Record<string, PlaybackState> = {};
  windows.forEach((win) => {
    livePlaybackStates[win.id] = calculateClientPlayback(
      win,
      win.playlist,
      currentTime,
      syncStatus?.is_active ? syncStatus.sync : null
    );
  });

  // Action Handlers
  const handleOpenAddModal = (windowId: string) => {
    setTargetAddWindowId(windowId);
    setIsAddModalOpen(true);
  };

  const handleAddMedia = async (windowId: string, payload: AddMediaItemPayload) => {
    setIsSubmitting(true);
    try {
      await addMediaItem(windowId, payload);
      await loadData(false);
    } catch (err: any) {
      alert(`Error adding media: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    setIsDeleting(true);
    try {
      await deleteMediaItem(mediaId);
      await loadData(false);
    } catch (err: any) {
      alert(`Error deleting media: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTriggerSync = async (payload: TriggerSyncPayload) => {
    setIsTriggeringSync(true);
    try {
      const res = await triggerSync(payload);
      setSyncStatus(res);
      await loadData(false);
    } catch (err: any) {
      alert(`Error triggering sync: ${err.message}`);
    } finally {
      setIsTriggeringSync(false);
    }
  };

  const handleCancelSync = async () => {
    try {
      await cancelSync();
      await loadData(false);
    } catch (err: any) {
      alert(`Error cancelling sync: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        serverTime={currentTime}
        syncStatus={syncStatus}
        onRefresh={() => loadData(true)}
        isLoading={isLoading}
        onOpenExplainer={() => setIsExplainerOpen(true)}
      />

      {/* Backend Error Banner if any */}
      {errorMessage && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fecdd3',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} color="#f43f5e" />
          <div style={{ fontSize: '0.86rem' }}>
            <strong>Connection Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Global Sync Controller Panel */}
      <SyncControlPanel
        syncStatus={syncStatus}
        windows={windows}
        onTriggerSync={handleTriggerSync}
        onCancelSync={handleCancelSync}
        isTriggering={isTriggeringSync}
      />

      {/* Multi-Window Display Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MonitorPlay size={20} color="#00f0ff" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Live Display Screens ({windows.length} Independent Windows)
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Each window computes its position independently from wall-clock time
          </span>
        </div>

        {isLoading && windows.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="live-indicator-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
            <p>Connecting to backend and loading synchronized display windows...</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '24px',
            }}
          >
            {windows.map((win) => {
              const currentPlayback = livePlaybackStates[win.id] || win.playback_state;
              return (
                <WindowCard
                  key={win.id}
                  windowData={win}
                  playbackState={currentPlayback}
                  onOpenAddModal={handleOpenAddModal}
                  onDeleteItem={handleDeleteItem}
                  isDeleting={isDeleting}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add Media Modal */}
      <AddMediaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        windows={windows}
        initialWindowId={targetAddWindowId}
        onAddMedia={handleAddMedia}
        isSubmitting={isSubmitting}
      />

      {/* Architecture Explainer Modal */}
      <ArchitectureExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />
    </div>
  );
};

export default App;
