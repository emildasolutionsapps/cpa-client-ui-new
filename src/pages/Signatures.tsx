import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import { useFilters } from '../contexts/FilterContext';
import { useAuth } from '../contexts/AuthContext';
import { PageFilters } from '../components/PageFilters';
import { SignatureService, SignatureRequest } from '../services/signatureService';

export default function Signatures() {
  const { selectedJobId } = useFilters(); // Only need job filter, not year
  const { user, selectedClient } = useAuth();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load signature requests on component mount and when job or client changes
  useEffect(() => {
    loadSignatureRequests();
  }, [selectedJobId, selectedClient]);

  const loadSignatureRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SignatureService.getSignatureRequests({
        clientId: selectedClient?.ClientID,
        jobId: selectedJobId || undefined
      });

      if (result.success && result.data) {
        console.log('Signatures: Loaded signature requests:', result.data);
        console.log('Signatures: Current selectedJobId:', selectedJobId);
        console.log('Signatures: Current selectedClient:', selectedClient);
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
        await SignatureService.updateRequestStatus(request.RequestID, 'viewed');

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
        await SignatureService.updateRequestStatus(request.RequestID, 'viewed');
        loadSignatureRequests();
      } else {
        setError(result.error || 'Unable to get signing URL');
      }
    } catch (err) {
      console.error('Error opening signing URL:', err);
      setError('Failed to open document for signing');
    }
  };

  // Filter signature requests based on selected job
  // TEMPORARY: Show all requests for debugging
  const filteredRequests = signatureRequests; // Temporarily disable filtering

  console.log('Signatures: Total requests:', signatureRequests.length, 'Filtered requests:', filteredRequests.length);
  console.log('Signatures: Selected Job ID:', selectedJobId);

  const getStatusBadge = (request: SignatureRequest) => {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Digital Signatures</h1>
        <p className="text-slate-600 mb-8">Review and sign required documents for your tax filing</p>

        {/* Debug Info */}
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
          <p><strong>Debug Info:</strong></p>
          <p>Current User Email: {user?.email || 'Not logged in'}</p>
          <p>Selected Client: {selectedClient?.ClientName || 'None'} ({selectedClient?.ClientID || 'No ID'})</p>
          <p>Selected Job ID: {selectedJobId || 'None'}</p>
          <p>Total Signature Requests: {signatureRequests.length}</p>
          <p>Filtered Requests: {filteredRequests.length}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={() => {
                console.log('All signature requests:', signatureRequests);
                console.log('Filtered requests:', filteredRequests);
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Log to Console
            </button>
            <button
              onClick={async () => {
                const result = await SignatureService.getSignatureRequests();
                console.log('Fresh signature requests fetch:', result);
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs"
            >
              Refresh Data
            </button>
            <button
              onClick={async () => {
                // Test direct database query
                const { supabase } = await import('../lib/supabase');
                const { data, error } = await supabase
                  .from('DocumentSigningRequests')
                  .select('*')
                  .limit(10);
                console.log('Direct DB query result:', { data, error });
              }}
              className="px-3 py-1 bg-purple-500 text-white rounded text-xs"
            >
              Test DB Direct
            </button>
          </div>
        </div>

        {/* Service Filter */}
        <PageFilters className="mb-6" showJobFilter={true} showYearFilter={false} />

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
            <p className="text-slate-600">
              {selectedJobId
                ? "No signature requests found for the selected service."
                : "You don't have any documents waiting for signature at this time."
              }
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
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
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
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-slate-900">📄 {request.DocumentName}</h3>
                        {request.Job && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {request.Job.JobName}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mb-3">
                        {SignatureService.getStatusInfo(request).description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>Created: {new Date(request.CreatedAt).toLocaleDateString()}</span>
                        {request.ExpiresAt && (
                          <span>Expires: {new Date(request.ExpiresAt).toLocaleDateString()}</span>
                        )}
                        {request.SignedAt && (
                          <span>Signed: {new Date(request.SignedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(request)}

                    {/* Preview button - always available */}
                    <button
                      onClick={() => handleViewDocumentPreview(request)}
                      className="bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      Preview
                    </button>

                    {/* Signing buttons for pending documents */}
                    {(request.Status === 'pending' || request.Status === 'sent' || request.Status === 'viewed') &&
                     !SignatureService.isExpired(request) && (
                      <>
                        <button
                          onClick={() => handleSignInApp(request)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Sign in App
                        </button>
                        <button
                          onClick={() => handleSignNow(request)}
                          className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                        >
                          Sign in New Tab
                        </button>
                      </>
                    )}

                    {/* View details for signed documents */}
                    {request.Status === 'signed' && (
                      <button
                        onClick={() => handleViewDocument(request)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
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