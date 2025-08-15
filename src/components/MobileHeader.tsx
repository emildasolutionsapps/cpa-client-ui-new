import React from 'react';
import { Bars3Icon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useMobileSidebar } from '../App';
import { COMPANY_LOGO_URL, COMPANY_NAME } from '../constants/branding';

export default function MobileHeader() {
  const { toggleMobileMenu } = useMobileSidebar();

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
            <img
              src={COMPANY_LOGO_URL}
              alt={COMPANY_NAME}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                // Fallback to icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600 hidden" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{COMPANY_NAME}</h1>
          </div>
        </div>
        
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="w-6 h-6 text-slate-700" />
        </button>
      </div>
    </div>
  );
}
