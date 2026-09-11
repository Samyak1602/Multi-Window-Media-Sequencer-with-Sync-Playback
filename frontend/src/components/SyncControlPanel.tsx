import React, { useState } from 'react';
import { Zap, Play, XCircle } from 'lucide-react';
import type { SyncStatusResponse, WindowWithPlayback, MediaType } from '../types';

interface SyncControlPanelProps {
  syncStatus: SyncStatusResponse | null;
  windows: WindowWithPlayback[];
  onTriggerSync: (payload: { media_item_id?: string; type?: MediaType; url?: string; duration_seconds?: number }) => Promise<void>;
  onCancelSync: () => Promise<void>;
  isTriggering: boolean;
}

const PRESET_SYNCS = [
  {
    name: '🚨 Emergency Alert',
    type: 'video' as MediaType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 10,
    badge: 'Video • 10s',
  },
  {
    name: '🎬 Cinematic Promo Reel',
    type: 'video' as MediaType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 12,
    badge: 'Video • 12s',
  },
  {
    name: '✨ VIP Global Announcement',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1400&q=80',
    duration: 8,
    badge: 'Image • 8s',
  },
  {
    name: '☕ Flash Sale Promotion',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80',
    duration: 10,
    badge: 'Image • 10s',
  },
];

export const SyncControlPanel: React.FC<SyncControlPanelProps> = ({
  syncStatus,
  windows,
  onTriggerSync,
  onCancelSync,
  isTriggering,
}) => {
  const [selectedSourceType, setSelectedSourceType] = useState<'preset' | 'existing' | 'custom'>('preset');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customType, setCustomType] = useState<MediaType>('video');
  const [customUrl, setCustomUrl] = useState<string>('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4');
  const [customDuration, setCustomDuration] = useState<number>(10);

  const isSyncActive = syncStatus?.is_active || false;
  const remainingSeconds = syncStatus?.remaining_seconds || 0;
  const totalSyncDuration = syncStatus?.sync?.duration_seconds || 10;
  const progressPercent = isSyncActive && totalSyncDuration > 0
    ? Math.min(100, Math.max(0, ((totalSyncDuration - remainingSeconds) / totalSyncDuration) * 100))
    : 0;

  // Flatten all items across all windows
  const allMediaItems = windows.flatMap((w) =>
    w.playlist.map((item) => ({ ...item, windowName: w.name }))
  );

  const handleTriggerCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSourceType === 'existing') {
      if (!selectedItemId && allMediaItems.length > 0) {
        await onTriggerSync({ media_item_id: allMediaItems[0].id, duration_seconds: customDuration });
      } else {
        await onTriggerSync({ media_item_id: selectedItemId, duration_seconds: customDuration });
      }
    } else {
      await onTriggerSync({
        type: customType,
        url: customUrl,
        duration_seconds: customDuration,
      });
    }
  };

  return (
    <div className={isSyncActive ? 'glass-panel-sync' : 'glass-panel'} style={{ padding: '22px 28px', transition: 'all 0.3s ease' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isSyncActive ? 'rgba(255, 170, 0, 0.25)' : 'rgba(0, 240, 255, 0.15)',
            border: isSyncActive ? '1px solid #ffaa00' : '1px solid rgba(0, 240, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={20} color={isSyncActive ? '#ffaa00' : '#00f0ff'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Synchronized Broadcast Controller
              </h2>
              {isSyncActive ? (
                <span className="badge badge-amber font-mono">
                  ACTIVE • {remainingSeconds}s remaining
                </span>
              ) : (
                <span className="badge badge-muted">Idle / Standby</span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Broadcasts a single media item across all windows simultaneously, then auto-resumes natural sequences.
            </p>
          </div>
        </div>

        {/* Live Active Sync Controls & Progress */}
        {isSyncActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                <span style={{ color: '#ffaa00', fontWeight: 600 }}>Sync Progress</span>
                <span className="font-mono" style={{ color: '#fed7aa' }}>{Math.round(progressPercent)}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill progress-fill-amber" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <button
              onClick={onCancelSync}
              className="btn btn-cancel"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <XCircle size={16} />
              <span>Cancel Sync Override</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick 1-Click Broadcast Presets */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 600 }}>
          ⚡ 1-Click Sync Broadcast Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {PRESET_SYNCS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerSync({ type: preset.type, url: preset.url, duration_seconds: preset.duration })}
              disabled={isTriggering}
              className="glass-panel"
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.2s ease',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-amber)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {preset.name}
                </span>
                <Play size={13} color="#ffaa00" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                  {preset.badge}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Sync Trigger Controls */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Custom Sync Override Configuration
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSelectedSourceType('existing')}
              className={selectedSourceType === 'existing' ? 'badge badge-cyan' : 'badge badge-muted'}
              style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
            >
              Select Existing Item ({allMediaItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSourceType('custom')}
              className={selectedSourceType === 'custom' ? 'badge badge-cyan' : 'badge badge-muted'}
              style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
            >
              Custom URL / Type
            </button>
          </div>
        </div>

        <form onSubmit={handleTriggerCustom} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {selectedSourceType === 'existing' ? (
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Select Media Item to Sync Across All Windows
              </label>
              <select
                value={selectedItemId || (allMediaItems[0]?.id || '')}
                onChange={(e) => setSelectedItemId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                }}
              >
                {allMediaItems.map((item) => (
                  <option key={item.id} value={item.id} style={{ background: '#0f1422', color: '#fff' }}>
                    [{item.windowName}] {item.type.toUpperCase()} ({item.duration_seconds}s) - {item.url.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Media Type
                </label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as MediaType)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="video" style={{ background: '#0f1422' }}>Video</option>
                  <option value="image" style={{ background: '#0f1422' }}>Image</option>
                  <option value="blank" style={{ background: '#0f1422' }}>Blank Slot</option>
                </select>
              </div>
              <div style={{ flex: '1 1 260px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Media URL (Image or MP4)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </>
          )}

          {/* Sync Duration in Seconds */}
          <div style={{ width: '130px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Duration (sec)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={customDuration}
              onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 10))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isTriggering}
            className="btn btn-sync"
            style={{ height: '42px', padding: '0 22px' }}
          >
            <Zap size={16} />
            <span>{isTriggering ? 'Triggering...' : 'Trigger Sync'}</span>
          </button>
        </form>
      </div>

    </div>
  );
};
