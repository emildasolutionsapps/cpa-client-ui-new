# VVV CPA PC Client Portal

A secure client portal for VVV CPA PC with comprehensive authentication and multi-factor authentication (MFA) support.

## Features

### Authentication & Security
- **Secure Login**: Email/password authentication with Supabase Auth
- **Forgot Password**: Password reset via email with secure tokens
- **Set Password**: New user onboarding with secure password setup
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA using authenticator apps
- **Protected Routes**: Route-level authentication protection
- **Session Management**: Automatic session handling and refresh

### User Interface
- **Modern Design**: Beautiful, responsive UI with Tailwind CSS
- **Smooth Animations**: Framer Motion animations throughout
- **Dashboard**: Comprehensive client dashboard
- **Document Management**: Upload and manage documents
- **Digital Signatures**: Sign documents electronically
- **Billing**: View and manage billing information
- **Messaging**: Communicate with accountants
- **Profile Management**: Update profile and security settings

### Client Management System
- **Client Profile Switcher**: Dynamic dropdown to switch between permitted clients
- **Permission-Based Access**: Users only see clients they have permission to access
- **Dynamic Data Loading**: All data automatically filters based on selected client
- **Real-time Updates**: Data refreshes when switching between client profiles
- **Secure Multi-Client Support**: Each user can manage multiple client profiles

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- A Supabase account and project

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Enable the following authentication providers in Authentication > Settings:
   - Email authentication
   - Enable "Confirm email" if desired
4. Set up MFA by enabling TOTP in Authentication > Settings > Multi-Factor Authentication

### 3. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Authentication Flow

### New User Onboarding
1. Admin invites user via Supabase Admin or custom invite function
2. User receives email with secure link
3. User clicks link and is taken to `/set-password` page
4. User creates secure password
5. User is redirected to `/mfa-setup` for mandatory MFA setup
6. User scans QR code with authenticator app
7. User verifies setup with 6-digit code
8. User is redirected to dashboard

### Existing User Login
1. User enters email/password on `/login` page
2. System authenticates with Supabase
3. If MFA is enabled, user is redirected to `/mfa-verify`
4. User enters 6-digit code from authenticator app
5. User is redirected to dashboard

### Password Reset
1. User clicks "Forgot Password?" on login page
2. User enters email address
3. System sends password reset email via Supabase
4. User clicks link in email
5. User is taken to `/set-password` page
6. User creates new password
7. User is redirected to login page

## Client Switching Architecture

### Database Schema Requirements
The client switching system requires the following database tables:

```sql
-- Users table (managed by Supabase Auth)
Users (
  UserID uuid PRIMARY KEY,
  FullName text,
  Email text UNIQUE,
  UserType text,
  IsActive boolean
)

-- Clients table
Clients (
  ClientID uuid PRIMARY KEY,
  ClientName text,
  ClientCode text UNIQUE,
  ClientType text,
  ClientStatus text,
  Email text,
  Phone text,
  Address text
)

-- UserClientPermissions table (links users to clients they can access)
UserClientPermissions (
  PermissionID uuid PRIMARY KEY,
  UserID uuid REFERENCES Users(UserID),
  ClientID uuid REFERENCES Clients(ClientID),
  UNIQUE(UserID, ClientID)
)
```

### Implementation Flow
1. **Authentication Check**: On app load, checks for active Supabase session
2. **Permission Loading**: Fetches user's permitted clients from `UserClientPermissions` table
3. **Client Selection**: Provides dropdown to switch between permitted clients
4. **Dynamic Data Loading**: All data queries are filtered by the selected client ID

### Key Components
- **AuthContext**: Enhanced with client switching functionality
- **useClientData Hook**: Manages client-specific data loading
- **DataService**: Handles all client-filtered database queries
- **Client Switcher UI**: Dropdown in sidebar for client selection

## Security Features

- **Row Level Security (RLS)**: Implement RLS policies in Supabase for data protection
- **JWT Validation**: Automatic JWT token validation and refresh
- **Secure Password Requirements**: Enforced password complexity
- **MFA Protection**: TOTP-based multi-factor authentication
- **Session Management**: Secure session handling with automatic cleanup
- **Protected Routes**: Client-side route protection
- **Client-Based Data Isolation**: Users only access data for permitted clients
- **HTTPS Only**: Production deployment should use HTTPS only

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx
│   ├── Sidebar.tsx     # Enhanced with client switcher
│   ├── FilterBar.tsx   # Updated to use client context
│   ├── StatusCard.tsx
│   └── UploadZone.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx # Enhanced with client switching
├── hooks/              # Custom React hooks
│   └── useClientData.ts # Client-specific data management
├── services/           # Data services
│   └── dataService.ts  # Client-filtered database queries
├── lib/               # Utilities and configurations
│   └── supabase.ts
├── pages/             # Page components (all updated for client switching)
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   ├── SetPassword.tsx
│   ├── MFASetup.tsx
│   ├── MFAVerify.tsx
│   ├── Dashboard.tsx   # Shows client-specific data
│   ├── Documents.tsx   # Client-filtered documents
│   ├── Signatures.tsx
│   ├── Billing.tsx     # Client-specific billing
│   ├── Messages.tsx    # Client-filtered messages
│   └── Profile.tsx
└── App.tsx            # Main application component
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting provider

3. Set up environment variables in your hosting provider:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Configure your hosting provider for SPA routing (redirect all routes to index.html)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for VVV CPA PC.
