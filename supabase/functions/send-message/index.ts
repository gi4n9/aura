// Supabase Edge Function: send-message
// Chạy ở Edge Server (gần user) để giảm latency xuống 20-50ms

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MessageRequest {
  conversationId: string
  content: string
  senderId: string
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const startTime = Date.now()
    
    // Parse request body
    const { conversationId, content, senderId }: MessageRequest = await req.json()

    // Validate required fields
    if (!conversationId || !content || !senderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: conversationId, content, senderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate content length
    if (content.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key (bypasses RLS for server-side operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify sender is participant of conversation (security check)
    const { data: participant, error: participantError } = await supabase
      .from('ConversationParticipant')
      .select('id')
      .eq('conversationId', conversationId)
      .eq('userId', senderId)
      .single()

    if (participantError || !participant) {
      console.error('Participant check error:', participantError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Not a participant of this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Helper: Encrypt message with Web Crypto API (AES-256-GCM)
    async function encryptMessageWeb(plainText: string): Promise<string> {
      if (!plainText || plainText.startsWith('enc:v1:')) return plainText;
      try {
        const secret = Deno.env.get('CHAT_ENCRYPTION_KEY') || Deno.env.get('NEXTAUTH_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'aura-default-encryption-salt-key-2026';
        const keyData = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
        const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(plainText);
        const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);
        
        const encryptedBytes = new Uint8Array(encryptedBuffer);
        const cipherBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
        const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);
        
        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        const tagHex = Array.from(tagBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const cipherHex = Array.from(cipherBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        
        return `enc:v1:${ivHex}:${tagHex}:${cipherHex}`;
      } catch (err) {
        console.error('Edge function encryption failed:', err);
        return plainText;
      }
    }

    const encryptedContent = await encryptMessageWeb(content.trim());

    // Insert message into database
    // createdAt: uses PostgreSQL default (now()) - ensures correct ordering
    // updatedAt: must be provided (Prisma @updatedAt has no DB default)
    const messageId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { data: message, error: insertError } = await supabase
      .from('DirectMessage')
      .insert({
        id: messageId,
        content: encryptedContent,
        conversationId: conversationId,
        senderId: senderId,
        updatedAt: now,  // Required - no DB default
        deleted: false,
        // createdAt: omitted - uses DB default now() for correct ordering
      })
      .select('id, content, senderId, conversationId, createdAt')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(`Failed to insert message: ${insertError.message}`)
    }

    // Update conversation's updatedAt timestamp (fire-and-forget, non-blocking)
    supabase
      .from('Conversation')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', conversationId)
      .then(() => {})
      .catch(() => {}) // Ignore errors

    const endTime = Date.now()
    const latency = endTime - startTime

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: {
          id: message.id,
          content: content.trim(),
          senderId: message.senderId,
          conversationId: message.conversationId,
          createdAt: message.createdAt,
        },
        latency: `${latency}ms`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge Function Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
