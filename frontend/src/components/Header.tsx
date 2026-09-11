import React from 'react';
import { Radio, Clock, ShieldAlert, Cpu, RefreshCw } from 'lucide-react';
import type { SyncStatusResponse } from '../types';
import { formatTimePrecise } from '../utils/sequencer';

interface HeaderProps {
  serverTime: number;
  syncStatus: SyncStatusResponse | null;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenExplainer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverTime,
  syncStatus,
  onRefresh,
  isLoading,
  onOpenExplainer,
}) => {
  const isSyncActive = syncStatus?.is_active || false;
  const syncRemaining = syncStatus?.remaining_seconds || 0;

  // 5-hour cycle time (18000s)
  const masterCycleElapsed = serverTime % 18000;
  const masterCycleRemaining = 18000 - masterCycleElapsed;

  return (
    <header className="glass-panel" style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Title & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.25)',
          }}>
            <Radio size={24} color="#00f0ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Multi-Window Media Sequencer
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Deterministic Wall-Clock Engine</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              5-Hour Fixed Cycle with Zero-Drift Synchronized Media Overrides
            </p>
          </div>
        </div>

        {/* Real-time Clocks & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Master 5h Cycle Counter */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Clock size={18} color="#94a3b8" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                5h Cycle Countdown
              </div>
              <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#38bdf8' }}>
                {formatTimePrecise(masterCycleRemaining)}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '6px' }}>/ 05:00:00</span>
              </div>
            </div>
          </div>

          {/* Wall Clock Server Time */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div className="live-indicator-dot" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Wall-Clock Time
              </div>
              <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(serverTime * 1000).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Architecture Explainer Button */}
          <button
            onClick={onOpenExplainer}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            title="View Architecture & Mathematical Foundation"
          >
            <Cpu size={16} color="#c4b5fd" />
            <span>Architecture</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            className="btn-icon"
            style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Poll Backend State"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Active Sync Override Banner */}
      {isSyncActive && (
        <div style={{
          marginTop: '16px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(90deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 85, 0, 0.2) 100%)',
          border: '1px solid rgba(255, 170, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 0 20px rgba(255, 170, 0, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#ffaa00" />
            <div>
              <span style={{ fontWeight: 700, color: '#ffaa00', fontSize: '0.9rem', marginRight: '8px' }}>
                GLOBAL SYNC OVERRIDE BROADCAST ACTIVE
              </span>
              <span style={{ fontSize: '0.82rem', color: '#fed7aa' }}>
                All display windows are synchronized. Natural loops remain ticking in background.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-amber font-mono" style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
              Resuming natural sequence in {syncRemaining}s
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
