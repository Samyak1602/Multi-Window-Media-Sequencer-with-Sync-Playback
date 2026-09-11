import React, { useState } from 'react';
import { X, Plus, Image as ImageIcon, Film, CircleDot } from 'lucide-react';
import type { WindowWithPlayback, MediaType, AddMediaItemPayload } from '../types';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  windows: WindowWithPlayback[];
  initialWindowId: string;
  onAddMedia: (windowId: string, payload: AddMediaItemPayload) => Promise<void>;
  isSubmitting: boolean;
}

const SAMPLE_MEDIA_PRESETS = [
  {
    name: '📸 Modern Architecture (Image)',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    duration: 15,
  },
  {
    name: '🎨 Abstract Neon Gradient (Image)',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    duration: 12,
  },
  {
    name: '🎬 Action Trailer Reel (Video MP4)',
    type: 'video' as MediaType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
  },
  {
    name: '🌊 Nature Scenic Drone (Video MP4)',
    type: 'video' as MediaType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
  },
  {
    name: '⏸️ Standby Intermission (Blank Slot)',
    type: 'blank' as MediaType,
    url: '',
    duration: 10,
  },
];

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  isOpen,
  onClose,
  windows,
  initialWindowId,
  onAddMedia,
  isSubmitting,
}) => {
  const [selectedWindowId, setSelectedWindowId] = useState<string>(initialWindowId || (windows[0]?.id || ''));
  const [type, setType] = useState<MediaType>('image');
  const [url, setUrl] = useState<string>('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80');
  const [durationSeconds, setDurationSeconds] = useState<number>(15);
  const [positionOption, setPositionOption] = useState<'end' | 'index'>('end');
  const [orderIndex, setOrderIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentWindow = windows.find((w) => w.id === selectedWindowId) || windows[0];

  const handleSelectPreset = (preset: typeof SAMPLE_MEDIA_PRESETS[0]) => {
    setType(preset.type);
    setUrl(preset.url);
    setDurationSeconds(preset.duration);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddMedia(selectedWindowId, {
      type,
      url: type === 'blank' ? '' : url,
      duration_seconds: durationSeconds,
      order_index: positionOption === 'index' ? orderIndex : undefined,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} color="#00f0ff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Media Item</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Insert image, video, or blank slot into window playlist
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Sample Presets */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            ✨ Quick Presets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SAMPLE_MEDIA_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Target Window */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              Target Display Window
            </label>
            <select
              value={selectedWindowId}
              onChange={(e) => setSelectedWindowId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.88rem',
              }}
            >
              {windows.map((w) => (
                <option key={w.id} value={w.id} style={{ background: '#0f1422' }}>
                  {w.name} ({w.playlist.length} items)
                </option>
              ))}
            </select>
          </div>

          {/* Media Type Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Media Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {(['image', 'video', 'blank'] as MediaType[]).map((mType) => {
                const isSelected = type === mType;
                return (
                  <button
                    key={mType}
                    type="button"
                    onClick={() => {
                      setType(mType);
                      if (mType === 'blank') setUrl('');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mType === 'image' && <ImageIcon size={18} />}
                    {mType === 'video' && <Film size={18} />}
                    {mType === 'blank' && <CircleDot size={18} />}
                    <span>{mType}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL Input */}
          {type !== 'blank' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                Media Asset URL ({type === 'image' ? 'Image link' : 'MP4 video link'})
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/asset.jpg"
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
          )}

          {/* Duration */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              Playback Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="3600"
              required
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Math.max(1, parseInt(e.target.value) || 10))}
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

          {/* Placement Position */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              Playlist Position
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="position"
                  checked={positionOption === 'end'}
                  onChange={() => setPositionOption('end')}
                />
                Append to end (Index {(currentWindow?.playlist.length || 0) + 1})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="position"
                  checked={positionOption === 'index'}
                  onChange={() => setPositionOption('index')}
                />
                Insert at index
              </label>
            </div>
            {positionOption === 'index' && (
              <input
                type="number"
                min="0"
                max={currentWindow?.playlist.length || 0}
                value={orderIndex}
                onChange={(e) => setOrderIndex(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: '100px',
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Plus size={16} />
              <span>{isSubmitting ? 'Adding...' : 'Add to Playlist'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
