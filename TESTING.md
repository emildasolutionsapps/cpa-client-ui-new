# Testing Guide

## Manual Testing Checklist

### Prerequisites
1. Set up Supabase project with authentication enabled
2. Configure environment variables in `.env`
3. Start the development server: `npm run dev`

### Authentication Flow Testing

#### 1. Login Page (`/login`)
- [ ] Page loads correctly with email/password fields
- [ ] Form validation works (empty fields, invalid email)
- [ ] "Forgot Password?" link navigates to forgot password page
- [ ] Password visibility toggle works
- [ ] Error messages display correctly for invalid credentials
- [ ] Successful login redirects to dashboard

#### 2. Forgot Password Flow (`/forgot-password`)
- [ ] Page loads with email input field
- [ ] Form validation works (empty field, invalid email)
- [ ] "Back to Login" link works
- [ ] Email submission shows success message
- [ ] Success state displays correctly with retry option

#### 3. Set Password Page (`/set-password`)
- [ ] Page loads with password fields
- [ ] Password requirements are displayed and validated
- [ ] Password confirmation validation works
- [ ] Password visibility toggles work
- [ ] Strong password requirements are enforced
- [ ] Success redirects to login page

#### 4. MFA Setup (`/mfa-setup`)
- [ ] Step 1: Authenticator app instructions display
- [ ] Step 2: QR code generates and displays
- [ ] Manual entry code is shown
- [ ] 6-digit code input works
- [ ] Code verification succeeds with valid TOTP
- [ ] Step 3: Success message and redirect to dashboard

#### 5. MFA Verification (`/mfa-verify`)
- [ ] Page loads for users with MFA enabled
- [ ] 6-digit code input works
- [ ] Valid TOTP code allows access
- [ ] Invalid code shows error message
- [ ] "Back to Login" signs out user

#### 6. Protected Routes
- [ ] Unauthenticated users redirect to login
- [ ] Authenticated users can access all pages
- [ ] Session persists across page refreshes
- [ ] Logout works from sidebar

#### 7. Profile Page (`/profile`)
- [ ] User information displays correctly
- [ ] MFA status shows correctly
- [ ] MFA toggle redirects to setup when disabled
- [ ] Security settings section works

#### 8. Navigation & Layout
- [ ] Sidebar shows user information
- [ ] Logout button works
- [ ] All navigation links work
- [ ] Responsive design works on mobile

### Error Scenarios to Test

#### Network Errors
- [ ] Offline behavior
- [ ] Slow network responses
- [ ] Supabase service unavailable

#### Invalid States
- [ ] Expired tokens
- [ ] Invalid MFA codes
- [ ] Malformed URLs
- [ ] Missing environment variables

#### Security Tests
- [ ] Direct URL access to protected routes
- [ ] Token manipulation attempts
- [ ] XSS prevention
- [ ] CSRF protection

### Performance Testing
- [ ] Page load times are acceptable
- [ ] Animations are smooth
- [ ] No memory leaks during navigation
- [ ] Bundle size is reasonable

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

## Automated Testing

### Unit Tests
```bash
# Add unit tests for:
# - Authentication context
# - Form validation
# - Utility functions
# - Component rendering
```

### Integration Tests
```bash
# Add integration tests for:
# - Complete authentication flows
# - API interactions
# - Route protection
# - State management
```

### E2E Tests
```bash
# Add E2E tests for:
# - User registration flow
# - Login/logout flow
# - MFA setup and verification
# - Password reset flow
```

## Security Checklist

### Authentication Security
- [ ] Passwords are hashed and salted
- [ ] JWT tokens are properly validated
- [ ] Session management is secure
- [ ] MFA implementation follows TOTP standards

### Data Protection
- [ ] Sensitive data is not logged
- [ ] API keys are not exposed in client
- [ ] User data is properly sanitized
- [ ] HTTPS is enforced in production

### Access Control
- [ ] Route-level protection works
- [ ] API endpoints are protected
- [ ] User can only access their own data
- [ ] Admin functions are properly secured

## Common Issues & Solutions

### Supabase Connection Issues
- Verify environment variables are correct
- Check Supabase project status
- Ensure authentication is enabled

### MFA Setup Problems
- Verify TOTP is enabled in Supabase
- Check system time synchronization
- Test with multiple authenticator apps

### Build/Deploy Issues
- Run `npm run build` to check for errors
- Verify all dependencies are installed
- Check for TypeScript errors

### Performance Issues
- Use React DevTools Profiler
- Check for unnecessary re-renders
- Optimize bundle size with code splitting
