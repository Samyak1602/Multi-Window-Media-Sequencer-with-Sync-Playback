import React, { useRef, useEffect, useState } from 'react';
import { 
  Trash2, 
  Plus, 
  Layers, 
  Film, 
  Image as ImageIcon, 
  CircleDot, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import type { WindowWithPlayback, PlaybackState } from '../types';
import { formatSeconds } from '../utils/sequencer';

interface WindowCardProps {
  windowData: WindowWithPlayback;
  playbackState: PlaybackState;
  onOpenAddModal: (windowId: string) => void;
  onDeleteItem: (itemId: string) => Promise<void>;
  isDeleting: boolean;
}

export const WindowCard: React.FC<WindowCardProps> = ({
  windowData,
  playbackState,
  onOpenAddModal,
  onDeleteItem,
  isDeleting,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState<boolean>(true);

  const activeItem = playbackState.active_item;
  const naturalItem = playbackState.natural_item;
  const isSyncActive = playbackState.is_sync_active;
  const offset = playbackState.active_item_offset_seconds;
  const remaining = playbackState.active_item_remaining_seconds;
  const itemDuration = activeItem ? Math.max(1, activeItem.duration_seconds) : 10;
  const itemProgress = Math.min(100, Math.max(0, (offset / itemDuration) * 100));

  // Calculate total playlist duration
  const totalPlaylistDuration = windowData.playlist.reduce(
    (acc, curr) => acc + Math.max(1, curr.duration_seconds),
    0
  );

  // Sync video current time to wall-clock offset to avoid drift only above threshold (1.5s)
  useEffect(() => {
    if (activeItem?.type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      const targetTime = offset % (vid.duration || itemDuration || 10);
      
      // Only perform seek correction if drift exceeds 1.5s threshold
      if (Math.abs(vid.currentTime - targetTime) > 1.5) {
        vid.currentTime = targetTime;
      }
      if (vid.paused) {
        vid.play().catch(() => {});
      }
    }
  }, [activeItem?.id, offset, itemDuration]);

  // Initial seek on metadata load (ensures resuming mid-item seeks directly to offset)
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    const targetTime = offset % (vid.duration || itemDuration || 10);
    vid.currentTime = targetTime;
    vid.play().catch(() => {});
  };

  return (
    <div
      className={isSyncActive ? 'glass-panel-sync' : 'glass-panel'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Window Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isSyncActive ? '#ffaa00' : '#00f0ff',
              boxShadow: isSyncActive
                ? '0 0 10px #ffaa00'
                : '0 0 10px rgba(0, 240, 255, 0.7)',
            }}
          />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {windowData.name}
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ID: {windowData.id} • 5h Cycle Elapsed: {formatSeconds(playbackState.cycle_elapsed_seconds)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSyncActive ? (
            <span className="badge badge-amber font-mono" style={{ fontSize: '0.7rem' }}>
              SYNC ACTIVE
            </span>
          ) : (
            <span className="badge badge-cyan font-mono" style={{ fontSize: '0.7rem' }}>
              NATURAL LOOP
            </span>
          )}
        </div>
      </div>

      {/* Live Media Screen Display */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '280px',
          backgroundColor: '#000000',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activeItem?.type === 'image' && (
          <img
            key={activeItem.id + activeItem.url}
            src={activeItem.url}
            alt="Current Media Item"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.3s ease',
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}

        {activeItem?.type === 'video' && (
          <video
            ref={videoRef}
            key={activeItem.id + activeItem.url}
            src={activeItem.url}
            autoPlay
            muted
            loop
            playsInline
            onLoadedMetadata={handleVideoLoadedMetadata}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {activeItem?.type === 'blank' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <CircleDot size={44} style={{ opacity: 0.4, animation: 'liveDotPulse 3s infinite' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              BLANK / INTERMISSION SLOT
            </div>
          </div>
        )}

        {/* Sync Override Watermark Overlay */}
        {isSyncActive && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(20, 10, 0, 0.85)',
              border: '1px solid rgba(255, 170, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="#ffaa00" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffaa00' }}>
                SYNC BROADCAST OVERRIDE
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fed7aa' }}>
              Natural sequence at:{' '}
              <strong style={{ color: '#fff' }}>
                {naturalItem?.type.toUpperCase()} ({playbackState.natural_item_remaining_seconds}s left)
              </strong>
            </div>
          </div>
        )}

        {/* Bottom Screen Overlay HUD */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeItem?.type === 'video' && <Film size={14} color="#00f0ff" />}
              {activeItem?.type === 'image' && <ImageIcon size={14} color="#00f0ff" />}
              {activeItem?.type === 'blank' && <CircleDot size={14} color="#94a3b8" />}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                {isSyncActive ? 'Synced Broadcast Item' : `Item #${(playbackState.active_item_index ?? 0) + 1} of ${windowData.playlist.length}`}
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
              {offset}s / {itemDuration}s ({remaining}s left)
            </div>
          </div>

          {/* Item Timeline Progress Bar */}
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${isSyncActive ? 'progress-fill-amber' : 'progress-fill-cyan'}`}
              style={{ width: `${itemProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Segmented Visual Playlist Timeline */}
      <div style={{ padding: '14px 20px 8px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span>Playlist Timeline ({totalPlaylistDuration}s loop)</span>
          <span>{windowData.playlist.length} items</span>
        </div>
        <div
          style={{
            display: 'flex',
            height: '8px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            overflow: 'hidden',
            gap: '2px',
          }}
        >
          {windowData.playlist.map((item, idx) => {
            const widthPct = totalPlaylistDuration > 0
              ? (Math.max(1, item.duration_seconds) / totalPlaylistDuration) * 100
              : 100 / windowData.playlist.length;
            const isCurrent = !isSyncActive && playbackState.natural_item_index === idx;

            return (
              <div
                key={item.id}
                title={`Item ${idx + 1}: ${item.type} (${item.duration_seconds}s)`}
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  background: isCurrent
                    ? 'var(--accent-cyan)'
                    : item.type === 'video'
                    ? 'rgba(139, 92, 246, 0.6)'
                    : item.type === 'image'
                    ? 'rgba(56, 189, 248, 0.45)'
                    : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isCurrent ? '0 0 8px var(--accent-cyan)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Playlist Drawer Toggle & Controls */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={15} />
            <span>Configured Playlist ({windowData.playlist.length})</span>
            {isPlaylistExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => onOpenAddModal(windowData.id)}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Plus size={14} />
            <span>Add Media</span>
          </button>
        </div>

        {/* Expanded Playlist Items List */}
        {isPlaylistExpanded && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {windowData.playlist.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No media items in this window. Playing fallback blank slot.
              </div>
            ) : (
              windowData.playlist.map((item, idx) => {
                const isPlayingThis = !isSyncActive && playbackState.natural_item_index === idx;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isPlayingThis
                        ? 'rgba(0, 240, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isPlayingThis
                        ? '1px solid rgba(0, 240, 255, 0.35)'
                        : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: isPlayingThis ? '#00f0ff' : 'var(--text-muted)', fontWeight: 600 }}>
                        #{idx + 1}
                      </span>
                      {item.type === 'video' && <Film size={14} color="#a78bfa" />}
                      {item.type === 'image' && <ImageIcon size={14} color="#38bdf8" />}
                      {item.type === 'blank' && <CircleDot size={14} color="#94a3b8" />}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {item.type} ({item.duration_seconds}s)
                        </span>
                        {item.url && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px',
                            }}
                            title={item.url}
                          >
                            {item.url}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isPlayingThis && (
                        <span className="badge badge-cyan font-mono" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                          NOW
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        disabled={isDeleting}
                        className="btn-icon"
                        style={{ padding: '5px' }}
                        title="Delete Media Item"
                      >
                        <Trash2 size={13} color="#f43f5e" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
