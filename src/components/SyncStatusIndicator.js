import React, { useState, useEffect } from 'react';
import { FaCloud, FaCloudUploadAlt, FaExclamationCircle } from 'react-icons/fa';
import supabaseSync from '../utils/supabaseSync';
import './SyncStatusIndicator.css';

function SyncStatusIndicator() {
  const [syncStats, setSyncStats] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Load sync stats
    loadStats();

    // Update stats every minute
    const statsInterval = setInterval(loadStats, 60000);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(statsInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStats = async () => {
    const stats = await supabaseSync.getSyncStats();
    if (stats.success) {
      setSyncStats(stats);
      setLastSync(stats.lastSync);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'offline';
    if (!syncStats) return 'unknown';
    if (syncStats.unsynced === 0) return 'synced';
    if (syncStats.unsynced > 0) return 'pending';
    return 'unknown';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!syncStats) return 'Loading...';
    if (syncStats.unsynced === 0) return 'All Synced';
    return `${syncStats.unsynced} Pending`;
  };

  const getStatusIcon = () => {
    const status = getStatusColor();
    if (status === 'offline') return <FaExclamationCircle />;
    if (status === 'pending') return <FaCloudUploadAlt />;
    return <FaCloud />;
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`sync-status-indicator ${getStatusColor()}`}>
      <div className="sync-icon">
        {getStatusIcon()}
      </div>
      <div className="sync-info">
        <div className="sync-status">{getStatusText()}</div>
        <div className="sync-last">Last: {formatLastSync()}</div>
      </div>
    </div>
  );
}

export default SyncStatusIndicator;
