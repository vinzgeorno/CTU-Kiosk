import React, { useState, useEffect } from 'react';
import { FaCloud, FaSync, FaCheckCircle, FaExclamationTriangle, FaCog, FaDatabase, FaWifi, FaCloudUploadAlt } from 'react-icons/fa';
import supabaseSync from '../utils/supabaseSync';
import './SyncManager.css';

function SyncManager() {
  const [config, setConfig] = useState({
    supabaseUrl: '',
    supabaseKey: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showConfig, setShowConfig] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  useEffect(() => {
    // Load configuration
    loadConfiguration();
    
    // Load sync stats
    loadSyncStats();

    // Check if auto-sync is enabled
    const autoSync = localStorage.getItem('auto_sync_enabled') === 'true';
    setAutoSyncEnabled(autoSync);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sync interval (every 5 minutes if enabled and online)
    let autoSyncInterval;
    if (autoSync) {
      autoSyncInterval = setInterval(() => {
        if (navigator.onLine && !isSyncing) {
          handleSync(true); // Silent sync
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
      }
    };
  }, [autoSyncEnabled, isSyncing]);

  const loadConfiguration = () => {
    const savedConfig = localStorage.getItem('supabase_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      setIsConfigured(true);
      supabaseSync.initialize(parsed.url, parsed.key);
    }
  };

  const loadSyncStats = async () => {
    const stats = await supabaseSync.getSyncStats();
    if (stats.success) {
      setSyncStats(stats);
    }
  };

  const handleConfigSave = () => {
    if (!config.supabaseUrl || !config.supabaseKey) {
      alert('Please enter both Supabase URL and API Key');
      return;
    }

    const initResult = supabaseSync.initialize(config.supabaseUrl, config.supabaseKey);
    if (initResult.success) {
      supabaseSync.saveConfig(config.supabaseUrl, config.supabaseKey);
      setIsConfigured(true);
      setShowConfig(false);
      alert('Configuration saved successfully!');
    } else {
      alert('Failed to initialize Supabase: ' + initResult.error);
    }
  };

  const handleTestConnection = async () => {
    setTestResult({ testing: true });
    const result = await supabaseSync.testConnection();
    setTestResult(result);
    
    setTimeout(() => {
      setTestResult(null);
    }, 5000);
  };

  const handleSync = async (silent = false) => {
    if (!isConfigured) {
      if (!silent) alert('Please configure Supabase connection first');
      return;
    }

    if (!isOnline) {
      if (!silent) alert('No internet connection. Please connect to the internet and try again.');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    setSyncProgress({ current: 0, total: 0 });

    const result = await supabaseSync.syncAllTickets((progress) => {
      setSyncProgress(progress);
    });

    setIsSyncing(false);
    setSyncResult(result);
    
    if (result.success) {
      supabaseSync.updateLastSyncTime();
      await loadSyncStats();
    }

    // Clear result after 10 seconds
    if (!silent) {
      setTimeout(() => {
        setSyncResult(null);
        setSyncProgress(null);
      }, 10000);
    } else {
      // Clear immediately for silent syncs
      setTimeout(() => {
        setSyncResult(null);
        setSyncProgress(null);
      }, 3000);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    localStorage.setItem('auto_sync_enabled', newValue.toString());
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getSetupInstructions = async () => {
    const result = await supabaseSync.setupCloudDatabase();
    if (result.success) {
      // Create a downloadable text file with SQL
      const blob = new Blob([result.sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'supabase-setup.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('SQL script downloaded! Run this in your Supabase SQL Editor to set up the database.');
    }
  };

  return (
    <div className="sync-manager">
      <div className="sync-header">
        <h1><FaCloud /> Cloud Sync Manager</h1>
        <div className="connection-status">
          <FaWifi className={isOnline ? 'online' : 'offline'} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="sync-section">
        <div className="section-header">
          <h2><FaCog /> Configuration</h2>
          <button 
            onClick={() => setShowConfig(!showConfig)} 
            className="toggle-config-btn"
          >
            {showConfig ? 'Hide' : 'Show'} Config
          </button>
        </div>

        {showConfig && (
          <div className="config-form">
            <div className="form-group">
              <label>Supabase URL:</label>
              <input
                type="text"
                value={config.supabaseUrl}
                onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                placeholder="https://xxxxx.supabase.co"
              />
            </div>
            <div className="form-group">
              <label>Supabase API Key (anon/public):</label>
              <input
                type="password"
                value={config.supabaseKey}
                onChange={(e) => setConfig({ ...config, supabaseKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>
            <div className="config-actions">
              <button onClick={handleConfigSave} className="save-btn">
                Save Configuration
              </button>
              <button onClick={handleTestConnection} className="test-btn" disabled={!isConfigured}>
                Test Connection
              </button>
              <button onClick={getSetupInstructions} className="setup-btn">
                Download SQL Setup
              </button>
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.testing ? (
                  <span>Testing connection...</span>
                ) : testResult.success ? (
                  <span><FaCheckCircle /> {testResult.message}</span>
                ) : (
                  <span><FaExclamationTriangle /> {testResult.error}</span>
                )}
              </div>
            )}

            <div className="config-note">
              <strong>Note:</strong> Get your Supabase URL and API key from your Supabase project settings.
              Make sure to run the SQL setup script in your Supabase SQL Editor first.
            </div>
          </div>
        )}

        <div className="config-status">
          <span className={`status-badge ${isConfigured ? 'configured' : 'not-configured'}`}>
            {isConfigured ? '✓ Configured' : '✗ Not Configured'}
          </span>
        </div>
      </div>

      {/* Sync Statistics */}
      {syncStats && (
        <div className="sync-section">
          <h2><FaDatabase /> Sync Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Tickets</div>
              <div className="stat-value">{syncStats.total}</div>
            </div>
            <div className="stat-card synced">
              <div className="stat-label">Synced to Cloud</div>
              <div className="stat-value">{syncStats.synced}</div>
            </div>
            <div className="stat-card unsynced">
              <div className="stat-label">Pending Sync</div>
              <div className="stat-value">{syncStats.unsynced}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Last Sync</div>
              <div className="stat-value small">{formatDate(syncStats.lastSync)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Controls */}
      <div className="sync-section">
        <h2><FaCloudUploadAlt /> Sync Controls</h2>
        
        <div className="auto-sync-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={toggleAutoSync}
            />
            <span>Enable Auto-Sync (every 5 minutes)</span>
          </label>
        </div>

        <button
          onClick={() => handleSync(false)}
          disabled={isSyncing || !isConfigured || !isOnline}
          className="sync-button"
        >
          {isSyncing ? (
            <>
              <div className="spinner"></div>
              Syncing...
            </>
          ) : (
            <>
              <FaSync /> Sync Now
            </>
          )}
        </button>

        {!isOnline && (
          <div className="warning-message">
            <FaExclamationTriangle /> No internet connection. Sync is not available.
          </div>
        )}

        {!isConfigured && isOnline && (
          <div className="warning-message">
            <FaExclamationTriangle /> Please configure Supabase connection first.
          </div>
        )}
      </div>

      {/* Sync Progress */}
      {syncProgress && syncProgress.total > 0 && (
        <div className="sync-section">
          <h2>Sync Progress</h2>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {syncProgress.current} / {syncProgress.total} tickets
            </div>
            <div className="progress-ticket">
              Syncing: {syncProgress.ticket}
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="sync-section">
          <h2>Sync Result</h2>
          <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
            {syncResult.success ? (
              <div>
                <FaCheckCircle className="result-icon" />
                <h3>Sync Completed Successfully!</h3>
                <div className="result-stats">
                  <div>✓ Synced: {syncResult.synced} tickets</div>
                  {syncResult.failed > 0 && (
                    <div className="failed">✗ Failed: {syncResult.failed} tickets</div>
                  )}
                  <div>Total: {syncResult.total} tickets</div>
                </div>
                
                {syncResult.failedTickets && syncResult.failedTickets.length > 0 && (
                  <div className="failed-tickets">
                    <h4>Failed Tickets:</h4>
                    <ul>
                      {syncResult.failedTickets.map((ticket, index) => (
                        <li key={index}>
                          {ticket.reference}: {ticket.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <FaExclamationTriangle className="result-icon" />
                <h3>Sync Failed</h3>
                <p>{syncResult.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="sync-section info-section">
        <h2>How It Works</h2>
        <div className="info-content">
          <p>
            <strong>Offline-First Design:</strong> The kiosk stores all transactions locally in IndexedDB,
            allowing it to work without internet connection.
          </p>
          <p>
            <strong>Cloud Sync:</strong> When internet is available, you can sync all pending transactions
            to your Supabase cloud database for backup and centralized management.
          </p>
          <p>
            <strong>Auto-Sync:</strong> Enable auto-sync to automatically upload data every 5 minutes
            when online. This ensures minimal data loss in case of local storage issues.
          </p>
          <p>
            <strong>Manual Sync:</strong> You can also manually trigger sync at any time using the
            "Sync Now" button when internet is available.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SyncManager;
