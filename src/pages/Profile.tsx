import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  BanknotesIcon,
  PencilSquareIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import ChangeRequestModal from '../components/ChangeRequestModal';
import SpouseAccessModal from '../components/SpouseAccessModal';

export default function Profile() {

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [isSpouseAccessModalOpen, setIsSpouseAccessModalOpen] = useState(false);

  const { user, checkMFAStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadMFAStatus = async () => {
      const { enabled, error } = await checkMFAStatus();
      if (!error) {
        setMfaEnabled(enabled);
      }
    };

    loadMFAStatus();
  }, [checkMFAStatus]);

  const profileData = {
    name: user?.user_metadata?.full_name || 'User',
    email: user?.email || 'user@example.com',
    address: '123 Main Street, Anytown, ST 12345',
    phone: '(555) 123-4567',
    dateJoined: 'January 2024',
  };

  const linkedAccounts = [
    { bank: 'Chase Checking', account: '****1234', type: 'Primary' },
    { bank: 'Wells Fargo Savings', account: '****5678', type: 'Secondary' },
  ];

  const handleMFAToggle = async () => {
    if (mfaEnabled) {
      // For disabling MFA, we'd need to implement a disable function
      // For now, just show a message
      setError('MFA cannot be disabled for security reasons. Please contact support.');
      return;
    }

    // For enabling MFA, redirect to setup page
    navigate('/mfa-setup');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-8">My Profile</h1>

        {/* Personal Information Card */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                JD
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{profileData.name}</h2>
                <p className="text-slate-600">Client since {profileData.dateJoined}</p>
              </div>
            </div>
            <button
              onClick={() => setIsChangeRequestModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PencilSquareIcon className="w-4 h-4" />
              <span>Submit Change Request</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{profileData.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{profileData.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{profileData.phone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{profileData.address}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Settings Card */}
        {/* <motion.div
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center space-x-2">
            <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
            <span>Security Settings</span>
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Multi-Factor Authentication</h4>
                <p className="text-slate-600 text-sm">Extra security for your account</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                mfaEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={handleMFAToggle}
                disabled={mfaLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  mfaEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div> */}

        {/* Linked Bank Accounts Card */}
        {/* <motion.div 
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center space-x-2">
            <BanknotesIcon className="w-6 h-6 text-blue-600" />
            <span>Linked Bank Accounts</span>
          </h3>
          
          <div className="space-y-4">
            {linkedAccounts.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BanknotesIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{account.bank}</h4>
                    <p className="text-slate-600 text-sm">Account {account.account}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium border border-blue-200">
                  {account.type}
                </span>
              </div>
            ))}
          </div>
        </motion.div> */}

        {/* Quick Actions Card */}
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-6 border border-blue-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Management</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setIsChangeRequestModalOpen(true)}
              className="bg-white text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors border border-slate-200 flex items-center space-x-2"
            >
              <PencilSquareIcon className="w-5 h-5" />
              <span>Submit Change Request</span>
            </button>
            <button
              onClick={() => setIsSpouseAccessModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <UserPlusIcon className="w-5 h-5" />
              <span>Request Portal Access for Spouse</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <ChangeRequestModal
        isOpen={isChangeRequestModalOpen}
        onClose={() => setIsChangeRequestModalOpen(false)}
      />
      <SpouseAccessModal
        isOpen={isSpouseAccessModalOpen}
        onClose={() => setIsSpouseAccessModalOpen(false)}
      />
    </div>
  );
}