// COPY THIS ENTIRE CODE INTO SUPABASE DASHBOARD
// Go to: https://supabase.com/dashboard/project/cjgzilrlesuiaxtexnfk/functions
// Click "Create a new function"
// Name: boldsign-api-test
// Paste this code and deploy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    console.log('=== BoldSign API Function ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)

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
          parseError: parseError.message
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
          error: 'Missing required parameters: documentId and signerEmail',
          received: { documentId, signerEmail }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // BoldSign API key (embedded for testing)
    const BOLDSIGN_API_KEY = 'MjJhY2ExNGItODhlZS00ZjdkLWJlNjQtN2JjZmQ1MjZkNWE0'
    console.log('Using BoldSign API key:', BOLDSIGN_API_KEY.substring(0, 10) + '...')

    // Try embedded sign link first
    const embeddedUrl = 'https://api.boldsign.com/v1/document/getEmbeddedSignLink'
    const boldSignPayload = {
      documentId: documentId,
      signerEmail: signerEmail
    }

    console.log('Calling BoldSign API (embedded):', embeddedUrl)
    console.log('Payload:', boldSignPayload)

    try {
      const embeddedResponse = await fetch(embeddedUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': BOLDSIGN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boldSignPayload)
      })

      console.log('Embedded response status:', embeddedResponse.status)
      const embeddedResponseText = await embeddedResponse.text()
      console.log('Embedded response body:', embeddedResponseText)

      if (embeddedResponse.ok) {
        let embeddedResult
        try {
          embeddedResult = JSON.parse(embeddedResponseText)
          console.log('Embedded result parsed:', embeddedResult)
          
          const signingUrl = embeddedResult.signLink || embeddedResult.signingUrl || embeddedResult.embeddedSignLink
          
          if (signingUrl) {
            console.log('Success! Signing URL found:', signingUrl)
            return new Response(
              JSON.stringify({ 
                success: true, 
                signingUrl: signingUrl,
                method: 'embedded',
                fullResponse: embeddedResult
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
        } catch (parseError) {
          console.error('Failed to parse embedded response:', parseError)
        }
      }

      // If embedded fails, try regular sign link
      console.log('Embedded failed, trying regular sign link...')
      const regularUrl = 'https://api.boldsign.com/v1/document/getSignLink'
      
      const regularResponse = await fetch(regularUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': BOLDSIGN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boldSignPayload)
      })

      console.log('Regular response status:', regularResponse.status)
      const regularResponseText = await regularResponse.text()
      console.log('Regular response body:', regularResponseText)

      if (regularResponse.ok) {
        let regularResult
        try {
          regularResult = JSON.parse(regularResponseText)
          console.log('Regular result parsed:', regularResult)
          
          const signingUrl = regularResult.signLink || regularResult.signingUrl
          
          if (signingUrl) {
            console.log('Success! Regular signing URL found:', signingUrl)
            return new Response(
              JSON.stringify({ 
                success: true, 
                signingUrl: signingUrl,
                method: 'redirect',
                fullResponse: regularResult
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
        } catch (parseError) {
          console.error('Failed to parse regular response:', parseError)
        }
      }

      // Both methods failed
      console.error('Both BoldSign methods failed')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Both BoldSign API methods failed',
          embeddedStatus: embeddedResponse.status,
          embeddedError: embeddedResponseText,
          regularStatus: regularResponse.status,
          regularError: regularResponseText,
          payload: boldSignPayload
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fetchError) {
      console.error('Network error:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Network error calling BoldSign API',
          details: fetchError.message,
          payload: boldSignPayload
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
