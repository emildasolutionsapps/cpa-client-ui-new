import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './components/Notifications/NotificationProvider';
import { FilterProvider } from './contexts/FilterContext';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import MFASetup from './pages/MFASetup';
import MFAVerify from './pages/MFAVerify';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Signatures from './pages/Signatures';
import Billing from './pages/Billing';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import './index.css';

// Mobile Sidebar Context
interface MobileSidebarContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(undefined);

export const useMobileSidebar = () => {
  const context = useContext(MobileSidebarContext);
  if (context === undefined) {
    throw new Error('useMobileSidebar must be used within a MobileSidebarProvider');
  }
  return context;
};

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const mobileSidebarValue = {
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    toggleMobileMenu,
  };

  return (
    <AuthProvider>
      <MobileSidebarContext.Provider value={mobileSidebarValue}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/mfa-setup" element={<MFASetup />} />
            <Route path="/mfa-verify" element={<MFAVerify />} />

            {/* Protected routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <AppLayout>
                    <Documents />
                  </AppLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
            <Route path="/signatures" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <AppLayout>
                    <Signatures />
                  </AppLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <AppLayout>
                    <Billing />
                  </AppLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <ChatLayout>
                    <Messages />
                  </ChatLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <NotificationProvider>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </NotificationProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </MobileSidebarContext.Provider>
    </AuthProvider>
  );
}

// Layout component for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSidebar();

  return (
    <FilterProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <MobileHeader />
        <Sidebar />
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}

// Special layout for chat page - no padding, full height
function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSidebar();

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      <MobileHeader />
      <Sidebar />
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <main className="flex-1 lg:ml-64 h-full overflow-hidden pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}

export default App;