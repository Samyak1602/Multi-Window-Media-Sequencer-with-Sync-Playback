import React from 'react';
import { X, Cpu, ShieldCheck, Zap, Repeat } from 'lucide-react';

interface ArchitectureExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureExplainerModal: React.FC<ArchitectureExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '750px',
          padding: '32px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(0, 240, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={22} color="#00f0ff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Sequencer Architecture & Zero-Drift Math
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Deterministic Wall-Clock Continuous Playback & Sync Engine
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.88rem', lineHeight: '1.6' }}>
          
          {/* Section 1: Pure Function */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontWeight: 700, marginBottom: '6px' }}>
              <Repeat size={18} />
              <span>1. Pure Wall-Clock Derived Playback</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Instead of fragile setTimeout chains or polling a &quot;get next item&quot; API, the active media item at any timestamp t is calculated deterministically:
            </p>
            <div className="font-mono" style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '10px 14px', borderRadius: '6px', color: '#38bdf8', fontSize: '0.84rem' }}>
              cycle_elapsed = (now_unix - cycle_epoch) % 18000<br/>
              playlist_elapsed = cycle_elapsed % total_playlist_duration
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
              • No stateful playback queues • Never drifts • Perfect sync across tabs and reloads.
            </p>
          </div>

          {/* Section 2: Sync Override */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffaa00', fontWeight: 700, marginBottom: '6px' }}>
              <Zap size={18} />
              <span>2. Stateless Global Sync Overrides</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              When a sync is active between [T_start, T_start + Duration), every window displays the synced item. Meanwhile, each window&apos;s normal wall-clock loop continues ticking undisturbed in the background.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              The instant t &gt;= T_start + Duration, each window resumes its natural playlist exactly where it should be — with <strong>zero pause/resume bookkeeping</strong>.
            </p>
          </div>

          {/* Section 3: 5-Hour Reset & Edits */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, marginBottom: '6px' }}>
              <ShieldCheck size={18} />
              <span>3. 5-Hour Cycle Hard Reset & Playlist Edits</span>
            </div>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Hard Reset Boundary:</strong> At t = 18,000s, the playback resets to item index 0 at offset 0, even if the playlist length does not divide 18,000 evenly.
              </li>
              <li>
                <strong>Playlist Edits:</strong> When items are added or deleted, <code>cycle_epoch</code> remains fixed. This ensures seamless continuity without sudden jarring restarts.
              </li>
              <li>
                <strong>Empty Playlists:</strong> Automatically render a silent fallback standby blank slot.
              </li>
            </ul>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
