/**
 * TypeScript interfaces for billing information in client app
 */

export interface BillingAddress {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface BillingInformation {
  BillingInfoID: string;
  ClientID: string;
  BillingContactName: string;
  BillingCompanyName?: string;
  BillingEmail: string;
  BillingPhone?: string;
  BillingAddress: BillingAddress;
  TaxID?: string;
  BillingNotes?: string;
  IsDefault: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy?: string;
  UpdatedBy?: string;
}

export interface DatabaseBillingInfo {
  BillingInfoID: string;
  ClientID: string;
  BillingContactName: string;
  BillingCompanyName: string | null;
  BillingEmail: string;
  BillingPhone: string | null;
  BillingAddress: string | BillingAddress;
  TaxID: string | null;
  BillingNotes: string | null;
  IsDefault: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface BillingServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}
