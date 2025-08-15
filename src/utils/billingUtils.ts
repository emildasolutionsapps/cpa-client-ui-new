import { BillingInformation, BillingAddress } from '../types/billing';

/**
 * Utility functions for billing information formatting and validation
 */
export class BillingUtils {
  /**
   * Format billing address for display
   */
  static formatAddressForDisplay(address: BillingAddress): string {
    const parts = [
      address.street,
      address.street2,
      `${address.city}, ${address.state} ${address.zipCode}`,
      address.country !== 'US' ? address.country : null
    ].filter(Boolean);
    
    return parts.join('\n');
  }

  /**
   * Get billing contact display name
   */
  static getBillingContactDisplay(billing: BillingInformation): string {
    if (billing.BillingCompanyName) {
      return `${billing.BillingContactName} (${billing.BillingCompanyName})`;
    }
    return billing.BillingContactName;
  }

  /**
   * Generate a nickname for billing information
   */
  static generateBillingNickname(billing: BillingInformation): string {
    if (billing.BillingCompanyName) {
      return billing.BillingCompanyName;
    }
    return billing.BillingContactName;
  }

  /**
   * Mask Tax ID for display (show only last 4 digits)
   */
  static maskTaxID(taxId: string): string {
    if (!taxId || taxId.length <= 4) {
      return taxId;
    }
    const masked = '*'.repeat(taxId.length - 4);
    return masked + taxId.slice(-4);
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if not a standard US number
    return phone;
  }

  /**
   * Get billing status information
   */
  static getBillingStatus(billing: BillingInformation): {
    label: string;
    color: string;
    isComplete: boolean;
  } {
    const isComplete = this.isBillingComplete(billing);
    
    if (isComplete) {
      return {
        label: 'Complete',
        color: 'text-green-600',
        isComplete: true
      };
    }
    
    return {
      label: 'Incomplete',
      color: 'text-yellow-600',
      isComplete: false
    };
  }

  /**
   * Check if billing information is complete
   */
  static isBillingComplete(billing: BillingInformation): boolean {
    const requiredFields = [
      billing.BillingContactName,
      billing.BillingEmail,
      billing.BillingAddress?.street,
      billing.BillingAddress?.city,
      billing.BillingAddress?.state,
      billing.BillingAddress?.zipCode,
      billing.BillingAddress?.country
    ];
    
    return requiredFields.every(field => field && field.trim().length > 0);
  }

  /**
   * Get missing billing fields
   */
  static getMissingBillingFields(billing: BillingInformation): string[] {
    const missing: string[] = [];
    
    if (!billing.BillingContactName?.trim()) missing.push('Contact Name');
    if (!billing.BillingEmail?.trim()) missing.push('Email');
    if (!billing.BillingAddress?.street?.trim()) missing.push('Street Address');
    if (!billing.BillingAddress?.city?.trim()) missing.push('City');
    if (!billing.BillingAddress?.state?.trim()) missing.push('State');
    if (!billing.BillingAddress?.zipCode?.trim()) missing.push('ZIP Code');
    if (!billing.BillingAddress?.country?.trim()) missing.push('Country');
    
    return missing;
  }

  /**
   * Format billing information for invoice display
   */
  static formatForInvoice(billing: BillingInformation): {
    billTo: string;
    address: string;
    email: string;
    phone?: string;
    taxId?: string;
  } {
    return {
      billTo: this.getBillingContactDisplay(billing),
      address: this.formatAddressForDisplay(billing.BillingAddress),
      email: billing.BillingEmail,
      phone: billing.BillingPhone ? this.formatPhoneNumber(billing.BillingPhone) : undefined,
      taxId: billing.TaxID
    };
  }
}
