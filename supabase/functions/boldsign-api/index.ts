import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    // Parse request body as JSON (frontend always sends JSON)
    let requestData;
    const contentType = req.headers.get('content-type') || '';

    console.log('Request method:', req.method)
    console.log('Content-Type:', contentType)

    try {
      // Always try to parse as JSON first since frontend sends JSON
      const text = await req.text()
      console.log('Raw request body:', text)

      if (!text || text.trim() === '') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Empty request body'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      requestData = JSON.parse(text)
      console.log('Parsed request data:', requestData)
    } catch (parseError) {
      console.error('Failed to parse request body as JSON:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { documentId, signerEmail, redirectUrl } = requestData
    console.log('BoldSign API request:', { documentId, signerEmail, redirectUrl })

    // Validate required parameters
    if (!documentId || !signerEmail) {
      console.error('Missing required parameters:', { documentId: !!documentId, signerEmail: !!signerEmail })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: documentId and signerEmail',
          received: { documentId: !!documentId, signerEmail: !!signerEmail }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get BoldSign API key from environment
    const BOLDSIGN_API_KEY = Deno.env.get('BOLDSIGN_API_KEY')
    if (!BOLDSIGN_API_KEY) {
      console.error('BoldSign API key not configured')
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

    // Prepare BoldSign API request
    const boldSignUrl = 'https://api.boldsign.com/v1/document/getEmbeddedSignLink'
    const boldSignPayload = {
      documentId: documentId,
      signerEmail: signerEmail,
      redirectUrl: redirectUrl || `${req.headers.get('origin')}/signatures`
    }

    console.log('Calling BoldSign API:', boldSignUrl)
    console.log('BoldSign payload:', boldSignPayload)

    // Call BoldSign API
    const boldSignResponse = await fetch(boldSignUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': BOLDSIGN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(boldSignPayload)
    })

    console.log('BoldSign response status:', boldSignResponse.status)

    if (!boldSignResponse.ok) {
      const errorText = await boldSignResponse.text()
      console.error('BoldSign API error:', boldSignResponse.status, errorText)
      
      // Try alternative endpoint if embedded link fails
      if (boldSignResponse.status === 404 || boldSignResponse.status === 400) {
        console.log('Trying alternative BoldSign endpoint: getSignLink')
        
        const alternativeUrl = 'https://api.boldsign.com/v1/document/getSignLink'
        const alternativePayload = {
          documentId: documentId,
          signerEmail: signerEmail,
          redirectUrl: redirectUrl || `${req.headers.get('origin')}/signatures`
        }

        const alternativeResponse = await fetch(alternativeUrl, {
          method: 'POST',
          headers: {
            'X-API-KEY': BOLDSIGN_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(alternativePayload)
        })

        if (alternativeResponse.ok) {
          const alternativeResult = await alternativeResponse.json()
          console.log('Alternative BoldSign response:', alternativeResult)
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              signingUrl: alternativeResult.signLink || alternativeResult.signingUrl,
              method: 'redirect'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          const altErrorText = await alternativeResponse.text()
          console.error('Alternative BoldSign API error:', alternativeResponse.status, altErrorText)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `BoldSign API error: ${boldSignResponse.status} - ${errorText}` 
        }),
        { 
          status: boldSignResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await boldSignResponse.json()
    console.log('BoldSign success response:', result)

    // Extract signing URL from response
    const signingUrl = result.signLink || result.signingUrl || result.embeddedSignLink

    if (!signingUrl) {
      console.error('No signing URL in BoldSign response:', result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No signing URL returned from BoldSign API' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

  } catch (error) {
    console.error('Edge function error:', error)
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
