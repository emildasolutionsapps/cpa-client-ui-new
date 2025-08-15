// Copy this entire code and paste it in Supabase Dashboard > Edge Functions > Create Function
// Name: boldsign-api

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    let requestData
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      requestData = await req.json()
    } else {
      // Try to parse as JSON anyway
      const text = await req.text()
      try {
        requestData = JSON.parse(text)
      } catch (parseError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid request format. Expected JSON.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    const { documentId, signerEmail, redirectUrl } = requestData

    // Validate required parameters
    if (!documentId || !signerEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: documentId and signerEmail'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get BoldSign API key
    const BOLDSIGN_API_KEY = Deno.env.get('BOLDSIGN_API_KEY')
    if (!BOLDSIGN_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'BoldSign API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try embedded sign link first
    const embeddedUrl = 'https://api.boldsign.com/v1/document/getEmbeddedSignLink'
    const payload = {
      documentId: documentId,
      signerEmail: signerEmail,
      redirectUrl: redirectUrl || `${req.headers.get('origin')}/signatures`
    }

    try {
      const embeddedResponse = await fetch(embeddedUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': BOLDSIGN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (embeddedResponse.ok) {
        const result = await embeddedResponse.json()
        const signingUrl = result.signLink || result.signingUrl || result.embeddedSignLink
        
        if (signingUrl) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              signingUrl: signingUrl,
              method: 'embedded'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // If embedded fails, try regular sign link
      const regularUrl = 'https://api.boldsign.com/v1/document/getSignLink'
      const regularResponse = await fetch(regularUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': BOLDSIGN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (regularResponse.ok) {
        const result = await regularResponse.json()
        const signingUrl = result.signLink || result.signingUrl
        
        if (signingUrl) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              signingUrl: signingUrl,
              method: 'redirect'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Both methods failed
      const embeddedError = await embeddedResponse.text()
      const regularError = await regularResponse.text()
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Both BoldSign API methods failed',
          embeddedError: embeddedError,
          regularError: regularError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fetchError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Network error calling BoldSign API',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
