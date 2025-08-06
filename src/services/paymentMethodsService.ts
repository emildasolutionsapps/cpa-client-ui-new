import { supabase } from "../lib/supabase";
import { PaymentEncryptionService } from "./paymentEncryptionService";
import {
  ClientPaymentMethod,
  CreatePaymentMethodData,
  PaymentMethodConstraints,
  PaymentMethodServiceResponse,
  PaymentMethodValidation,
} from "../types/paymentMethods";

/**
 * Payment Methods Service for Client Application
 * Handles payment method CRUD operations with encryption and validation
 */
export class PaymentMethodsService {
  /**
   * Get all payment methods for the current client
   */
  static async getPaymentMethods(
    clientId: string,
  ): Promise<PaymentMethodServiceResponse<ClientPaymentMethod[]>> {
    try {
      const { data, error } = await supabase
        .from("ClientPaymentMethods")
        .select("*")
        .eq("ClientID", clientId)
        .eq("IsActive", true)
        .order("IsDefault", { ascending: false })
        .order("CreatedAt", { ascending: false });

      if (error) throw error;

      const paymentMethods = data?.map(this.mapPaymentMethodFromDB) || [];
      return { data: paymentMethods, error: null };
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return { data: null, error };
    }
  }

  /**
   * Add new payment method
   */
  static async addPaymentMethod(
    paymentData: CreatePaymentMethodData,
  ): Promise<PaymentMethodServiceResponse<ClientPaymentMethod>> {
    try {
      // Validate payment data
      const validation = this.validatePaymentMethodData(paymentData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check if this should be the default (first payment method)
      const { data: existingMethods } = await this.getPaymentMethods(
        paymentData.clientId,
      );
      const isFirstMethod = !existingMethods || existingMethods.length === 0;

      if (isFirstMethod) {
        paymentData.isDefault = true;
      }

      // If this is set as default, unset other defaults first
      if (paymentData.isDefault) {
        const { error: unsetError } = await supabase
          .from("ClientPaymentMethods")
          .update({
            IsDefault: false,
            UpdatedAt: new Date().toISOString(),
          })
          .eq("ClientID", paymentData.clientId)
          .eq("IsActive", true);

        if (unsetError) {
          console.error("Error unsetting defaults during add:", unsetError);
          // Continue anyway
        }
      }

      // Prepare encrypted data
      const encryptedData = this.prepareEncryptedPaymentData(paymentData);

      // Insert into database
      const { data, error } = await supabase
        .from("ClientPaymentMethods")
        .insert(encryptedData)
        .select()
        .single();

      if (error) throw error;

      const paymentMethod = this.mapPaymentMethodFromDB(data);
      return { data: paymentMethod, error: null };
    } catch (error) {
      console.error("Error adding payment method:", error);
      return { data: null, error };
    }
  }

  /**
   * Update payment method (limited fields for client)
   */
  static async updatePaymentMethod(
    paymentMethodId: string,
    updates: {
      nickname?: string;
      isDefault?: boolean;
      autoPayEnabled?: boolean;
    },
  ): Promise<PaymentMethodServiceResponse<ClientPaymentMethod>> {
    try {
      // If setting as default, use the simplified approach
      if (updates.isDefault) {
        return await this.setAsDefaultPaymentMethod(paymentMethodId);
      }

      // Build update object with only defined values
      const updateData: any = {
        UpdatedAt: new Date().toISOString(),
      };

      if (updates.nickname !== undefined) {
        updateData.PaymentMethodNickname = updates.nickname;
      }
      if (updates.autoPayEnabled !== undefined) {
        updateData.AutoPayEnabled = updates.autoPayEnabled;
      }

      const { data, error } = await supabase
        .from("ClientPaymentMethods")
        .update(updateData)
        .eq("PaymentMethodID", paymentMethodId)
        .select()
        .single();

      if (error) throw error;

      const paymentMethod = this.mapPaymentMethodFromDB(data);
      return { data: paymentMethod, error: null };
    } catch (error) {
      console.error("Error updating payment method:", error);
      return { data: null, error };
    }
  }

  /**
   * Set a payment method as default using a direct approach
   */
  private static async setAsDefaultPaymentMethod(
    paymentMethodId: string,
  ): Promise<PaymentMethodServiceResponse<ClientPaymentMethod>> {
    try {
      // Get the current method to find the client ID
      const { data: currentMethod } = await supabase
        .from("ClientPaymentMethods")
        .select("ClientID, PaymentType")
        .eq("PaymentMethodID", paymentMethodId)
        .single();

      if (!currentMethod) {
        throw new Error("Payment method not found");
      }

      // First, unset all default methods for this client
      const { error: unsetError } = await supabase
        .from("ClientPaymentMethods")
        .update({
          IsDefault: false,
          UpdatedAt: new Date().toISOString(),
        })
        .eq("ClientID", currentMethod.ClientID)
        .eq("IsActive", true);

      if (unsetError) {
        console.error("Error unsetting defaults:", unsetError);
        // Continue anyway, as this might be a partial failure
      }

      // Then set the target method as default
      const { data: updatedMethod, error: setError } = await supabase
        .from("ClientPaymentMethods")
        .update({
          IsDefault: true,
          UpdatedAt: new Date().toISOString(),
        })
        .eq("PaymentMethodID", paymentMethodId)
        .select()
        .single();

      if (setError) throw setError;

      const paymentMethod = this.mapPaymentMethodFromDB(updatedMethod);
      return { data: paymentMethod, error: null };
    } catch (error) {
      console.error("Error setting default payment method:", error);
      return { data: null, error };
    }
  }

  /**
   * Delete payment method (with constraints)
   */
  static async deletePaymentMethod(
    paymentMethodId: string,
  ): Promise<PaymentMethodServiceResponse<boolean>> {
    try {
      // Get current method and check constraints
      const { data: currentMethod } = await supabase
        .from("ClientPaymentMethods")
        .select("ClientID, IsDefault")
        .eq("PaymentMethodID", paymentMethodId)
        .single();

      if (!currentMethod) {
        throw new Error("Payment method not found");
      }

      // Check if this is the only payment method
      const { data: allMethods } = await this.getPaymentMethods(
        currentMethod.ClientID,
      );
      if (allMethods && allMethods.length <= 1) {
        throw new Error(
          "Cannot delete the only payment method. Please add another payment method first.",
        );
      }

      // If deleting the default method, set another as default
      if (currentMethod.IsDefault && allMethods && allMethods.length > 1) {
        const nextDefault = allMethods.find((m) => m.id !== paymentMethodId);
        if (nextDefault) {
          await this.updatePaymentMethod(nextDefault.id, { isDefault: true });
        }
      }

      // Soft delete (set IsActive to false)
      const { error } = await supabase
        .from("ClientPaymentMethods")
        .update({
          IsActive: false,
          UpdatedAt: new Date().toISOString(),
        })
        .eq("PaymentMethodID", paymentMethodId);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error) {
      console.error("Error deleting payment method:", error);
      return { data: null, error };
    }
  }

  /**
   * Get payment method constraints for UI
   */
  static async getPaymentMethodConstraints(
    paymentMethodId: string,
    clientId: string,
  ): Promise<PaymentMethodConstraints> {
    try {
      const { data: allMethods } = await this.getPaymentMethods(clientId);
      const currentMethod = allMethods?.find((m) => m.id === paymentMethodId);

      if (!allMethods || !currentMethod) {
        return {
          canDelete: false,
          canSetDefault: false,
          reason: "Payment method not found",
        };
      }

      const canDelete = allMethods.length > 1;
      const canSetDefault = !currentMethod.isDefault;

      return {
        canDelete,
        canSetDefault,
        reason: !canDelete
          ? "Cannot delete the only payment method"
          : undefined,
      };
    } catch (error) {
      console.error("Error getting payment method constraints:", error);
      return {
        canDelete: false,
        canSetDefault: false,
        reason: "Error checking constraints",
      };
    }
  }

  /**
   * Validate payment method data
   */
  static validatePaymentMethodData(
    data: CreatePaymentMethodData,
  ): PaymentMethodValidation {
    const fieldErrors: { [key: string]: string } = {};

    // Common validations
    if (!data.clientId) {
      fieldErrors.clientId = "Client ID is required";
    }

    if (!data.paymentType) {
      fieldErrors.paymentType = "Payment type is required";
    }

    // Card-specific validations
    if (
      data.paymentType === "credit_card" || data.paymentType === "debit_card"
    ) {
      if (!data.cardNumber) {
        fieldErrors.cardNumber = "Card number is required";
      } else if (
        !PaymentEncryptionService.validateCardNumber(data.cardNumber)
      ) {
        fieldErrors.cardNumber = "Invalid card number";
      }

      if (
        !data.cardExpMonth || data.cardExpMonth < 1 || data.cardExpMonth > 12
      ) {
        fieldErrors.cardExpMonth = "Valid expiry month is required";
      }

      if (!data.cardExpYear || data.cardExpYear < new Date().getFullYear()) {
        fieldErrors.cardExpYear = "Valid expiry year is required";
      }

      if (data.cardExpMonth && data.cardExpYear) {
        if (
          !PaymentEncryptionService.validateExpiryDate(
            data.cardExpMonth,
            data.cardExpYear,
          )
        ) {
          fieldErrors.cardExpiry = "Card has expired";
        }
      }

      if (!data.cardholderName?.trim()) {
        fieldErrors.cardholderName = "Cardholder name is required";
      }

      if (data.cvv) {
        const brand = PaymentEncryptionService.getCardBrand(
          data.cardNumber || "",
        );
        if (!PaymentEncryptionService.validateCVV(data.cvv, brand)) {
          fieldErrors.cvv = "Invalid CVV";
        }
      }
    }

    // Bank account validations
    if (data.paymentType === "bank_account" || data.paymentType === "ach") {
      if (!data.accountNumber?.trim()) {
        fieldErrors.accountNumber = "Account number is required";
      }

      if (!data.routingNumber?.trim()) {
        fieldErrors.routingNumber = "Routing number is required";
      } else if (!/^\d{9}$/.test(data.routingNumber.replace(/\D/g, ""))) {
        fieldErrors.routingNumber = "Routing number must be 9 digits";
      }

      if (!data.bankAccountHolderName?.trim()) {
        fieldErrors.bankAccountHolderName = "Account holder name is required";
      }

      if (!data.bankAccountType) {
        fieldErrors.bankAccountType = "Account type is required";
      }
    }

    const hasErrors = Object.keys(fieldErrors).length > 0;
    return {
      isValid: !hasErrors,
      error: hasErrors ? "Please correct the errors below" : undefined,
      fieldErrors: hasErrors ? fieldErrors : undefined,
    };
  }

  /**
   * Prepare encrypted payment data for database storage
   */
  private static prepareEncryptedPaymentData(
    data: CreatePaymentMethodData,
  ): any {
    const dbData: any = {
      ClientID: data.clientId,
      PaymentType: data.paymentType,
      IsDefault: data.isDefault || false,
      IsActive: true,
      AutoPayEnabled: data.autoPayEnabled || false,
      PaymentMethodNickname: data.nickname,
      BillingAddress: data.billingAddress,
      ZipCode: data.zipCode,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    if (
      data.paymentType === "credit_card" || data.paymentType === "debit_card"
    ) {
      // Encrypt card number
      if (data.cardNumber) {
        const encryptedCard = PaymentEncryptionService.encryptPaymentData(
          data.cardNumber,
        );
        dbData.EncryptedCardNumber = JSON.stringify(encryptedCard);
        dbData.MaskedCardNumber = PaymentEncryptionService.maskCardNumber(
          data.cardNumber,
        );
        dbData.CardLast4 = PaymentEncryptionService.maskBankAccount(
          data.cardNumber,
        );
        dbData.CardBrand = PaymentEncryptionService.getCardBrand(
          data.cardNumber,
        );
      }

      dbData.CardExpMonth = data.cardExpMonth;
      dbData.CardExpYear = data.cardExpYear;
      dbData.CardholderName = data.cardholderName;

      // Encrypt CVV if provided
      if (data.cvv) {
        const encryptedCVV = PaymentEncryptionService.encryptPaymentData(
          data.cvv,
        );
        dbData.EncryptedCVV = JSON.stringify(encryptedCVV);
        dbData.MaskedCVV = "***";
      }
    }

    if (data.paymentType === "bank_account" || data.paymentType === "ach") {
      // Encrypt account number
      if (data.accountNumber) {
        const encryptedAccount = PaymentEncryptionService.encryptPaymentData(
          data.accountNumber,
        );
        dbData.EncryptedBankAccount = JSON.stringify(encryptedAccount);
        dbData.BankAccountLast4 = PaymentEncryptionService.maskBankAccount(
          data.accountNumber,
        );
        dbData.CardLast4 = PaymentEncryptionService.maskBankAccount(
          data.accountNumber,
        ); // For compatibility
      }

      dbData.BankRoutingNumber = data.routingNumber;
      dbData.BankAccountType = data.bankAccountType;
      dbData.BankAccountHolderName = data.bankAccountHolderName;
      dbData.CardholderName = data.bankAccountHolderName; // For compatibility
    }

    return dbData;
  }

  /**
   * Map database record to ClientPaymentMethod interface
   */
  private static mapPaymentMethodFromDB(data: any): ClientPaymentMethod {
    return {
      id: data.PaymentMethodID,
      clientId: data.ClientID,
      paymentType: data.PaymentType,
      isDefault: data.IsDefault,
      isActive: data.IsActive,
      cardLast4: data.CardLast4 || data.BankAccountLast4,
      cardBrand: data.CardBrand,
      cardExpMonth: data.CardExpMonth,
      cardExpYear: data.CardExpYear,
      cardholderName: data.CardholderName || data.BankAccountHolderName,
      bankAccountLast4: data.BankAccountLast4,
      bankAccountHolderName: data.BankAccountHolderName,
      bankAccountType: data.BankAccountType,
      bankRoutingNumber: data.BankRoutingNumber,
      billingAddress: data.BillingAddress,
      nickname: data.PaymentMethodNickname,
      autoPayEnabled: data.AutoPayEnabled,
      processorType: data.ProcessorType,
      processorCustomerId: data.ProcessorCustomerID,
      createdAt: data.CreatedAt,
      updatedAt: data.UpdatedAt,
    };
  }
}
