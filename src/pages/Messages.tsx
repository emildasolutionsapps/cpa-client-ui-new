import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { ChatService, ChatMessage } from '../services/chatService';
import { UnreadService } from '../services/unreadService';

const Messages: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user, selectedClient, selectedClientId } = useAuth();

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const refreshMessages = () => setRefreshKey(k => k + 1);

  const downloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const loadMessages = useCallback(async () => {
    if (!selectedClientId || !user) return;
    setLoading(true);
    try {
      const data = await ChatService.getMessages(selectedClientId);
      setMessages(data);
      // Mark messages as read using the current user's ID for this client's conversation
      await UnreadService.markAsRead(user.id, selectedClientId, user.email);
      // Scroll after loading messages
      setTimeout(scrollToBottom, 200);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, user]);

  // Scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load & subscribe when client changes or refreshKey increments
  useEffect(() => {
    if (!selectedClientId) return;

    loadMessages();

    // Set up async subscription
    let subscription: unknown = null;

    const setupSubscription = async () => {
      try {
        subscription = await ChatService.subscribeToMessages(
          selectedClientId,
          newMessage => {
            console.log('Client Messages: Received new message via subscription:', newMessage);
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('Client Messages: Message already exists, skipping duplicate');
                return prev;
              }
              console.log('Client Messages: Adding new message to state');
              return [...prev, newMessage];
            });
            scrollToBottom();
          }
        );
      } catch (error) {
        console.error('Client Messages: Error setting up subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        ChatService.unsubscribeFromMessages(subscription);
      }
    };
  }, [selectedClientId, refreshKey, loadMessages]);

  // Auto-refresh every 60s (reduced frequency since we have real-time subscriptions)
  useEffect(() => {
    if (!selectedClientId) return;
    const iv = setInterval(() => {
      // Only refresh if not currently loading to avoid UI flicker
      if (!loading) {
        loadMessages();
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [selectedClientId, loading, loadMessages]);

  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No Client Selected
          </h2>
          <p className="text-slate-600">
            Please select a client from the sidebar to view messages.
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !selectedClientId) return;
    const text = message.trim();
    const tempId = `temp-${Date.now()}`;

    const optimistic: ChatMessage = {
      id: tempId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
      senderType: 'client',
      content: text,
      timestamp: new Date().toISOString(),
      isRead: true
    };

    setMessages(m => [...m, optimistic]);
    setMessage('');
    scrollToBottom();

    try {
      const sent = await ChatService.sendMessage(
        selectedClientId,
        user.id,
        text
      );
      if (sent) {
        setMessages(m =>
          m.map(msg => (msg.id === tempId ? sent : msg))
        );
      } else {
        throw new Error('no message returned');
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(m => m.filter(msg => msg.id !== tempId));
      setMessage(text);
      alert('Failed to send. Please try again.');
    }
  };

  const handleAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls,.csv';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user || !selectedClientId) return;

      const { validateFile } = await import(
        '../services/s3Service'
      );
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      const tempId = `temp-file-${Date.now()}`;
      const uploadingMsg: ChatMessage = {
        id: tempId,
        senderId: user.id,
        senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
        senderType: 'client',
        content: `📎 Uploading: ${file.name}...`,
        timestamp: new Date().toISOString(),
        isRead: true
      };
      setMessages(m => [...m, uploadingMsg]);
      scrollToBottom();

      try {
        const sent = await ChatService.sendMessageWithAttachment(
          selectedClientId,
          user.id,
          `📎 Sent a file: ${file.name}`,
          file
        );
        if (sent) {
          setMessages(m =>
            m.map(msg => (msg.id === tempId ? sent : msg))
          );
        } else {
          throw new Error('no message returned');
        }
      } catch (err) {
        console.error('Attachment error:', err);
        setMessages(m => m.filter(msg => msg.id !== tempId));
        alert('Failed to send file. Please try again.');
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col w-full overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Messages
              </h1>
              <p className="text-sm text-slate-500">
                Conversation for {selectedClient.ClientName}
              </p>
            </div>
          </div>
          <button
            onClick={refreshMessages}
            disabled={loading}
            title="Refresh messages"
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-5 h-5 ${
                loading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        <div className="h-full overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <div className="text-4xl mb-4">👋</div>
              <p className="text-center">Start a conversation</p>
              <p className="text-sm text-center mt-1">
                Send a message to your accountant
              </p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${
                    msg.senderType === 'client'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[280px] sm:max-w-sm px-3 py-2 rounded-2xl ${
                      msg.senderType === 'client'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-900 border border-slate-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.attachments && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map(att => (
                          <div
                            key={att.id}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                              msg.senderType === 'client'
                                ? 'bg-blue-700'
                                : 'bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <PaperClipIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {att.name}
                              </span>
                              {att.size ? (
                                <span className="text-xs opacity-75 flex-shrink-0">
                                  ({Math.round(att.size / 1024)}KB)
                                </span>
                              ) : null}
                            </div>
                            <button
                              onClick={() => downloadAttachment(att.url, att.name)}
                              className={`ml-2 p-1 rounded hover:opacity-80 transition-opacity ${
                                msg.senderType === 'client'
                                  ? 'hover:bg-blue-600'
                                  : 'hover:bg-slate-200'
                              }`}
                              title="Download file"
                            >
                              <ArrowDownTrayIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p
                      className={`text-xs mt-1.5 ${
                        msg.senderType === 'client'
                          ? 'text-blue-100'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-slate-200 p-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAttachment}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e =>
              e.key === 'Enter' && handleSendMessage()
            }
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
