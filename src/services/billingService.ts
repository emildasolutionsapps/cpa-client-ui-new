import { supabase } from '../lib/supabase';
import { 
  BillingInformation, 
  DatabaseBillingInfo,
  BillingServiceResponse
} from '../types/billing';

/**
 * Service for managing client billing information (read-only for client app)
 */
export class BillingService {
  /**
   * Get all billing information for a client
   */
  static async getBillingInformation(clientId: string): Promise<BillingServiceResponse<BillingInformation[]>> {
    try {
      if (!clientId) {
        return { success: false, error: 'Client ID is required' };
      }

      const { data, error } = await supabase
        .from('ClientBillingInformation')
        .select('*')
        .eq('ClientID', clientId)
        .order('IsDefault', { ascending: false })
        .order('CreatedAt', { ascending: false });

      if (error) {
        console.error('Error fetching billing information:', error);
        return { success: false, error: 'Failed to fetch billing information' };
      }

      const billingInfo = data?.map(this.mapDatabaseToBillingInfo) || [];
      return { success: true, data: billingInfo };
    } catch (error) {
      console.error('Error in getBillingInformation:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get default billing information for a client
   */
  static async getDefaultBillingInformation(clientId: string): Promise<BillingServiceResponse<BillingInformation | null>> {
    try {
      if (!clientId) {
        return { success: false, error: 'Client ID is required' };
      }

      const { data, error } = await supabase
        .from('ClientBillingInformation')
        .select('*')
        .eq('ClientID', clientId)
        .eq('IsDefault', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No default billing information found
          return { success: true, data: null };
        }
        console.error('Error fetching default billing information:', error);
        return { success: false, error: 'Failed to fetch default billing information' };
      }

      const billingInfo = this.mapDatabaseToBillingInfo(data);
      return { success: true, data: billingInfo };
    } catch (error) {
      console.error('Error in getDefaultBillingInformation:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Map database record to BillingInformation interface
   */
  private static mapDatabaseToBillingInfo(data: DatabaseBillingInfo): BillingInformation {
    return {
      BillingInfoID: data.BillingInfoID,
      ClientID: data.ClientID,
      BillingContactName: data.BillingContactName,
      BillingCompanyName: data.BillingCompanyName || undefined,
      BillingEmail: data.BillingEmail,
      BillingPhone: data.BillingPhone || undefined,
      BillingAddress: typeof data.BillingAddress === 'string' 
        ? JSON.parse(data.BillingAddress) 
        : data.BillingAddress,
      TaxID: data.TaxID || undefined,
      BillingNotes: data.BillingNotes || undefined,
      IsDefault: data.IsDefault,
      CreatedAt: data.CreatedAt,
      UpdatedAt: data.UpdatedAt,
      CreatedBy: data.CreatedBy || undefined,
      UpdatedBy: data.UpdatedBy || undefined
    };
  }
}
