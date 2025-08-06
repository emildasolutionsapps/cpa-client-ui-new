import CryptoJS from 'crypto-js';
import { EncryptedPaymentData, CardBrand, CardBrandInfo } from '../types/paymentMethods';

/**
 * Payment Encryption Service for Client Application
 * Handles secure encryption/decryption of payment data using AES-256-CBC
 * Adapted from admin app for client-side use
 */
export class PaymentEncryptionService {
  private static readonly ENCRYPTION_KEY = import.meta.env.VITE_PAYMENT_ENCRYPTION_KEY || 'default-key-change-in-production-32chars';

  /**
   * Encrypt sensitive payment data
   */
  static encryptPaymentData(data: string): EncryptedPaymentData {
    try {
      // Generate random IV (16 bytes for AES)
      const iv = CryptoJS.lib.WordArray.random(16);

      // Encrypt the data using AES-256-CBC
      const encrypted = CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Generate HMAC for authentication
      const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(CryptoJS.enc.Base64), this.ENCRYPTION_KEY);

      return {
        encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64),
        authTag: hmac.toString(CryptoJS.enc.Base64)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt payment data');
    }
  }

  /**
   * Decrypt sensitive payment data (for admin use only)
   */
  static decryptPaymentData(encryptedData: EncryptedPaymentData): string {
    try {
      // Verify HMAC first
      const expectedHmac = CryptoJS.HmacSHA256(encryptedData.encrypted, this.ENCRYPTION_KEY);
      const providedHmac = CryptoJS.enc.Base64.parse(encryptedData.authTag);
      
      if (!CryptoJS.lib.WordArray.create(expectedHmac.words).equals(providedHmac)) {
        throw new Error('Authentication failed - data may have been tampered with');
      }

      // Decrypt the data
      const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
      const encrypted = CryptoJS.enc.Base64.parse(encryptedData.encrypted);
      
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        this.ENCRYPTION_KEY,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt payment data');
    }
  }

  /**
   * Mask credit card number for display
   */
  static maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return '****';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    const last4 = cleaned.slice(-4);
    const masked = '*'.repeat(Math.max(0, cleaned.length - 4)) + last4;
    
    // Add spacing for better readability
    return masked.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Mask bank account number for display
   */
  static maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return '****';
    
    const cleaned = accountNumber.replace(/\D/g, '');
    return cleaned.slice(-4);
  }

  /**
   * Get card brand from card number
   */
  static getCardBrand(cardNumber: string): CardBrand {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    const cardBrands: CardBrandInfo[] = [
      {
        brand: 'visa',
        displayName: 'Visa',
        pattern: /^4/,
        gaps: [4, 8, 12],
        lengths: [13, 16, 19],
        code: { name: 'CVV', size: 3 }
      },
      {
        brand: 'mastercard',
        displayName: 'Mastercard',
        pattern: /^5[1-5]|^2[2-7]/,
        gaps: [4, 8, 12],
        lengths: [16],
        code: { name: 'CVC', size: 3 }
      },
      {
        brand: 'amex',
        displayName: 'American Express',
        pattern: /^3[47]/,
        gaps: [4, 10],
        lengths: [15],
        code: { name: 'CID', size: 4 }
      },
      {
        brand: 'discover',
        displayName: 'Discover',
        pattern: /^6(?:011|5)/,
        gaps: [4, 8, 12],
        lengths: [16, 19],
        code: { name: 'CID', size: 3 }
      },
      {
        brand: 'diners',
        displayName: 'Diners Club',
        pattern: /^3[068]|^30[0-5]/,
        gaps: [4, 10],
        lengths: [14],
        code: { name: 'CVV', size: 3 }
      },
      {
        brand: 'jcb',
        displayName: 'JCB',
        pattern: /^35/,
        gaps: [4, 8, 12],
        lengths: [16],
        code: { name: 'CVV', size: 3 }
      }
    ];

    for (const brand of cardBrands) {
      if (brand.pattern.test(cleaned)) {
        return brand.brand;
      }
    }

    return 'unknown';
  }

  /**
   * Get card brand info
   */
  static getCardBrandInfo(brand: CardBrand): CardBrandInfo | null {
    const cardBrands: { [key in CardBrand]: CardBrandInfo } = {
      visa: {
        brand: 'visa',
        displayName: 'Visa',
        pattern: /^4/,
        gaps: [4, 8, 12],
        lengths: [13, 16, 19],
        code: { name: 'CVV', size: 3 }
      },
      mastercard: {
        brand: 'mastercard',
        displayName: 'Mastercard',
        pattern: /^5[1-5]|^2[2-7]/,
        gaps: [4, 8, 12],
        lengths: [16],
        code: { name: 'CVC', size: 3 }
      },
      amex: {
        brand: 'amex',
        displayName: 'American Express',
        pattern: /^3[47]/,
        gaps: [4, 10],
        lengths: [15],
        code: { name: 'CID', size: 4 }
      },
      discover: {
        brand: 'discover',
        displayName: 'Discover',
        pattern: /^6(?:011|5)/,
        gaps: [4, 8, 12],
        lengths: [16, 19],
        code: { name: 'CID', size: 3 }
      },
      diners: {
        brand: 'diners',
        displayName: 'Diners Club',
        pattern: /^3[068]|^30[0-5]/,
        gaps: [4, 10],
        lengths: [14],
        code: { name: 'CVV', size: 3 }
      },
      jcb: {
        brand: 'jcb',
        displayName: 'JCB',
        pattern: /^35/,
        gaps: [4, 8, 12],
        lengths: [16],
        code: { name: 'CVV', size: 3 }
      },
      unknown: {
        brand: 'unknown',
        displayName: 'Unknown',
        pattern: /.*/,
        gaps: [4, 8, 12],
        lengths: [16],
        code: { name: 'CVV', size: 3 }
      }
    };

    return cardBrands[brand] || null;
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate CVV
   */
  static validateCVV(cvv: string, cardBrand: CardBrand): boolean {
    const cleaned = cvv.replace(/\D/g, '');
    const brandInfo = this.getCardBrandInfo(cardBrand);
    
    if (!brandInfo) return false;
    
    return cleaned.length === brandInfo.code.size;
  }

  /**
   * Validate expiry date
   */
  static validateExpiryDate(month: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  /**
   * Format card number with spaces
   */
  static formatCardNumber(cardNumber: string, brand: CardBrand): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    const brandInfo = this.getCardBrandInfo(brand);
    
    if (!brandInfo) return cleaned;

    let formatted = '';
    let index = 0;

    for (const gap of brandInfo.gaps) {
      if (index >= cleaned.length) break;
      formatted += cleaned.slice(index, gap);
      if (gap < cleaned.length) formatted += ' ';
      index = gap;
    }

    if (index < cleaned.length) {
      formatted += cleaned.slice(index);
    }

    return formatted.trim();
  }
}
