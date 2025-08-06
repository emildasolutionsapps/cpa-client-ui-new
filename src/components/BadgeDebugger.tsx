import React, { useState, useEffect } from 'react';
import { UnreadService, badgeEventEmitter } from '../services/unreadService';
import { useAuth } from '../contexts/AuthContext';

const BadgeDebugger: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { selectedClient, user } = useAuth();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (selectedClient?.ClientID && user?.id) {
      addLog(`Setting up for client: ${selectedClient.ClientID} with user: ${user.id}`);
      loadUnreadCount();

      // Subscribe to unread updates
      const subscription = UnreadService.subscribeToUnreadUpdates(
        selectedClient.ClientID,
        user.id,
        (count) => {
          addLog(`Subscription update: ${count} unread messages`);
          setUnreadCount(count);
        }
      );

      // Subscribe to badge events
      const unsubscribeBadgeEvents = badgeEventEmitter.subscribe((clientId) => {
        if (clientId === selectedClient.ClientID) {
          addLog(`Badge event received for client: ${clientId}`);
          loadUnreadCount();
        }
      });

      return () => {
        addLog('Cleaning up subscriptions');
        UnreadService.unsubscribeFromUnreadUpdates(subscription);
        unsubscribeBadgeEvents();
      };
    }
  }, [selectedClient, user]);

  const loadUnreadCount = async () => {
    if (!selectedClient?.ClientID || !user?.id) return;

    setLoading(true);
    try {
      addLog('Loading unread count...');
      const count = await UnreadService.getUnreadCount(selectedClient.ClientID, user.id);
      addLog(`Loaded unread count: ${count}`);
      setUnreadCount(count);
    } catch (error) {
      addLog(`Error loading unread count: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!selectedClient?.ClientID || !user?.id) return;

    setLoading(true);
    try {
      addLog('Marking messages as read...');
      await UnreadService.markAsRead(selectedClient.ClientID, user.id);
      addLog('Messages marked as read successfully');
      await loadUnreadCount();
    } catch (error) {
      addLog(`Error marking as read: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!selectedClient) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No client selected</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Badge Debugger</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 mb-1">Current Client</p>
          <p className="font-medium">{selectedClient.ClientName}</p>
          <p className="text-xs text-gray-500">{selectedClient.ClientID}</p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 mb-1">Unread Count</p>
          <p className="text-2xl font-bold text-green-800">{unreadCount}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={loadUnreadCount}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Count'}
        </button>
        
        <button
          onClick={markAsRead}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Mark as Read'}
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Debug Logs</p>
        <div className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="font-mono">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeDebugger;
