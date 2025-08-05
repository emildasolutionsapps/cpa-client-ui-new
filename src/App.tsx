import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute>
              <AppLayout>
                <Documents />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/signatures" element={
            <ProtectedRoute>
              <AppLayout>
                <Signatures />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <AppLayout>
                <Billing />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <ChatLayout>
                <Messages />
              </ChatLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
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