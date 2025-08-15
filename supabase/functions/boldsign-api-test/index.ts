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
    console.log('=== BoldSign API Test Function ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Get raw body
    const rawBody = await req.text()
    console.log('Raw body:', rawBody)

    // Try to parse as JSON
    let requestData;
    try {
      requestData = JSON.parse(rawBody)
      console.log('Parsed JSON:', requestData)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
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

    const { documentId, signerEmail } = requestData

    // Validate parameters
    if (!documentId || !signerEmail) {
      console.error('Missing parameters:', { documentId, signerEmail })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          received: { documentId, signerEmail }
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

    // Test BoldSign API call
    const boldSignUrl = 'https://api.boldsign.com/v1/document/getEmbeddedSignLink'
    const boldSignPayload = {
      documentId: documentId,
      signerEmail: signerEmail
    }

    console.log('Calling BoldSign API:', boldSignUrl)
    console.log('Payload:', boldSignPayload)

    const boldSignResponse = await fetch(boldSignUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': BOLDSIGN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(boldSignPayload)
    })

    console.log('BoldSign response status:', boldSignResponse.status)
    console.log('BoldSign response headers:', Object.fromEntries(boldSignResponse.headers.entries()))

    const responseText = await boldSignResponse.text()
    console.log('BoldSign response body:', responseText)

    if (!boldSignResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `BoldSign API error: ${boldSignResponse.status}`,
          details: responseText,
          url: boldSignUrl,
          payload: boldSignPayload
        }),
        { 
          status: boldSignResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to parse BoldSign response
    let boldSignResult;
    try {
      boldSignResult = JSON.parse(responseText)
    } catch (parseError) {
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

    console.log('BoldSign parsed result:', boldSignResult)

    // Extract signing URL
    const signingUrl = boldSignResult.signLink || boldSignResult.signingUrl || boldSignResult.embeddedSignLink

    return new Response(
      JSON.stringify({ 
        success: true, 
        signingUrl: signingUrl,
        fullResponse: boldSignResult
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
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
