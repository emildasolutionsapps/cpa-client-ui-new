import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';

export default function UploadZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
    simulateUpload();
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <motion.div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {isUploading ? (
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
            <button 
              onClick={simulateUpload}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Choose Files
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Supported formats: PDF, JPG, PNG, DOC, XLSX (Max 10MB)
          </p>
        </div>
      )}
    </motion.div>
  );
}