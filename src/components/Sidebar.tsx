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

import { useAuth } from '../contexts/AuthContext';
import { ConversationThreadService, conversationThreadEventEmitter } from '../services/conversationThreadService';
import { DocumentBadgeService, documentBadgeEventEmitter } from '../services/documentBadgeService';
import { SignatureBadgeService, signatureBadgeEventEmitter } from '../services/signatureBadgeService';
import { useMobileSidebar } from '../App';
import { COMPANY_LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE } from '../constants/branding';

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

  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSidebar();
  const [unansweredMessageCount, setUnansweredMessageCount] = useState(0);
  const [documentBadgeCount, setDocumentBadgeCount] = useState(0);
  const [signatureBadgeCount, setSignatureBadgeCount] = useState(0);
  const navigate = useNavigate();

  // Debug: Log when counts change
  useEffect(() => {
    console.log('Sidebar: Unanswered message count changed to:', unansweredMessageCount);
  }, [unansweredMessageCount]);

  useEffect(() => {
    console.log('Sidebar: Document badge count changed to:', documentBadgeCount);
  }, [documentBadgeCount]);

  useEffect(() => {
    console.log('Sidebar: Signature badge count changed to:', signatureBadgeCount);
  }, [signatureBadgeCount]);

  // Debug: Log when selectedClient changes
  useEffect(() => {
    console.log('Sidebar: Selected client changed to:', selectedClient);
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient?.ClientID && user?.id) {
      console.log('Sidebar: Setting up subscriptions for client:', selectedClient.ClientID);
      // Load initial counts
      loadUnansweredMessageCount();
      loadDocumentBadgeCount();
      loadSignatureBadgeCount();

      // Subscribe to conversation thread updates
      const conversationSubscription = ConversationThreadService.subscribeToConversationThreadUpdates(
        selectedClient.ClientID,
        user.id,
        (count) => {
          console.log('Sidebar: Received unanswered message count update:', count);
          setUnansweredMessageCount(count);
        }
      );

      // Subscribe to document badge updates
      const documentSubscription = DocumentBadgeService.subscribeToDocumentUpdates(
        selectedClient.ClientID,
        (count) => {
          console.log('Sidebar: Received document badge count update:', count);
          setDocumentBadgeCount(count);
        }
      );

      // Subscribe to signature badge updates
      const signatureSubscription = SignatureBadgeService.subscribeToSignatureUpdates(
        selectedClient.ClientID,
        (count) => {
          console.log('Sidebar: Received signature badge count update:', count);
          setSignatureBadgeCount(count);
        }
      );

      // Subscribe to conversation thread update events (for immediate updates)
      const unsubscribeConversationEvents = conversationThreadEventEmitter.subscribe((clientId) => {
        if (clientId === selectedClient.ClientID) {
          console.log('Sidebar: Received conversation thread update event, refreshing count');
          loadUnansweredMessageCount();
        }
      });

      // Subscribe to document badge update events
      const unsubscribeDocumentBadgeEvents = documentBadgeEventEmitter.subscribe((clientId) => {
        if (clientId === selectedClient.ClientID) {
          console.log('Sidebar: Received document badge update event, refreshing count');
          loadDocumentBadgeCount();
        }
      });

      // Subscribe to signature badge update events
      const unsubscribeSignatureBadgeEvents = signatureBadgeEventEmitter.subscribe((clientId) => {
        if (clientId === selectedClient.ClientID) {
          console.log('Sidebar: Received signature badge update event, refreshing count');
          loadSignatureBadgeCount();
        }
      });

      return () => {
        console.log('Sidebar: Cleaning up subscriptions for client:', selectedClient?.ClientID);
        conversationSubscription.unsubscribe();
        documentSubscription.unsubscribe();
        signatureSubscription.unsubscribe();
        unsubscribeConversationEvents();
        unsubscribeDocumentBadgeEvents();
        unsubscribeSignatureBadgeEvents();
      };
    }
  }, [selectedClient, user]);

  const loadUnansweredMessageCount = async () => {
    if (selectedClient?.ClientID && user?.id) {
      console.log('Sidebar: Loading unanswered message count for client:', selectedClient.ClientID);
      const count = await ConversationThreadService.getUnansweredMessageCount(selectedClient.ClientID, user.id);
      console.log('Sidebar: Unanswered message count loaded:', count);
      setUnansweredMessageCount(count);
    } else {
      console.warn('Sidebar: Missing client ID or user ID, cannot load unanswered message count');
    }
  };

  const loadDocumentBadgeCount = async () => {
    if (selectedClient?.ClientID) {
      console.log('Sidebar: Loading document badge count for client:', selectedClient.ClientID);
      const count = await DocumentBadgeService.getPendingDocumentCount(selectedClient.ClientID);
      console.log('Sidebar: Document badge count loaded:', count);
      setDocumentBadgeCount(count);
    } else {
      console.warn('Sidebar: Missing client ID, cannot load document badge count');
    }
  };

  const loadSignatureBadgeCount = async () => {
    if (selectedClient?.ClientID) {
      console.log('Sidebar: Loading signature badge count for client:', selectedClient.ClientID);
      const count = await SignatureBadgeService.getPendingSignatureCount(selectedClient.ClientID);
      console.log('Sidebar: Signature badge count loaded:', count);
      setSignatureBadgeCount(count);
    } else {
      console.warn('Sidebar: Missing client ID, cannot load signature badge count');
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

  const handleNavClick = () => {
    // Close mobile menu when navigating on mobile
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700/60 shadow-xl flex flex-col z-50 transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="p-6 flex-1">
        <div className="hidden lg:flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
            <img
              src={COMPANY_LOGO_URL}
              alt={COMPANY_NAME}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                // Fallback to icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <BuildingOfficeIcon className="w-6 h-6 text-blue-600 hidden" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{COMPANY_NAME}</h1>
            <p className="text-sm text-slate-300">{COMPANY_TAGLINE}</p>
          </div>
        </div>

        {/* Mobile spacing */}
        <div className="lg:hidden mb-6"></div>

        {/* Client Profile Switcher */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Client Profile
          </label>

          {loadingClients ? (
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-300">
              Loading client access...
            </div>
          ) : clientsError ? (
            <div className="bg-red-900/30 border-2 border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
              {clientsError}
            </div>
          ) : availableClients.length > 0 ? (
            <>
              <div className="relative">
                <select
                  value={selectedClient?.ClientID || ''}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  disabled={loadingClients}
                  className="appearance-none w-full bg-slate-700/50 border-2 border-slate-600 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-white hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50"
                >
                  {availableClients.map((client) => (
                    <option key={client.ClientID} value={client.ClientID} className="bg-slate-800 text-white">
                      {client.ClientName}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              {selectedClient && (
                <p className="text-xs text-slate-400 mt-1">
                  Code: {selectedClient.ClientCode}
                </p>
              )}
            </>
          ) : (
            <div className="bg-amber-900/30 border-2 border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-300">
              No client access available
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Messages' && unansweredMessageCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unansweredMessageCount > 99 ? '99+' : unansweredMessageCount}
                    </span>
                  )}
                  {item.name === 'Documents' && documentBadgeCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {documentBadgeCount > 99 ? '99+' : documentBadgeCount}
                    </span>
                  )}
                  {item.name === 'Signatures' && signatureBadgeCount > 0 && (
                    <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {signatureBadgeCount > 99 ? '99+' : signatureBadgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User section at bottom */}
      <div className="p-6 border-t border-slate-700/60">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
            {user?.email ? getUserInitials(user.email) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-slate-300 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}