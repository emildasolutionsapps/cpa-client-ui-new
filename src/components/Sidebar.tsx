import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  DocumentIcon,
  PencilSquareIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { UnreadService, badgeEventEmitter } from '../services/unreadService';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Documents', href: '/documents', icon: DocumentIcon },
  { name: 'Signatures', href: '/signatures', icon: PencilSquareIcon },
  { name: 'Billing', href: '/billing', icon: CreditCardIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'My Profile', href: '/profile', icon: UserIcon },
];

export default function Sidebar() {
  const {
    user,
    signOut,
    availableClients,
    selectedClient,
    setSelectedClient,
    loadingClients,
    clientsError,
    hasClientAccess
  } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Debug: Log when unreadCount changes
  useEffect(() => {
    console.log('Sidebar: Unread count changed to:', unreadCount);
  }, [unreadCount]);

  // Debug: Log when selectedClient changes
  useEffect(() => {
    console.log('Sidebar: Selected client changed to:', selectedClient);
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient?.ClientID && user?.id) {
      console.log('Sidebar: Setting up subscriptions for client:', selectedClient.ClientID);
      // Load initial unread count
      loadUnreadCount();

      // Subscribe to unread updates
      const subscription = UnreadService.subscribeToUnreadUpdates(
        selectedClient.ClientID,
        user.id,
        (count) => {
          console.log('Sidebar: Received unread count update:', count);
          setUnreadCount(count);
        }
      );

      // Subscribe to badge update events (for immediate updates when messages are marked as read)
      const unsubscribeBadgeEvents = badgeEventEmitter.subscribe((clientId) => {
        if (clientId === selectedClient.ClientID) {
          console.log('Sidebar: Received badge update event, refreshing count');
          loadUnreadCount();
        }
      });

      return () => {
        console.log('Sidebar: Cleaning up subscriptions for client:', selectedClient?.ClientID);
        UnreadService.unsubscribeFromUnreadUpdates(subscription);
        unsubscribeBadgeEvents();
      };
    }
  }, [selectedClient, user]);

  const loadUnreadCount = async () => {
    if (selectedClient?.ClientID && user?.id) {
      console.log('Sidebar: Loading unread count for client:', selectedClient.ClientID);
      const count = await UnreadService.getUnreadCount(selectedClient.ClientID, user.id);
      console.log('Sidebar: Unread count loaded:', count);
      setUnreadCount(count);
    } else {
      console.warn('Sidebar: Missing client ID or user ID, cannot load unread count');
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <motion.div
      className="fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-xl flex flex-col"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="p-6 flex-1">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <BuildingOfficeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">VVV CPA PC</h1>
            <p className="text-sm text-slate-500">Client Portal</p>
          </div>
        </div>

        {/* Client Profile Switcher */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Client Profile
          </label>

          {loadingClients ? (
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              Loading client access...
            </div>
          ) : clientsError ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {clientsError}
            </div>
          ) : availableClients.length > 0 ? (
            <>
              <div className="relative">
                <select
                  value={selectedClient?.ClientID || ''}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  disabled={loadingClients}
                  className="appearance-none w-full bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-800 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
                >
                  {availableClients.map((client) => (
                    <option key={client.ClientID} value={client.ClientID}>
                      {client.ClientName}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              {selectedClient && (
                <p className="text-xs text-slate-500 mt-1">
                  Code: {selectedClient.ClientCode}
                </p>
              )}
            </>
          ) : (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              No client access available
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User section at bottom */}
      <div className="p-6 border-t border-slate-200/60">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
            {user?.email ? getUserInitials(user.email) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}