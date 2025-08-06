import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { DocumentService } from '../services/documentService';

interface UploadZoneProps {
  selectedJobId: string;
  selectedJobName: string;
}

export default function UploadZone({ selectedJobId, selectedJobName }: UploadZoneProps) {
  const { selectedClientId, selectedClient, user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // No need to load jobs here - they come from the dashboard context

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedClientId || !selectedClient || !user || !selectedJobId) {
      setErrorMessage('Please select a job before uploading');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Get client info for S3 path
      const { data: clientInfo, error: clientError } = await DocumentService.getClientInfo(selectedClientId);
      if (clientError || !clientInfo) {
        throw new Error('Failed to get client information');
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload document
      const result = await DocumentService.uploadDocument(
        file,
        selectedJobId,
        selectedClientId,
        user.id,
        clientInfo.ClientName,
        clientInfo.ClientCode
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setUploadStatus('success');
        // Show success message if provided
        if (result.message) {
          console.log('Upload success:', result.message);
        }
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 3000);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Don't render if no client or service is selected
  if (!selectedClient) {
    return (
      <div className="border-2 border-dashed rounded-2xl p-8 text-center border-slate-300 bg-slate-50">
        <CloudArrowUpIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Please select a client to upload documents</p>
      </div>
    );
  }

  if (!selectedJobId) {
    return (
      <div className="border-2 border-dashed rounded-2xl p-8 text-center border-slate-300 bg-slate-50">
        <CloudArrowUpIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Please select a service type above to upload documents</p>
        <p className="text-slate-400 text-sm mt-2">Choose from the "Service Type" dropdown in the filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Service Type Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Uploading for:</span> {selectedJobName}
        </p>
      </div>

      <motion.div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : uploadStatus === 'success'
            ? 'border-green-400 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {uploadStatus === 'success' ? (
          <div className="space-y-4">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-green-900 mb-2">Upload Successful!</p>
              <p className="text-sm text-green-700">Your document has been uploaded and is now available to your CPA.</p>
            </div>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="space-y-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-red-900 mb-2">Upload Failed</p>
              <p className="text-sm text-red-700">{errorMessage}</p>
              <button
                onClick={() => setUploadStatus('idle')}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <CloudArrowUpIcon className="w-12 h-12 text-blue-500 mx-auto" />
            </motion.div>
            <div>
              <p className="text-lg font-medium text-slate-900 mb-2">Uploading...</p>
              <div className="w-full bg-slate-200 rounded-full h-2 max-w-xs mx-auto">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-slate-600 mt-2">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-slate-900 mb-2">
                Drag and drop your documents here
              </p>
              <p className="text-sm text-slate-600 mb-4">
                or click to browse your files
              </p>
              <div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                >
                  Choose Files
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Supported formats: PDF, JPG, PNG, DOC, XLSX (Max 10MB)
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}