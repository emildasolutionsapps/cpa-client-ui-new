export interface ChangeRequestData {
  clientName: string;
  userEmail: string;
  changeDetails: string;
  summary: string;
}

export interface SpouseAccessRequestData {
  clientName: string;
  userEmail: string;
  spouseName: string;
  spouseEmail: string;
  relation: string;
}

// Get the N8n webhook URL from environment variables
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || import.meta.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

export const emailService = {
  async sendChangeRequest(data: ChangeRequestData) {
    try {
      console.log('Sending change request with data:', data);
      console.log('Using N8n webhook URL:', N8N_WEBHOOK_URL);

      if (!N8N_WEBHOOK_URL) {
        throw new Error('N8n webhook URL not configured');
      }

      const emailContent = {
        to: 'admin@vvvcpapc.com',
        subject: `Change Request from ${data.clientName}`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">New Change Request</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Client:</strong> ${data.clientName}</p>
              <p><strong>Email:</strong> ${data.userEmail}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="margin: 20px 0;">
              <h3>Change Details:</h3>
              <p style="background: #fff; padding: 15px; border-left: 4px solid #1e40af;">${data.changeDetails}</p>
            </div>
            <div style="margin: 20px 0;">
              <h3>Summary:</h3>
              <p style="background: #fff; padding: 15px; border-left: 4px solid #10b981;">${data.summary}</p>
            </div>
          </div>
        `
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('N8n webhook response:', result);

      return { success: true, data: result };
    } catch (error) {
      console.error('Error sending change request email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send change request'
      };
    }
  },

  async sendSpouseAccessRequest(data: SpouseAccessRequestData) {
    try {
      console.log('Sending spouse access request with data:', data);
      console.log('Using N8n webhook URL:', N8N_WEBHOOK_URL);

      if (!N8N_WEBHOOK_URL) {
        throw new Error('N8n webhook URL not configured');
      }

      const emailContent = {
        to: 'admin@vvvcpapc.com',
        subject: `Portal Access Request for ${data.spouseName}`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">New Portal Access Request</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Requesting Client:</strong> ${data.clientName}</p>
              <p><strong>Client Email:</strong> ${data.userEmail}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0;">Spouse Information:</h3>
              <p><strong>Name:</strong> ${data.spouseName}</p>
              <p><strong>Email:</strong> ${data.spouseEmail}</p>
              <p><strong>Relationship:</strong> ${data.relation}</p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Please verify the relationship and set up portal access for the spouse.</p>
            </div>
          </div>
        `
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('N8n webhook response:', result);

      return { success: true, data: result };
    } catch (error) {
      console.error('Error sending spouse access request email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send spouse access request'
      };
    }
  }
};
