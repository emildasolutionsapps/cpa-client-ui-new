import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CloudArrowDownIcon,
  FunnelIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChevronDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useFilters } from '../contexts/FilterContext';
import { useAuth } from '../contexts/AuthContext';
import { SignatureService, SignatureRequest } from '../services/signatureService';
import { SignatureBadgeService } from '../services/signatureBadgeService';
import { PageFilters } from '../components/PageFilters';

export default function Signatures() {
  const { selectedJobId, selectedJobName, getFilteredJobs, availableJobs } = useFilters();
  const { user, selectedClient } = useAuth();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingRequests, setDownloadingRequests] = useState<Set<string>>(new Set());
  const [uploadingRequests, setUploadingRequests] = useState<Set<string>>(new Set());
  const [showAllJobs, setShowAllJobs] = useState(true); // Default to showing all jobs

  // Get signature counts by client for badges
  const getClientSignatureCounts = () => {
    const counts: { [clientId: string]: { name: string; count: number } } = {};
    signatureRequests.forEach(request => {
      if (request.ClientID) {
        if (!counts[request.ClientID]) {
          counts[request.ClientID] = {
            name: request.ClientName || 'Unknown Client',
            count: 0
          };
        }
        counts[request.ClientID].count++;
      }
    });
    return counts;
  };

  // Load signature requests when client, job, or filter changes
  useEffect(() => {
    if (selectedClient?.ClientID) {
      loadSignatureRequests();
    }
  }, [selectedJobId, selectedClient, showAllJobs]);

  // Set up real-time subscription for signature updates
  useEffect(() => {
    if (selectedClient?.ClientID) {
      const subscription = SignatureBadgeService.subscribeToSignatureUpdates(
        selectedClient.ClientID,
        (count) => {
          console.log('Signatures page: Received signature update, refreshing list');
          loadSignatureRequests();
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedClient]);

  const loadSignatureRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SignatureService.getSignatureRequests({
        clientId: selectedClient?.ClientID,
        jobId: showAllJobs ? undefined : (selectedJobId || undefined)
      });

      if (result.success && result.data) {
        console.log('Signatures: Loaded signature requests:', result.data);
        console.log('Signatures: Current selectedJobId:', selectedJobId);
        console.log('Signatures: Current selectedClient:', selectedClient);
        console.log('Signatures: Show all jobs:', showAllJobs);
        setSignatureRequests(result.data);
      } else {
        setError(result.error || 'Failed to load signature requests');
      }
    } catch (err) {
      console.error('Error loading signature requests:', err);
      setError('Failed to load signature requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSignNow = async (request: SignatureRequest) => {
    try {
      const result = await SignatureService.getSigningUrl(request.RequestID);

      if (result.success && result.signingUrl) {
        // Open BoldSign signing URL in new tab
        window.open(result.signingUrl, '_blank');

        // Update status to viewed
        await SignatureService.updateRequestStatus(request.RequestID, 'viewed', selectedClient?.ClientID);

        // Refresh the list
        loadSignatureRequests();
      } else {
        setError(result.error || 'Unable to get signing URL');
      }
    } catch (err) {
      console.error('Error opening signing URL:', err);
      setError('Failed to open document for signing');
    }
  };

  const handleViewDocument = (request: SignatureRequest) => {
    setSelectedRequest(request);
    setShowSignModal(true);
  };

  const handleViewDocumentPreview = (request: SignatureRequest) => {
    setSelectedRequest(request);
    setShowDocumentViewer(true);
  };

  const handleSignInApp = async (request: SignatureRequest) => {
    try {
      const result = await SignatureService.getSigningUrl(request.RequestID);

      if (result.success && result.signingUrl) {
        // Open signing URL in the document viewer iframe
        setSelectedRequest({
          ...request,
          signingUrl: result.signingUrl
        });
        setShowDocumentViewer(true);

        // Update status to viewed
        await SignatureService.updateRequestStatus(request.RequestID, 'viewed', selectedClient?.ClientID);
        loadSignatureRequests();
      } else {
        setError(result.error || 'Unable to get signing URL');
      }
    } catch (err) {
      console.error('Error opening signing URL:', err);
      setError('Failed to open document for signing');
    }
  };

  const handleDownloadForOffline = async (request: SignatureRequest) => {
    try {
      setDownloadingRequests(prev => new Set(prev).add(request.RequestID));
      setError('');

      // Mock download functionality for now (will implement S3 later)
      console.log('Downloading document for offline signing:', request.DocumentName);

      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to indicate downloaded for offline signing
      await SignatureService.updateRequestStatus(request.RequestID, 'downloaded', selectedClient?.ClientID);

      // For now, just show a success message
      alert(`Document "${request.DocumentName}" downloaded successfully! You can now sign it offline and upload it back.`);

      // Refresh the list to show updated status
      loadSignatureRequests();

    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document for offline signing');
    } finally {
      setDownloadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.RequestID);
        return newSet;
      });
    }
  };

  const handleUploadSignedDocument = async (request: SignatureRequest, file: File) => {
    try {
      setUploadingRequests(prev => new Set(prev).add(request.RequestID));
      setError('');

      // Mock upload functionality for now (will implement S3 later)
      console.log('Uploading signed document:', file.name, 'for request:', request.RequestID);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update status to signed
      await SignatureService.updateRequestStatus(request.RequestID, 'signed', selectedClient?.ClientID);

      alert(`Signed document "${file.name}" uploaded successfully!`);

      // Refresh the list to show updated status
      loadSignatureRequests();

    } catch (err) {
      console.error('Error uploading signed document:', err);
      setError('Failed to upload signed document');
    } finally {
      setUploadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.RequestID);
        return newSet;
      });
    }
  };

  // Filter signature requests based on job selection
  const filteredRequests = showAllJobs
    ? signatureRequests
    : selectedJobId
      ? signatureRequests.filter(request => request.Jobs?.JobID === selectedJobId)
      : signatureRequests;

  console.log('Signatures: Total requests:', signatureRequests.length, 'Filtered requests:', filteredRequests.length);
  console.log('Signatures: Selected Job ID:', selectedJobId, 'Job Name:', selectedJobName);

  // Show no client selected state
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto px-2 lg:px-0">
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <DocumentIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600 mb-4">
            Please select a client from the dashboard to view signature requests.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  const getStatusBadge = (request: SignatureRequest) => {
    // Handle new "downloaded" status
    if (request.Status === 'downloaded') {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-200">
          <CloudArrowDownIcon className="w-4 h-4" />
          <span>Downloaded for Offline</span>
        </span>
      );
    }

    const statusInfo = SignatureService.getStatusInfo(request);

    const colorClasses = {
      green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      yellow: 'bg-amber-100 text-amber-800 border-amber-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const IconComponent = statusInfo.label === 'Signed' ? CheckCircleIcon :
                         statusInfo.label === 'Expired' ? ExclamationTriangleIcon :
                         statusInfo.label === 'Declined' ? XCircleIcon : ClockIcon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}>
        <IconComponent className="w-4 h-4" />
        <span>{statusInfo.label}</span>
      </span>
    );
  };

  // TEMPORARY: Disable job selection requirement for debugging
  // if (!selectedJobId) {
  //   return (
  //     <div className="max-w-4xl mx-auto">
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.6 }}
  //       >
  //         <h1 className="text-2xl font-bold text-slate-900 mb-2">Digital Signatures</h1>
  //         <p className="text-slate-600 mb-8">Review and sign required documents for your tax filing</p>

  //         {/* Service Filter */}
  //         <PageFilters className="mb-6" showJobFilter={true} showYearFilter={false} />

  //         <div className="text-center py-12">
  //           <FolderOpenIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
  //           <h2 className="text-xl font-semibold text-slate-900 mb-2">No Service Selected</h2>
  //           <p className="text-slate-600">Please select a service type from the filters above to view signature requests.</p>
  //         </div>
  //       </motion.div>
  //     </div>
  //   )
  // }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Simple Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Digital Signatures</h1>
          <p className="text-slate-600 mt-1">
            Review and sign required documents
          </p>
        </div>

        {/* Simplified Header with Client Badges */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Digital Signatures</h3>

              {/* Client Badges */}
              {showAllJobs && (
                <div className="flex items-center gap-2 ml-4">
                  {Object.entries(getClientSignatureCounts()).map(([clientId, { name, count }]) => (
                    <div
                      key={clientId}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedJob?.ClientID === clientId
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>{name}</span>
                      <span className="bg-white rounded-full px-1.5 py-0.5 text-xs font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-sm text-gray-500">
              {filteredRequests.length} signatures
            </span>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllJobs}
                  onChange={(e) => setShowAllJobs(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show from all jobs</span>
              </label>
            </div>

            {/* Job Selection Dropdown when not showing all jobs */}
            {!showAllJobs && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Job:</span>
                <PageFilters showJobFilter={true} showYearFilter={false} />
              </div>
            )}
          </div>
        </div>





        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">Loading signature requests...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Signatures</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={loadSignatureRequests}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <DocumentIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Signature Requests</h3>
            <p className="text-slate-600 mb-4">
              {selectedJobId && selectedJobName
                ? `No signature requests found for ${selectedJobName}.`
                : `No signature requests found for ${selectedClient.ClientName}.`}
            </p>

          </div>
        )}

        {/* Signature Requests */}
        {!loading && !error && filteredRequests.length > 0 && (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request.RequestID}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Document Info Section */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    request.Status === 'signed' ? 'bg-emerald-50' :
                    request.Status === 'expired' || request.Status === 'declined' ? 'bg-red-50' :
                    'bg-amber-50'
                  }`}>
                    {request.Status === 'signed' ? (
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                    ) : request.Status === 'expired' ? (
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                    ) : request.Status === 'declined' ? (
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                    ) : (
                      <PencilSquareIcon className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">📄 {request.DocumentName}</h3>
                        {request.Jobs && (
                          <div className="flex items-center space-x-2">
                            <BriefcaseIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              From: <span className="font-medium text-slate-900">{request.Jobs.JobName}</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request)}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm mb-3">
                      {SignatureService.getStatusInfo(request).description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>Created: {new Date(request.CreatedAt).toLocaleDateString()}</span>
                      </span>
                      {request.ExpiresAt && (
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>Expires: {new Date(request.ExpiresAt).toLocaleDateString()}</span>
                        </span>
                      )}
                      {request.SignedAt && (
                        <span>Signed: {new Date(request.SignedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Section - Moved to Bottom */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {/* Preview button - always available */}
                    <button
                      onClick={() => handleViewDocumentPreview(request)}
                      className="bg-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </button>

                    {/* Signing buttons for pending documents */}
                    {(request.Status === 'pending' || request.Status === 'sent' || request.Status === 'viewed') &&
                     !SignatureService.isExpired(request) && (
                      <>
                        <button
                          onClick={() => handleSignInApp(request)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                          Sign Online
                        </button>
                        <button
                          onClick={() => handleSignNow(request)}
                          className="bg-teal-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-1"
                        >
                          <FolderOpenIcon className="w-4 h-4" />
                          New Tab
                        </button>
                        <button
                          onClick={() => handleDownloadForOffline(request)}
                          disabled={downloadingRequests.has(request.RequestID)}
                          className="bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {downloadingRequests.has(request.RequestID) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              Download
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Upload button for downloaded documents */}
                    {request.Status === 'downloaded' && (
                      <>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadSignedDocument(request, file);
                            }
                          }}
                          className="hidden"
                          id={`upload-${request.RequestID}`}
                        />
                        <label
                          htmlFor={`upload-${request.RequestID}`}
                          className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {uploadingRequests.has(request.RequestID) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="w-4 h-4" />
                              Upload Signed
                            </>
                          )}
                        </label>
                      </>
                    )}

                    {/* View details for signed documents */}
                    {request.Status === 'signed' && (
                      <button
                        onClick={() => handleViewDocument(request)}
                        className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Sign Modal */}
      {showSignModal && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Document Details</h2>
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">{selectedRequest?.DocumentName}</h3>
              <p className="text-slate-600 text-sm mb-4">
                {selectedRequest ? SignatureService.getStatusInfo(selectedRequest).description : ''}
              </p>

              {/* Document Info */}
              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-medium">{selectedRequest?.Status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Created:</span>
                  <span>{selectedRequest ? new Date(selectedRequest.CreatedAt).toLocaleDateString() : ''}</span>
                </div>
                {selectedRequest?.ExpiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Expires:</span>
                    <span>{new Date(selectedRequest.ExpiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedRequest?.SignedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Signed:</span>
                    <span>{new Date(selectedRequest.SignedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              {selectedRequest && (selectedRequest.Status === 'pending' || selectedRequest.Status === 'sent' || selectedRequest.Status === 'viewed') &&
               !SignatureService.isExpired(selectedRequest) && (
                <button
                  onClick={() => {
                    if (selectedRequest) {
                      handleSignNow(selectedRequest);
                      setShowSignModal(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Document
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedRequest && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedRequest.DocumentName}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedRequest.signingUrl ? 'Interactive Signing Mode' : 'Document Preview'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {selectedRequest.signingUrl && (
                  <button
                    onClick={() => {
                      if (selectedRequest.signingUrl) {
                        window.open(selectedRequest.signingUrl, '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                  >
                    Open in New Tab
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDocumentViewer(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 p-6">
              {selectedRequest.signingUrl ? (
                <div className="w-full h-full">
                  <iframe
                    src={selectedRequest.signingUrl}
                    className="w-full h-full border border-gray-300 rounded-lg"
                    title="Document Signing"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
                    <p className="text-gray-600 mb-4">
                      Document preview is not available at the moment.
                    </p>
                    <button
                      onClick={() => handleSignNow(selectedRequest)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open in BoldSign
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Status: <span className="font-medium">{selectedRequest.Status}</span>
                  {selectedRequest.ExpiresAt && (
                    <span className="ml-4">
                      Expires: {new Date(selectedRequest.ExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDocumentViewer(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {(selectedRequest.Status === 'pending' || selectedRequest.Status === 'sent' || selectedRequest.Status === 'viewed') &&
                   !SignatureService.isExpired(selectedRequest) && !selectedRequest.signingUrl && (
                    <button
                      onClick={() => {
                        setShowDocumentViewer(false);
                        handleSignInApp(selectedRequest);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Signing
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}