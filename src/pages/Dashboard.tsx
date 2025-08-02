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

export default function Dashboard() {
  const [selectedJob, setSelectedJob] = useState('2025 Tax Return');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedClient, setSelectedClient] = useState('John & Jane Doe');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Document status - can be 'complete' or 'pending'
  const [documentStatus, setDocumentStatus] = useState<'complete' | 'pending'>('pending');

  // Sample list of accountants
  const accountants = [
    { name: 'Sarah Mitchell, CPA', email: 'sarah.mitchell@example.com', specialization: 'Individual Tax Returns' },
    { name: 'John Doe, CPA', email: 'john.doe@example.com', specialization: 'Business Tax Planning' },
    { name: 'Emily Johnson, CPA', email: 'emily.johnson@example.com', specialization: 'Estate Planning' },
    { name: 'David Smith, CPA', email: 'david.smith@example.com', specialization: 'Corporate Tax' }
  ];

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  return (
    <div className="max-w-7xl mx-auto">
      <FilterBar 
        selectedJob={selectedJob}
        setSelectedJob={setSelectedJob}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
      />

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
        <UploadZone />
      </motion.div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatusCard
          icon={DocumentCheckIcon}
          title="Documents Received"
          status={documentStatus === 'complete' ? 'Complete' : 'Pending'}
          statusColor={documentStatus === 'complete' ? 'emerald' : 'amber'}
          description={documentStatus === 'complete' ? 'All required documents uploaded' : 'Awaiting additional documents'}
          count={documentStatus === 'complete' ? '12/12' : '3 Pending'}
        />
        
        <StatusCard
          icon={UserIcon}
          title="Assigned Accountants"
          status="Active"
          statusColor="blue"
          description={`${accountants.length} Accountants Assigned`}
          action="View All"
          onClick={toggleModal}
        />

        <StatusCard
          icon={ChartBarIcon}
          title="Tax Preparation"
          status="In Review"
          statusColor="amber"
          description="Documents under review by accountant"
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