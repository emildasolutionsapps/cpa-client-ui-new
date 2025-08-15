# 🔧 BoldSign API Fix Deployment Guide

## 🎯 **Problem Fixed:**
The edge function was failing with:
- **Error 1**: Wrong BoldSign API endpoint
- **Error 2**: "Body can not be decoded as form data"
- **Error 3**: 500 server error

## 📁 **Files Created:**
1. `supabase/functions/boldsign-api/index.ts` - Fixed edge function
2. `supabase/functions/boldsign-api-test/index.ts` - Debug version with detailed logging
3. `supabase/functions/boldsign-api/deno.json` - Configuration
4. `deploy-boldsign-fix.md` - This deployment guide

## 🚀 **Deployment Steps:**

### **Step 1: Deploy the Debug Function First**
```bash
# Navigate to your project root
cd your-project-root

# Deploy the debug function to test
supabase functions deploy boldsign-api-test --project-ref cjgzilrlesuiaxtexnfk
```

### **Step 2: Test the Debug Function**
The frontend is now temporarily pointing to the debug function. Try signing a document and check the browser console for detailed logs.

### **Step 3: Deploy the Main Function (After Testing)**
```bash
# Deploy the main fixed function
supabase functions deploy boldsign-api --project-ref cjgzilrlesuiaxtexnfk
```

### **Step 4: Switch Back to Main Function**
After testing, update the SignatureService to use the main function:
```typescript
// Change from:
`https://cjgzilrlesuiaxtexnfk.supabase.co/functions/v1/boldsign-api-test`
// Back to:
`https://cjgzilrlesuiaxtexnfk.supabase.co/functions/v1/boldsign-api`
```

### **Step 2: Set Environment Variables**
```bash
# Set your BoldSign API key
supabase secrets set BOLDSIGN_API_KEY=your_boldsign_api_key_here --project-ref cjgzilrlesuiaxtexnfk
```

### **Step 3: Test the Fixed Function**
```bash
# Test the function
curl -X POST https://cjgzilrlesuiaxtexnfk.supabase.co/functions/v1/boldsign-api \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "779066b4-1bff-420c-9c4f-7add614d4ae4",
    "signerEmail": "test@example.com"
  }'
```

## 🔧 **What the Fix Does:**

### **1. Correct API Endpoint:**
- Uses `POST /v1/document/getEmbeddedSignLink` for embedded signing
- Falls back to `POST /v1/document/getSignLink` for redirect signing

### **2. Proper Request Format:**
```typescript
{
  documentId: "document-id",
  signerEmail: "signer@email.com", 
  redirectUrl: "https://your-app.com/signatures"
}
```

### **3. Error Handling:**
- Validates required parameters
- Tries multiple BoldSign endpoints
- Provides detailed error logging
- Returns proper error responses

### **4. CORS Support:**
- Handles preflight requests
- Sets proper CORS headers
- Supports cross-origin requests

## 📊 **Expected Response:**
```json
{
  "success": true,
  "signingUrl": "https://app.boldsign.com/document/sign/...",
  "method": "embedded"
}
```

## 🔍 **Debugging:**
If issues persist, check:
1. **BoldSign API Key**: Ensure it's set correctly
2. **Document ID**: Verify the document exists in BoldSign
3. **Signer Email**: Must match the email in the document
4. **BoldSign Account**: Check if the document is accessible

## 🎯 **Testing After Deployment:**
1. Go to your Signatures page
2. Click "Sign Online" on a pending signature
3. Should now open BoldSign signing interface
4. Check browser console for any remaining errors

---

**This fix addresses the 404 error by using the correct BoldSign API endpoints and proper request format.**
