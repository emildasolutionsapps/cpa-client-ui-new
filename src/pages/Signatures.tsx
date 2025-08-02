import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentIcon, 
  CheckCircleIcon, 
  PencilSquareIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const signatureForms = [
  {
    id: 1,
    name: '8879 - IRS Authorization Form',
    description: 'Authorizes electronic filing of your tax return',
    status: 'pending',
    required: true,
  },
  {
    id: 2,
    name: 'Engagement Letter',
    description: 'Outlines our professional relationship and services',
    status: 'signed',
    required: true,
    signedDate: '2025-01-10',
  },
  {
    id: 3,
    name: 'State Tax Authorization',
    description: 'Authorizes electronic filing of your state return',
    status: 'pending',
    required: false,
  },
];

export default function Signatures() {
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSignNow = (form: any) => {
    setSelectedForm(form);
    setShowSignModal(true);
  };

  const handleSignComplete = () => {
    setShowSignModal(false);
    setShowConfetti(true);
    
    // Update form status (in real app, this would update state/database)
    const formIndex = signatureForms.findIndex(f => f.id === selectedForm?.id);
    if (formIndex !== -1) {
      signatureForms[formIndex].status = 'signed';
      signatureForms[formIndex].signedDate = new Date().toISOString().split('T')[0];
    }
    
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'signed') {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Signed ✅</span>
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <ClockIcon className="w-4 h-4" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Confetti Animation */}
      {showConfetti && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-6xl">🎉</div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Digital Signatures</h1>
        <p className="text-slate-600 mb-8">Review and sign required documents for your tax filing</p>

        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Signature Progress</h2>
            <span className="text-2xl font-bold text-blue-600">
              {signatureForms.filter(f => f.status === 'signed').length}/{signatureForms.filter(f => f.required).length}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-3 shadow-inner">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(signatureForms.filter(f => f.status === 'signed' && f.required).length / signatureForms.filter(f => f.required).length) * 100}%` 
              }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <p className="text-sm text-slate-600 mt-2">
            {signatureForms.filter(f => f.status === 'signed').length} of {signatureForms.filter(f => f.required).length} required signatures completed
          </p>
        </div>

        {/* Signature Forms */}
        <div className="space-y-4">
          {signatureForms.map((form, index) => (
            <motion.div
              key={form.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    form.status === 'signed' ? 'bg-emerald-50' : 'bg-amber-50'
                  }`}>
                    {form.status === 'signed' ? (
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <PencilSquareIcon className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-slate-900">📄 {form.name}</h3>
                      {form.required && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-3">{form.description}</p>
                    {form.signedDate && (
                      <p className="text-slate-500 text-xs">Signed on {form.signedDate}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(form.status)}
                  {form.status === 'pending' && (
                    <button
                      onClick={() => handleSignNow(form)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Sign Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
            <h2 className="text-xl font-bold text-slate-900 mb-4">Sign Document</h2>
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">{selectedForm?.name}</h3>
              <p className="text-slate-600 text-sm mb-4">{selectedForm?.description}</p>
              
              {/* Simulated Document Preview */}
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <DocumentIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Document preview would appear here</p>
                <p className="text-slate-500 text-sm mt-2">In production, this would show the actual document</p>
              </div>
            </div>
            
            {/* Signature Area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Digital Signature</label>
              <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                <p className="text-slate-600 text-sm">Click "Complete Signature" to digitally sign this document</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignComplete}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Complete Signature
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}