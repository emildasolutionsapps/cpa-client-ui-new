import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useFilters } from '../contexts/FilterContext';
import { PageFilters } from '../components/PageFilters';
import { SignatureService, SignatureRequest } from '../services/signatureService';

export default function Signatures() {
  const { selectedJobId } = useFilters(); // Only need job filter, not year
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load signature requests on component mount
  useEffect(() => {
    loadSignatureRequests();
  }, []);

  const loadSignatureRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SignatureService.getSignatureRequests();

      if (result.success && result.data) {
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

  // Filter signature requests based on selected job
  const filteredRequests = selectedJobId
    ? signatureRequests.filter(request => request.JobID === selectedJobId)
    : signatureRequests;

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

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Digital Signatures</h1>
        <p className="text-slate-600 mb-8">Review and sign required documents for your tax filing</p>

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
                    {(request.Status === 'pending' || request.Status === 'sent' || request.Status === 'viewed') &&
                     !SignatureService.isExpired(request) && (
                      <button
                        onClick={() => handleSignNow(request)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Sign Now
                      </button>
                    )}
                    {request.Status === 'signed' && (
                      <button
                        onClick={() => handleViewDocument(request)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        View
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
    </div>
  );
}