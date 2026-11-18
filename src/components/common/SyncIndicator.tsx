import React, { useState, useEffect } from 'react';
import { subscribeConnection, getConnectionInfo, type ConnectionInfo } from '../../lib/api';
import { RefreshCw, CloudCheck, AlertTriangle, Database } from 'lucide-react';

export const SyncIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [conn, setConn] = useState<ConnectionInfo>(getConnectionInfo);

  useEffect(() => {
    return subscribeConnection(setConn);
  }, []);

  const config = {
    synced: {
      dot: '#C6F432',
      label: 'Synced',
      icon: <CloudCheck size={13} className="text-[#C6F432]" />,
    },
    connecting: {
      dot: '#121212',
      label: 'Connecting...',
      icon: <RefreshCw size={13} className="text-graphite animate-spin" />,
    },
    local: {
      dot: '#6B7280',
      label: 'Local',
      icon: <Database size={13} className="text-secondary" />,
    },
    error: {
      dot: '#EE8D72',
      label: 'Error',
      icon: <AlertTriangle size={13} className="text-coral" />,
    },
  }[conn.status] || {
    dot: '#6B7280',
    label: 'Local',
    icon: <Database size={13} className="text-secondary" />,
  };

  const titleText = conn.reason
    ? `${config.label}: ${conn.reason}`
    : config.label;

  if (compact) {
    return (
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/40 border border-white/60 shadow-sm"
        title={titleText}
      >
        <span
          className={`w-2 h-2 rounded-full ${conn.status === 'connecting' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: config.dot }}
        />
      </div>
    );
  }

  return (
    <div
      title={titleText}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-md border border-white/65 shadow-sm text-xs text-graphite cursor-help select-none"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          conn.status === 'connecting' ? 'animate-pulse' : ''
        }`}
        style={{ backgroundColor: config.dot }}
      />
      <span className="text-secondary font-medium">{config.label}</span>
      {conn.status === 'local' && (
        <span className="text-[11px] text-secondary/70 flex items-center gap-0.5">
          <Database size={10} />
          <span>Mock</span>
        </span>
      )}
    </div>
  );
};
