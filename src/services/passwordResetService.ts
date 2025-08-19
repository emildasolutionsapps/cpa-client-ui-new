import { supabase } from '../lib/supabase';

/**
 * Service to handle password reset with proper URL routing for different app contexts
 */
export class PasswordResetService {
  private static getResetUrl(appType: 'admin' | 'client'): string {
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (isLocalhost) {
      return `${window.location.origin}/reset-password`;
    }
    
    // Production URLs
    const urls = {
      admin: 'https://vvvcpa.netlify.app/reset-password',
      client: 'https://vvvcpaclient.netlify.app/reset-password'
    };
    
    return urls[appType];
  }

  /**
   * Send password reset email for admin app users
   */
  static async sendAdminPasswordReset(email: string) {
    const resetUrl = this.getResetUrl('admin');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });
    
    return { error };
  }

  /**
   * Send password reset email for client app users
   */
  static async sendClientPasswordReset(email: string) {
    const resetUrl = this.getResetUrl('client');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });
    
    return { error };
  }

  /**
   * Determine which app type based on user context
   * This can be enhanced with more sophisticated logic if needed
   */
  static async sendPasswordResetByUserType(email: string, userType?: 'admin' | 'client') {
    // If userType is explicitly provided, use it
    if (userType) {
      return userType === 'admin' 
        ? this.sendAdminPasswordReset(email)
        : this.sendClientPasswordReset(email);
    }

    // Default behavior: determine by current app context
    const isClientApp = window.location.hostname.includes('vvvcpaclient.netlify.app');
    
    return isClientApp 
      ? this.sendClientPasswordReset(email)
      : this.sendAdminPasswordReset(email);
  }
}
