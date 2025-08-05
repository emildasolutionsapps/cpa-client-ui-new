import React, { useState, useEffect } from 'react';
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
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { DocumentService, DocumentRequest, DocumentRecord, Job } from '../services/documentService';

const tabs = [
  { id: 'requested', name: 'Requested Documents', icon: DocumentIcon, color: 'blue' },
  { id: 'uploads', name: 'My Uploads', icon: CloudArrowUpIcon, color: 'emerald' },
  { id: 'deliverables', name: 'Deliverables', icon: ArrowDownTrayIcon, color: 'purple' },
  { id: 'signed', name: 'Signed Documents', icon: CheckCircleIcon, color: 'green' },
];

export default function Documents() {
  const { selectedClientId, selectedClient, user } = useAuth();
  const [activeTab, setActiveTab] = useState('requested');

  // State for real data
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [clientDocuments, setClientDocuments] = useState<DocumentRecord[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadingRequestId, setUploadingRequestId] = useState<string>('');

  // Load data when client changes
  useEffect(() => {
    const loadData = async () => {
      if (!selectedClientId) {
        setDocumentRequests([]);
        setClientDocuments([]);
        setAvailableJobs([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Load all data in parallel
        const [requestsResult, documentsResult, jobsResult] = await Promise.all([
          DocumentService.getDocumentRequests(selectedClientId),
          DocumentService.getClientDocuments(selectedClientId),
          DocumentService.getClientJobs(selectedClientId)
        ]);

        if (requestsResult.error) {
          console.error('Error loading document requests:', requestsResult.error);
        } else {
          setDocumentRequests(requestsResult.data || []);
        }

        if (documentsResult.error) {
          console.error('Error loading documents:', documentsResult.error);
        } else {
          setClientDocuments(documentsResult.data || []);
        }

        if (jobsResult.error) {
          console.error('Error loading jobs:', jobsResult.error);
        } else {
          setAvailableJobs(jobsResult.data || []);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load document data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedClientId]);

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

  const handleDocumentUpload = async (file: File, requestId?: string) => {
    if (!selectedClientId || !selectedClient || !user) {
      setError('Missing required information for upload');
      return;
    }

    // Find the job for this request or use the first available job
    let jobId = '';
    if (requestId) {
      const request = documentRequests.find(r => r.RequestID === requestId);
      jobId = request?.JobID || '';
    } else if (availableJobs.length > 0) {
      jobId = availableJobs[0].JobID;
    }

    if (!jobId) {
      setError('No job available for upload');
      return;
    }

    if (requestId) {
      setUploadingRequestId(requestId);
    }

    try {
      // Get client info for S3 path
      const { data: clientInfo, error: clientError } = await DocumentService.getClientInfo(selectedClientId);
      if (clientError || !clientInfo) {
        throw new Error('Failed to get client information');
      }

      // Upload document
      const result = await DocumentService.uploadDocument(
        file,
        jobId,
        selectedClientId,
        user.id,
        clientInfo.ClientName,
        clientInfo.ClientCode
      );

      if (result.success) {
        // Update request status if this was for a specific request
        if (requestId) {
          await DocumentService.updateDocumentRequestStatus(requestId, 'uploaded');
        }

        // Reload data to show updated state
        const [requestsResult, documentsResult] = await Promise.all([
          DocumentService.getDocumentRequests(selectedClientId),
          DocumentService.getClientDocuments(selectedClientId)
        ]);

        if (!requestsResult.error) {
          setDocumentRequests(requestsResult.data || []);
        }
        if (!documentsResult.error) {
          setClientDocuments(documentsResult.data || []);
        }

      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (requestId) {
        setUploadingRequestId('');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      uploaded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      available: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-purple-100 text-purple-800 border-purple-200',
      signed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      locked: 'bg-slate-100 text-slate-800 border-slate-200',
    };

    const icons = {
      uploaded: <CheckCircleIcon className="w-4 h-4" />,
      pending: <ClockIcon className="w-4 h-4" />,
      completed: <CheckCircleIcon className="w-4 h-4" />,
      cancelled: <ExclamationTriangleIcon className="w-4 h-4" />,
      available: <DocumentIcon className="w-4 h-4" />,
      processing: <ClockIcon className="w-4 h-4" />,
      signed: <CheckCircleIcon className="w-4 h-4" />,
      locked: <LockClosedIcon className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const getDocumentsByType = (type: string) => {
    return clientDocuments.filter(doc => doc.DocumentType === type);
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

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2">Loading document requests...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">{error}</p>
                </div>
              ) : documentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No document requests at this time</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {documentRequests.map((request) => (
                    <motion.div
                      key={request.RequestID}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            request.Status === 'uploaded' || request.Status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}>
                            {request.Status === 'uploaded' || request.Status === 'completed' ? (
                              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{request.RequestName}</h3>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              {request.Description && (
                                <span>{request.Description}</span>
                              )}
                              {request.DueDate && (
                                <div className="flex items-center space-x-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>Due: {formatDate(request.DueDate)}</span>
                                </div>
                              )}
                              <span>Created: {formatDate(request.CreatedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(request.Status)}
                          {request.Status === 'pending' && (
                            <div>
                              <input
                                type="file"
                                id={`upload-${request.RequestID}`}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleDocumentUpload(file, request.RequestID);
                                  }
                                }}
                                disabled={uploadingRequestId === request.RequestID}
                              />
                              <label
                                htmlFor={`upload-${request.RequestID}`}
                                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer ${
                                  uploadingRequestId === request.RequestID
                                    ? 'bg-slate-400 text-white cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                                }`}
                              >
                                {uploadingRequestId === request.RequestID ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <CloudArrowUpIcon className="w-5 h-5" />
                                    <span>Upload Now</span>
                                  </>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'uploads' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">My Uploads</h2>
                    <p className="text-slate-600 text-sm">Documents you have uploaded to your CPA</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="general-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentUpload(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="general-upload"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>Add Document</span>
                    </label>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2">Loading your uploads...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {getDocumentsByType('Client Upload').length === 0 ? (
                    <div className="text-center py-8">
                      <CloudArrowUpIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No uploads yet</p>
                      <p className="text-slate-500 text-sm">Use the "Add Document" button above to upload files</p>
                    </div>
                  ) : (
                    getDocumentsByType('Client Upload').map((doc) => (
                      <motion.div
                        key={doc.DocumentID}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                              <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg">{doc.FileName}</h3>
                              <p className="text-sm text-slate-500">
                                Uploaded: {formatDate(doc.CreatedAt)} • {formatFileSize(doc.FileSize)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(doc.Status)}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Your Deliverables</h2>
                <p className="text-slate-600 text-sm">Download your completed tax documents and reports</p>
              </div>

              <div className="grid gap-4">
                {getDocumentsByType('Deliverable').length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpenIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No deliverables available yet</p>
                    <p className="text-slate-500 text-sm">Your completed documents will appear here when ready</p>
                  </div>
                ) : (
                  getDocumentsByType('Deliverable').map((doc) => (
                    <motion.div
                      key={doc.DocumentID}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <FolderOpenIcon className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{doc.FileName}</h3>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <span>Created: {formatDate(doc.CreatedAt)}</span>
                              <span>Size: {formatFileSize(doc.FileSize)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(doc.Status)}
                          <button className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
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
                {getDocumentsByType('Signed Document').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No signed documents yet</p>
                    <p className="text-slate-500 text-sm">Signed documents will appear here once completed</p>
                  </div>
                ) : (
                  getDocumentsByType('Signed Document').map((doc) => (
                    <motion.div
                      key={doc.DocumentID}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{doc.FileName}</h3>
                            <p className="text-sm text-slate-500">Signed: {formatDate(doc.CreatedAt)}</p>
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
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}