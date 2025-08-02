import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserIcon,
  PhoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';

export default function Messages() {
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccountant, setSelectedAccountant] = useState('Sarah Mitchell, CPA');
  const [selectedClient, setSelectedClient] = useState('John & Jane Doe');

  // Sample client profiles
  const clientProfiles = [
    'John & Jane Doe',
    'John Doe (Individual)',
    'Jane Doe (Individual)',
    'ABC Corporation'
  ];

  // Sample list of accountants
  const accountants = [
    { name: 'Sarah Mitchell, CPA', email: 'sarah.mitchell@example.com', avatar: null },
    { name: 'John Doe, CPA', email: 'john.doe@example.com', avatar: null },
    { name: 'Emily Johnson, CPA', email: 'emily.johnson@example.com', avatar: null },
    { name: 'David Smith, CPA', email: 'david.smith@example.com', avatar: null }
  ];

  // Messages organized by client profile
  const messagesByClient: Record<string, Array<{id: number, sender: string, content: string, timestamp: string, isOwn: boolean}>> = {
    'John & Jane Doe': [
      { id: 1, sender: 'Sarah Mitchell, CPA', content: 'Hi! I\'ve received your joint tax documents. I\'ll start reviewing them today.', timestamp: '10:30 AM', isOwn: false },
      { id: 2, sender: 'You', content: 'Great! Let me know if you need any additional information.', timestamp: '10:35 AM', isOwn: true },
      { id: 3, sender: 'Sarah Mitchell, CPA', content: 'I have a question about your business expenses. Can we schedule a quick call?', timestamp: '2:15 PM', isOwn: false },
      { id: 4, sender: 'You', content: 'Sure, I\'m available this afternoon. What time works for you?', timestamp: '2:20 PM', isOwn: true }
    ],
    'John Doe (Individual)': [
      { id: 5, sender: 'Emily Johnson, CPA', content: 'Hello John! I\'m reviewing your individual tax return. Everything looks good so far.', timestamp: '9:15 AM', isOwn: false },
      { id: 6, sender: 'You', content: 'Thanks Emily! Do you need any additional documentation?', timestamp: '9:30 AM', isOwn: true },
      { id: 7, sender: 'Emily Johnson, CPA', content: 'Could you send me your 1099-INT form when you get a chance?', timestamp: '11:45 AM', isOwn: false }
    ],
    'Jane Doe (Individual)': [
      { id: 8, sender: 'David Smith, CPA', content: 'Hi Jane! I\'ve started working on your individual return. I notice you have some freelance income this year.', timestamp: '2:00 PM', isOwn: false },
      { id: 9, sender: 'You', content: 'Yes, I started freelancing in March. I have all the 1099s ready.', timestamp: '2:15 PM', isOwn: true }
    ],
    'ABC Corporation': [
      { id: 10, sender: 'John Doe, CPA', content: 'Good morning! I\'m handling ABC Corporation\'s quarterly filing. I have a few questions about Q4 expenses.', timestamp: '8:30 AM', isOwn: false },
      { id: 11, sender: 'You', content: 'Morning John! I\'m ready to discuss the Q4 numbers. What specific expenses do you need clarification on?', timestamp: '8:45 AM', isOwn: true }
    ]
  };

  // Get messages for the currently selected client
  const messages = messagesByClient[selectedClient] || [];

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would typically send the message to your backend
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleAttachment = () => {
    // Handle file attachment
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        console.log('Selected files:', Array.from(files));
        // Handle file upload logic here
      }
    };
    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        {/* Client Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 mb-2">Client Profile:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          >
            {clientProfiles.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

        {/* Accountant Info and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{selectedAccountant}</h1>
              <p className="text-sm text-slate-500">Conversation for {selectedClient}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button
              onClick={toggleModal}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              msg.isOwn
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-900 border border-slate-200'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${
                msg.isOwn ? 'text-blue-100' : 'text-slate-500'
              }`}>
                {msg.timestamp}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-slate-200 p-4">
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

      {/* Modal for Accountants */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Switch Accountant</h3>
            <ul className="space-y-3">
              {accountants.map((accountant, index) => (
                <li key={index} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <UserCircleIcon className="w-10 h-10 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">{accountant.name}</p>
                      <p className="text-sm text-slate-500">{accountant.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAccountant(accountant.name);
                      toggleModal();
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    {selectedAccountant === accountant.name ? 'Current' : 'Switch'}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={toggleModal}
              className="mt-6 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
