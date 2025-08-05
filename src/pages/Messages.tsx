import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { ChatService, ChatMessage } from '../services/chatService';
import { UnreadService } from '../services/unreadService';

export default function Messages() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user, selectedClient, selectedClientId } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  useEffect(() => {
    if (selectedClientId) {
      loadMessages();

      // Subscribe to real-time messages
      const subscription = ChatService.subscribeToMessages(selectedClientId, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      });

      return () => {
        ChatService.unsubscribeFromMessages(subscription);
      };
    }
  }, [selectedClientId, refreshKey]);

  // Add a refresh mechanism
  const refreshMessages = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedClientId) {
        loadMessages();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedClientId]);

  const loadMessages = async () => {
    if (!selectedClientId) return;

    setLoading(true);
    try {
      const data = await ChatService.getMessages(selectedClientId);
      setMessages(data);

      // Mark messages as read when loading
      await UnreadService.markAsRead(selectedClientId);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show message if no client is selected
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600">Please select a client profile from the sidebar to view messages.</p>
        </div>
      </div>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendMessage = async () => {
    if (message.trim() && user && selectedClientId) {
      const messageText = message.trim();
      const tempId = `temp-${Date.now()}`;

      // Optimistic update - add message immediately
      const optimisticMessage: ChatMessage = {
        id: tempId,
        senderId: user.id,
        senderName: user.name || 'You',
        senderType: 'client',
        content: messageText,
        timestamp: new Date().toISOString(),
        isRead: true,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setMessage(''); // Clear input immediately
      scrollToBottom();

      // Send in background
      try {
        const sentMessage = await ChatService.sendMessage(
          selectedClientId,
          user.id,
          messageText
        );

        if (sentMessage) {
          // Replace optimistic message with real one
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempId ? sentMessage : msg
            )
          );
        } else {
          // Remove optimistic message on failure
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setMessage(messageText); // Restore message
          alert('Failed to send message. Please try again.');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setMessage(messageText); // Restore message
        alert('Failed to send message. Please try again.');
      }
    }
  };

  const handleAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && user && selectedClientId) {
        // Validate file first
        const { validateFile } = await import('../services/s3Service');
        const validation = validateFile(file);

        if (!validation.valid) {
          alert(validation.error);
          return;
        }

        const tempId = `temp-file-${Date.now()}`;
        const messageText = `📎 Uploading: ${file.name}...`;

        // Optimistic update - show uploading message immediately
        const optimisticMessage: ChatMessage = {
          id: tempId,
          senderId: user.id,
          senderName: user.name || 'You',
          senderType: 'client',
          content: messageText,
          timestamp: new Date().toISOString(),
          isRead: true,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();

        try {
          const sentMessage = await ChatService.sendMessageWithAttachment(
            selectedClientId,
            user.id,
            `📎 Sent a file: ${file.name}`,
            file
          );

          if (sentMessage) {
            // Replace optimistic message with real one
            setMessages(prev =>
              prev.map(msg =>
                msg.id === tempId ? sentMessage : msg
              )
            );
          } else {
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            alert('Failed to send file. Please try again.');
          }
        } catch (error) {
          console.error('Error sending file:', error);
          // Remove optimistic message on error
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          alert('Failed to send file. Please try again.');
        }
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
              <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
              <p className="text-sm text-slate-500">Conversation for {selectedClient?.ClientName}</p>
            </div>
          </div>
          <button
            onClick={refreshMessages}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh messages"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <div className="text-4xl mb-4">👋</div>
              <p className="text-center">Start a conversation</p>
              <p className="text-sm text-center mt-1">Send a message to your accountant</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.senderType === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    msg.senderType === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}>
                    <p className="text-sm">{msg.content}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center space-x-2 p-2 rounded-lg text-xs hover:opacity-80 transition-opacity ${
                              msg.senderType === 'client' ? 'bg-blue-700' : 'bg-slate-100'
                            }`}
                          >
                            <PaperClipIcon className="w-3 h-3" />
                            <span className="truncate">{attachment.name}</span>
                            {attachment.size && attachment.size > 0 && (
                              <span className="text-xs opacity-75">
                                ({Math.round(attachment.size / 1024)}KB)
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}

                    <p className={`text-xs mt-1 ${
                      msg.senderType === 'client' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
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
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAttachment}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
