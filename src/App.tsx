import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './components/Notifications/NotificationProvider';
import { FilterProvider } from './contexts/FilterContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
    </AuthProvider>
  );
}

// Layout component for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}

// Special layout for chat page - no padding, full height
function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default App;