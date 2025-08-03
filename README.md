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

## Security Features

- **Row Level Security (RLS)**: Implement RLS policies in Supabase for data protection
- **JWT Validation**: Automatic JWT token validation and refresh
- **Secure Password Requirements**: Enforced password complexity
- **MFA Protection**: TOTP-based multi-factor authentication
- **Session Management**: Secure session handling with automatic cleanup
- **Protected Routes**: Client-side route protection
- **HTTPS Only**: Production deployment should use HTTPS only

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx
│   └── Sidebar.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/               # Utilities and configurations
│   └── supabase.ts
├── pages/             # Page components
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   ├── SetPassword.tsx
│   ├── MFASetup.tsx
│   ├── MFAVerify.tsx
│   ├── Dashboard.tsx
│   ├── Documents.tsx
│   ├── Signatures.tsx
│   ├── Billing.tsx
│   ├── Messages.tsx
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
