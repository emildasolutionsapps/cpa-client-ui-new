/**
 * Payment Methods Types and Interfaces for Client Application
 * Adapted from admin app structure for client-side use
 */

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ClientPaymentMethod {
  id: string;
  clientId: string;
  paymentType: 'credit_card' | 'debit_card' | 'bank_account' | 'ach';
  isDefault: boolean;
  isActive: boolean;
  
  // Card-specific fields
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardholderName?: string;
  
  // Bank account fields (using card fields for compatibility)
  bankAccountLast4?: string;
  bankAccountHolderName?: string;
  bankAccountType?: 'checking' | 'savings';
  bankRoutingNumber?: string;
  
  // Common fields
  billingAddress?: BillingAddress;
  nickname?: string;
  autoPayEnabled?: boolean;
  processorType?: string;
  processorCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodData {
  clientId: string;
  paymentType: 'credit_card' | 'debit_card' | 'bank_account' | 'ach';
  
  // Raw card data (will be encrypted)
  cardNumber?: string;
  cvv?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardholderName?: string;
  
  // Raw bank data (will be encrypted)
  accountNumber?: string;
  routingNumber?: string;
  bankAccountType?: 'checking' | 'savings';
  bankAccountHolderName?: string;
  
  // Common fields
  billingAddress?: BillingAddress;
  nickname?: string;
  isDefault?: boolean;
  autoPayEnabled?: boolean;
  zipCode?: string;
}

export interface PaymentMethodValidation {
  isValid: boolean;
  error?: string;
  fieldErrors?: {
    [key: string]: string;
  };
}

export interface PaymentMethodServiceResponse<T> {
  data: T | null;
  error: any;
}

export interface EncryptedPaymentData {
  encrypted: string;
  iv: string;
  authTag: string;
}

// Form step types for multi-step modal
export type PaymentMethodFormStep = 'type_selection' | 'details' | 'confirmation';

export interface PaymentMethodFormState {
  step: PaymentMethodFormStep;
  data: Partial<CreatePaymentMethodData>;
  errors: PaymentMethodValidation;
  loading: boolean;
}

// Card brand detection
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unknown';

export interface CardBrandInfo {
  brand: CardBrand;
  displayName: string;
  pattern: RegExp;
  gaps: number[];
  lengths: number[];
  code: {
    name: string;
    size: number;
  };
}

// Payment method display helpers
export interface PaymentMethodDisplay {
  title: string;
  subtitle: string;
  holder: string;
  icon: string;
  brand?: string;
}

// Constraints and business rules
export interface PaymentMethodConstraints {
  canDelete: boolean;
  canSetDefault: boolean;
  reason?: string;
}
