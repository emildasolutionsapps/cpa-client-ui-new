import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
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
import { useFilters } from '../contexts/FilterContext';
import { DocumentService, DocumentRequest, DocumentRecord, Job } from '../services/documentService';
import { getPresignedUrl, listJobFolderFiles } from '../services/s3Service';
import { PageFilters } from '../components/PageFilters';

const tabs = [
  { id: 'requested', name: 'Requested Documents', icon: DocumentIcon, color: 'blue', folderType: '02_Requested_Documents' },
  { id: 'uploads', name: 'My Uploads', icon: CloudArrowUpIcon, color: 'emerald', folderType: '01_Client_General_Uploads' },
  { id: 'deliverables', name: 'Deliverables', icon: ArrowDownTrayIcon, color: 'purple', folderType: '03_Deliverables' },
  { id: 'signed', name: 'Signed Documents', icon: CheckCircleIcon, color: 'green', folderType: '04_Signed_Documents' },
];

export default function Documents() {
  const { selectedClientId, selectedClient, user } = useAuth();
  const { selectedJobId } = useFilters(); // Only need job filter, not year
  const [activeTab, setActiveTab] = useState('requested');

  // State for real data
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [clientDocuments, setClientDocuments] = useState<DocumentRecord[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [s3Files, setS3Files] = useState<Record<string, any[]>>({});
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

  // Load S3 files when active tab or job changes
  useEffect(() => {
    const loadS3FilesForCurrentTab = async () => {
      if (!selectedJobId) {
        setS3Files({});
        return;
      }

      const currentTab = tabs.find(tab => tab.id === activeTab);
      if (currentTab?.folderType) {
        try {
          const result = await listJobFolderFiles(selectedJobId, currentTab.folderType);
          if (result.error) {
            console.warn(`Error loading ${currentTab.folderType}:`, result.error);
            setS3Files(prev => ({ ...prev, [currentTab.folderType]: [] }));
          } else {
            setS3Files(prev => ({ ...prev, [currentTab.folderType]: result.files }));
          }
        } catch (error) {
          console.error(`Error loading ${currentTab.folderType}:`, error);
          setS3Files(prev => ({ ...prev, [currentTab.folderType]: [] }));
        }
      }


    };

    loadS3FilesForCurrentTab();
  }, [selectedJobId, activeTab]);

  // Download S3 file
  const handleS3Download = async (s3Key: string, fileName: string) => {
    try {
      const result = await getPresignedUrl(s3Key);
      if (result.error) {
        setError(result.error);
        return;
      }

      // Open download URL in new tab
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Error downloading S3 file:', error);
      setError('Failed to download file');
    }
  };

  // Render S3 files for a specific folder type
  const renderS3Files = (folderType: string, tabName: string, tabColor: string, canUpload: boolean = false) => {
    const files = s3Files[folderType] || [];

    return (
      <div className="space-y-6">
        <div className={`bg-gradient-to-r from-${tabColor}-50 to-${tabColor}-50 rounded-2xl p-6 border border-${tabColor}-200`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">{tabName}</h2>
              <p className="text-slate-600 text-sm">
                {canUpload ? 'Upload and manage your documents' : 'View available documents'}
              </p>
            </div>
            {canUpload && (
              <div>
                <input
                  type="file"
                  id={`${folderType}-upload`}
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
                  htmlFor={`${folderType}-upload`}
                  className={`inline-flex items-center space-x-2 bg-gradient-to-r from-${tabColor}-600 to-${tabColor}-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-${tabColor}-700 hover:to-${tabColor}-800 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer`}
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Document</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${tabColor}-600 mx-auto`}></div>
            <p className="text-slate-600 mt-2">Loading documents...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.length === 0 ? (
              <div className="text-center py-8">
                <DocumentIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No documents found</p>
                {canUpload && (
                  <p className="text-slate-500 text-sm">Use the "Add Document" button above to upload files</p>
                )}
              </div>
            ) : (
              files.map((file) => (
                <motion.div
                  key={file.key}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-${tabColor}-100 rounded-2xl flex items-center justify-center`}>
                        <DocumentTextIcon className={`w-6 h-6 text-${tabColor}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{file.name}</h3>
                        <p className="text-sm text-slate-500">
                          {formatDate(file.lastModified)} • {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleS3Download(file.key, file.name)}
                        className={`inline-flex items-center space-x-2 bg-${tabColor}-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-${tabColor}-700 transition-colors`}
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

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

  // Show message if no service is selected
  if (!selectedJobId) {
    return (
      <div className="max-w-7xl mx-auto">
        <PageFilters />
        <div className="text-center py-12">
          <FolderOpenIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Service Selected</h2>
          <p className="text-slate-600">Please select a service type from the filters above to view documents.</p>
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
        clientInfo.ClientCode,
        !!requestId // true if this is for a specific request (requested document), false for general upload
      );

      if (result.success) {
        console.log('Document uploaded successfully:', result.documentId);

        // Update document request status and send notification if this was for a specific request
        if (requestId) {
          try {
            // Update the request status to 'uploaded'
            const updateResult = await DocumentService.updateDocumentRequestStatus(requestId, 'uploaded');
            if (updateResult.success) {
              console.log('Document request status updated to uploaded');
            } else {
              console.error('Failed to update request status:', updateResult.error);
            }

            // Send notification to job assignees
            const request = documentRequests.find(r => r.RequestID === requestId);
            if (request && selectedClient) {
              await DocumentService.notifyDocumentUpload({
                jobId: request.JobID,
                clientName: selectedClient.ClientName,
                documentName: file.name,
                requestName: request.RequestName
              });
              console.log('Notification sent to job assignees');
            }
          } catch (notificationError) {
            console.error('Failed to update request status or send notification:', notificationError);
            // Don't fail the upload if notification fails
          }
        }

        // Reload data to show updated state
        console.log('Reloading document requests and documents...');
        const [requestsResult, documentsResult] = await Promise.all([
          DocumentService.getDocumentRequests(selectedClientId),
          DocumentService.getClientDocuments(selectedClientId)
        ]);

        if (!requestsResult.error) {
          console.log('Updated document requests:', requestsResult.data);
          setDocumentRequests(requestsResult.data || []);
        }
        if (!documentsResult.error) {
          console.log('Updated client documents:', documentsResult.data);
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

  // Filter document requests based on selected filters
  const getFilteredDocumentRequests = () => {
    let filtered = documentRequests;

    // Filter by selected job if one is selected
    if (selectedJobId) {
      filtered = filtered.filter(request => request.JobID === selectedJobId);
    }

    return filtered;
  };



  const getDocumentsByType = (type: string) => {
    // Now using display names directly since database was updated
    let filteredDocs = clientDocuments;

    // Filter by document type using display names
    filteredDocs = filteredDocs.filter(doc => doc.DocumentType === type);

    // Filter by selected job if one is selected
    if (selectedJobId) {
      filteredDocs = filteredDocs.filter(doc => doc.JobID === selectedJobId);
    }

    return filteredDocs;
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

        {/* Service Filter */}
        <PageFilters className="mb-6" showJobFilter={true} showYearFilter={false} />

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
              ) : getFilteredDocumentRequests().filter(request => {
                const hasDocument = clientDocuments.some(doc =>
                  doc.JobID === request.JobID &&
                  request.RequestName &&
                  doc.DocumentName &&
                  doc.DocumentName.toLowerCase().includes(request.RequestName.toLowerCase().substring(0, 5))
                );
                return request.Status === 'pending' && !hasDocument;
              }).length === 0 ? (
                <div className="text-center py-8">
                  <DocumentIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No pending document requests</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {getFilteredDocumentRequests().filter(request => {
                    // Show request if it's pending OR if no document exists for this request yet
                    if (request.Status !== 'pending') return false;

                    // Check if there's already a document uploaded for this request
                    const hasDocument = clientDocuments.some(doc =>
                      doc.JobID === request.JobID &&
                      request.RequestName &&
                      doc.DocumentName &&
                      doc.DocumentName.toLowerCase().includes(request.RequestName.toLowerCase().substring(0, 5))
                    );

                    return !hasDocument; // Only show if no document exists yet
                  }).map((request) => (
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
                            <h3 className="font-semibold text-slate-900 text-lg">{request.RequestName || 'Unnamed Request'}</h3>
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
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${
                            request.Status === 'uploaded' || request.Status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {request.Status === 'uploaded' || request.Status === 'completed' ? (
                              <CheckCircleIcon className="w-4 h-4" />
                            ) : (
                              <ClockIcon className="w-4 h-4" />
                            )}
                            <span className="capitalize">{request.Status}</span>
                          </span>
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

              {/* Uploaded Documents Section - Show S3 Files */}
              {(s3Files['02_Requested_Documents'] || []).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Documents</h3>
                  <div className="grid gap-3">
                    {(s3Files['02_Requested_Documents'] || []).map((file) => (
                      <div key={file.key} className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                            <div>
                              <h4 className="font-medium text-slate-900">{file.name}</h4>
                              <p className="text-sm text-slate-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(file.lastModified).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-800 border-emerald-200">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>Uploaded</span>
                            </span>
                            <button
                              onClick={() => handleDownload(file.key, file.name)}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Download file"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'uploads' && renderS3Files('01_Client_General_Uploads', 'My Uploads', 'emerald', true)}

          {activeTab === 'deliverables' && renderS3Files('03_Deliverables', 'Your Deliverables', 'purple', false)}

          {activeTab === 'signed' && renderS3Files('04_Signed_Documents', 'Signed Documents', 'green', false)}
        </motion.div>
      </motion.div>
    </div>
  );
}