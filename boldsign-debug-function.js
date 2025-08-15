// Copy this entire code and paste it in Supabase Dashboard > Edge Functions > Create Function
// Name: boldsign-api-test

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
    console.log('=== BoldSign Debug Function ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    // Log all headers
    const headers = {}
    for (const [key, value] of req.headers.entries()) {
      headers[key] = value
    }
    console.log('Headers:', headers)

    // Get raw body
    const rawBody = await req.text()
    console.log('Raw body:', rawBody)
    console.log('Body length:', rawBody.length)

    // Try to parse as JSON
    let requestData
    try {
      requestData = JSON.parse(rawBody)
      console.log('Parsed JSON successfully:', requestData)
    } catch (parseError) {
      console.error('JSON parse failed:', parseError.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse JSON',
          rawBody: rawBody,
          bodyLength: rawBody.length,
          parseError: parseError.message,
          headers: headers
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract parameters
    const { documentId, signerEmail } = requestData || {}
    console.log('Extracted params:', { documentId, signerEmail })

    // Validate parameters
    if (!documentId || !signerEmail) {
      console.error('Missing required parameters')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          received: { documentId, signerEmail },
          fullRequest: requestData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check BoldSign API key
    const BOLDSIGN_API_KEY = Deno.env.get('BOLDSIGN_API_KEY')
    console.log('BoldSign API key exists:', !!BOLDSIGN_API_KEY)
    console.log('API key length:', BOLDSIGN_API_KEY ? BOLDSIGN_API_KEY.length : 0)

    if (!BOLDSIGN_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'BoldSign API key not configured in environment variables',
          envVars: Object.keys(Deno.env.toObject())
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test BoldSign API call
    const boldSignUrl = 'https://api.boldsign.com/v1/document/getEmbeddedSignLink'
    const boldSignPayload = {
      documentId: documentId,
      signerEmail: signerEmail
    }

    console.log('Calling BoldSign API:', boldSignUrl)
    console.log('BoldSign payload:', boldSignPayload)

    try {
      const boldSignResponse = await fetch(boldSignUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': BOLDSIGN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boldSignPayload)
      })

      console.log('BoldSign response status:', boldSignResponse.status)
      
      const responseText = await boldSignResponse.text()
      console.log('BoldSign response body:', responseText)

      if (!boldSignResponse.ok) {
        // Try alternative endpoint
        console.log('Trying alternative BoldSign endpoint...')
        const altUrl = 'https://api.boldsign.com/v1/document/getSignLink'
        
        const altResponse = await fetch(altUrl, {
          method: 'POST',
          headers: {
            'X-API-KEY': BOLDSIGN_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(boldSignPayload)
        })

        const altResponseText = await altResponse.text()
        console.log('Alternative response status:', altResponse.status)
        console.log('Alternative response body:', altResponseText)

        if (altResponse.ok) {
          let altResult
          try {
            altResult = JSON.parse(altResponseText)
            const signingUrl = altResult.signLink || altResult.signingUrl
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                signingUrl: signingUrl,
                method: 'alternative',
                fullResponse: altResult
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          } catch (parseError) {
            console.error('Failed to parse alternative response:', parseError)
          }
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `BoldSign API error: ${boldSignResponse.status}`,
            details: responseText,
            alternativeDetails: altResponseText,
            payload: boldSignPayload
          }),
          { 
            status: boldSignResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Parse successful response
      let boldSignResult
      try {
        boldSignResult = JSON.parse(responseText)
        console.log('BoldSign success result:', boldSignResult)
      } catch (parseError) {
        console.error('Failed to parse BoldSign response:', parseError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse BoldSign response',
            responseText: responseText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Extract signing URL
      const signingUrl = boldSignResult.signLink || boldSignResult.signingUrl || boldSignResult.embeddedSignLink
      
      if (!signingUrl) {
        console.error('No signing URL found in response')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No signing URL in BoldSign response',
            fullResponse: boldSignResult
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
          method: 'embedded',
          fullResponse: boldSignResult
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
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
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Edge function error',
        message: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
