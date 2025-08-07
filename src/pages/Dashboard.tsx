import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentCheckIcon,
  UserIcon,
  CloudArrowUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import FilterBar from '../components/FilterBar';
import StatusCard from '../components/StatusCard';
import UploadZone from '../components/UploadZone';

import { useClientData } from '../hooks/useClientData';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../contexts/FilterContext';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Document status - can be 'complete' or 'pending'
  const [documentStatus, setDocumentStatus] = useState<'complete' | 'pending'>('pending');

  // Use auth context for client access info
  const { hasClientAccess, clientsError, loadingClients } = useAuth();

  // Use filters context for year and job filtering
  const { selectedYear, selectedJobId, selectedJobName } = useFilters();

  // Use client data hook
  const {
    jobs,
    documents,
    messages,
    selectedClient,
    loadingJobs,
    loadingDocuments,
    loadingMessages,
    jobsError,
    documentsError,
    messagesError
  } = useClientData();

  // Sample list of accountants
  const accountants = [
    { name: 'Sarah Mitchell, CPA', email: 'sarah.mitchell@example.com', specialization: 'Individual Tax Returns' },
    { name: 'John Doe, CPA', email: 'john.doe@example.com', specialization: 'Business Tax Planning' },
    { name: 'Emily Johnson, CPA', email: 'emily.johnson@example.com', specialization: 'Estate Planning' },
    { name: 'David Smith, CPA', email: 'david.smith@example.com', specialization: 'Corporate Tax' }
  ];

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  // Show loading state while checking client access
  if (loadingClients) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Loading Client Access</h2>
          <p className="text-slate-600">Please wait while we load your client information...</p>
        </div>
      </div>
    )
  }

  // Show error message if there's a client access error
  if (clientsError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Client Access Error</h2>
          <p className="text-slate-600 mb-4">{clientsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show message if no client is selected
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600">Please select a client profile from the sidebar to view your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <FilterBar />



      {/* Main Status Banner */}
      {/* <motion.div 
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white mb-8 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Your 2025 Tax Return is currently in Review 🕵️</h1>
            <p className="text-blue-100">Our team is carefully reviewing your documents. We'll notify you of any updates.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">85%</div>
            <div className="text-blue-100">Complete</div>
          </div>
        </div>
      </motion.div> */}

      {/* Upload Documents - Higher Priority */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Documents</h2>
        <UploadZone selectedJobId={selectedJobId} selectedJobName={selectedJobName} />
      </motion.div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatusCard
          icon={DocumentCheckIcon}
          title="Documents"
          status={loadingDocuments ? 'Loading...' : documentsError ? 'Error' : 'Available'}
          statusColor={loadingDocuments ? 'slate' : documentsError ? 'red' : documents.length > 0 ? 'emerald' : 'amber'}
          description={loadingDocuments ? 'Loading documents...' : documentsError ? 'Failed to load documents' : `${documents.length} documents uploaded`}
          count={loadingDocuments ? '...' : `${documents.length}`}
        />

        <StatusCard
          icon={ChartBarIcon}
          title="Active Jobs"
          status={loadingJobs ? 'Loading...' : jobsError ? 'Error' : 'Active'}
          statusColor={loadingJobs ? 'slate' : jobsError ? 'red' : jobs.length > 0 ? 'blue' : 'amber'}
          description={loadingJobs ? 'Loading jobs...' : jobsError ? 'Failed to load jobs' : `${jobs.length} active jobs`}
          count={loadingJobs ? '...' : `${jobs.length}`}
        />

        <StatusCard
          icon={UserIcon}
          title="Messages"
          status={loadingMessages ? 'Loading...' : messagesError ? 'Error' : 'Available'}
          statusColor={loadingMessages ? 'slate' : messagesError ? 'red' : messages.length > 0 ? 'emerald' : 'amber'}
          description={loadingMessages ? 'Loading messages...' : messagesError ? 'Failed to load messages' : `${messages.length} messages`}
          count={loadingMessages ? '...' : `${messages.length}`}
        />
      </div>

      {/* Payment Information Section */}
      {/* <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Payment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            icon={BanknotesIcon}
            title="Refund Status"
            status="Pending"
            statusColor="amber"
            description="Federal: $2,450"
            additionalInfo="State: $340"
          />
          
          <StatusCard
            icon={ChartBarIcon}
            title="AGI"
            status="Calculated"
            statusColor="emerald"
            description="$75,300"
            additionalInfo="Adjusted Gross Income"
          />
          
          <StatusCard
            icon={DocumentArrowDownIcon}
            title="Tax Return Summary"
            status="Available"
            statusColor="blue"
            description="2025 Return Overview"
            action="Download PDF"
          />
        </div>
      </motion.div> */}

      {/* Quick Actions */}
      {/* <motion.div 
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
            <div className="text-2xl mb-2">💳</div>
            <div className="text-sm font-medium text-slate-700">Add Card</div>
          </button>
          <button className="p-4 text-center rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium text-slate-700">Manage Card</div>
          </button>
          <button className="p-4 text-center rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-slate-700">Message Team</div>
          </button>
          <button className="p-4 text-center rounded-xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200">
            <div className="text-2xl mb-2">📞</div>
            <div className="text-sm font-medium text-slate-700">Schedule Call</div>
          </button>
        </div>
      </motion.div> */}

      {/* Modal for Accountants */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Assigned Accountants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accountants.map((accountant, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{accountant.name}</h4>
                      <p className="text-sm text-slate-500">{accountant.email}</p>
                      <p className="text-xs text-slate-400 mt-1">{accountant.specialization}</p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={toggleModal}
              className="mt-6 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}