import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  LockClosedIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useClientData } from '../hooks/useClientData';

const tabs = [
  { id: 'requested', name: 'Requested Documents', icon: DocumentIcon, color: 'blue' },
  { id: 'uploads', name: 'General Uploads', icon: CloudArrowUpIcon, color: 'emerald' },
  { id: 'deliverables', name: 'Deliverables', icon: ArrowDownTrayIcon, color: 'purple' },
  { id: 'signed', name: 'Signed Documents', icon: CheckCircleIcon, color: 'green' },
];

const requestedDocs = [
  { name: 'W-2 Forms', status: 'uploaded', dueDate: '2025-02-15' },
  { name: '1099-INT Interest Statements', status: 'uploaded', dueDate: '2025-02-15' },
  { name: 'Property Tax Statements', status: 'pending', dueDate: '2025-03-01' },
  { name: 'Charitable Donations', status: 'pending', dueDate: '2025-03-01' },
];

const uploadedDocs = [
  { name: 'Bank_Statements_2024.pdf', uploadDate: '2025-01-15', size: '2.4 MB' },
  { name: 'Investment_Summary.pdf', uploadDate: '2025-01-14', size: '1.8 MB' },
  { name: 'Receipt_Medical.jpg', uploadDate: '2025-01-12', size: '0.9 MB' },
];

const deliverables = [
  { name: '2024_Tax_Return_Draft.pdf', status: 'available', date: '2025-01-20', size: '3.2 MB' },
  { name: 'Tax_Planning_Summary.pdf', status: 'available', date: '2025-01-18', size: '1.5 MB' },
  { name: 'Quarterly_Report_Q4.pdf', status: 'processing', date: '2025-01-25', size: '2.1 MB' },
];

const signedDocs = [
  { name: 'Engagement_Letter.pdf', signedDate: '2025-01-10', status: 'signed' },
  { name: '8879_Authorization.pdf', signedDate: '2025-01-22', status: 'signed' },
];

export default function Documents() {
  const [activeTab, setActiveTab] = useState('requested');

  // Use client data hook
  const {
    documents,
    selectedClient,
    loadingDocuments,
    documentsError
  } = useClientData();

  // Show message if no client is selected
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600">Please select a client profile from the sidebar to view documents.</p>
        </div>
      </div>
    )
  }

  const handleAddDocument = () => {
    // Handle document upload
    console.log('Add document clicked');
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      uploaded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      available: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-purple-100 text-purple-800 border-purple-200',
      signed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locked: 'bg-slate-100 text-slate-800 border-slate-200',
    };

    const icons = {
      uploaded: <CheckCircleIcon className="w-4 h-4" />,
      pending: <ClockIcon className="w-4 h-4" />,
      available: <DocumentIcon className="w-4 h-4" />,
      processing: <ClockIcon className="w-4 h-4" />,
      signed: <CheckCircleIcon className="w-4 h-4" />,
      locked: <LockClosedIcon className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status === 'uploaded' ? 'Uploaded' : status}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Document Center</h1>
          <p className="text-slate-600">Manage your tax documents efficiently and securely</p>
        </div>

        {/* Modern Tab Navigation */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-3xl p-1 shadow-lg border border-slate-200 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colorClasses = {
                blue: isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-600 hover:bg-blue-50',
                emerald: isActive ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-600 hover:bg-emerald-50',
                purple: isActive ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-600 hover:bg-purple-50',
                green: isActive ? 'bg-green-600 text-white shadow-lg' : 'text-green-600 hover:bg-green-50',
              };

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl text-sm font-medium transition-all duration-300 ${colorClasses[tab.color as keyof typeof colorClasses]}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon className="w-6 h-6 mb-2" />
                  <span className="text-center leading-tight">{tab.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'requested' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Required Documents</h2>
                <p className="text-slate-600 text-sm">Please upload the following documents to complete your tax filing</p>
              </div>

              <div className="grid gap-4">
                {requestedDocs.map((doc, index) => (
                  <motion.div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          doc.status === 'uploaded' ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                          {doc.status === 'uploaded' ? (
                            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{doc.name}</h3>
                          <p className="text-sm text-slate-500">Due: {doc.dueDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(doc.status)}
                        {doc.status === 'pending' && (
                          <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl">
                            Upload Now
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'uploads' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">General Uploads</h2>
                    <p className="text-slate-600 text-sm">Upload additional documents for your tax preparation</p>
                  </div>
                  <button
                    onClick={handleAddDocument}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Document</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {uploadedDocs.map((doc, index) => (
                  <motion.div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{doc.name}</h3>
                          <p className="text-sm text-slate-500">Uploaded: {doc.uploadDate} • {doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200">
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Your Deliverables</h2>
                <p className="text-slate-600 text-sm">Download your completed tax documents and reports</p>
              </div>

              <div className="grid gap-4">
                {deliverables.map((doc, index) => (
                  <motion.div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          doc.status === 'available' ? 'bg-purple-100' : 'bg-amber-100'
                        }`}>
                          {doc.status === 'available' ? (
                            <FolderOpenIcon className="w-6 h-6 text-purple-600" />
                          ) : (
                            <ClockIcon className="w-6 h-6 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{doc.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <span>Date: {doc.date}</span>
                            <span>Size: {doc.size}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {doc.status === 'available' ? (
                          <button className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Processing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'signed' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Signed Documents</h2>
                <p className="text-slate-600 text-sm">Your completed and digitally signed tax documents</p>
              </div>

              <div className="grid gap-4">
                {signedDocs.map((doc, index) => (
                  <motion.div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                          <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{doc.name}</h3>
                          <p className="text-sm text-slate-500">Signed: {doc.signedDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl">
                          <LockClosedIcon className="w-4 h-4" />
                          <span className="text-xs font-medium">Secured</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}