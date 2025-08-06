import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentArrowDownIcon,
  EyeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useClientData } from '../hooks/useClientData';
import { PaymentMethodsList } from '../components/PaymentMethodsList';



export default function Billing() {
  // Use client data hook
  const {
    billing,
    selectedClient,
    loadingBilling,
    billingError
  } = useClientData();

  // Show message if no client is selected
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600">Please select a client profile from the sidebar to view billing information.</p>
        </div>
      </div>
    )
  }

  const handleDownload = (receipt: any) => {
    // In a real app, this would trigger a download
    console.log('Downloading:', receipt.number);
    // You could implement actual file download here
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Billing & Payment Methods</h1>

        {/* Payment Methods Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <PaymentMethodsList clientId={selectedClient.ClientID} />
        </motion.div>

        {/* Receipts and Invoices Section - Coming Soon */}
        <motion.div
          className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center py-8">
            <DocumentArrowDownIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Receipts & Invoices</h2>
            <p className="text-slate-600 mb-4">
              View and download your receipts and invoices here.
            </p>
            <p className="text-sm text-slate-500">
              This feature is coming soon and will include invoice history, payment receipts, and downloadable documents.
            </p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}