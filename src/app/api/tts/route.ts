import { NextResponse } from 'next/server'

const API_KEY = 'ak-c3eaeadb838944cfaec82e41129a71f3'
const USER_ID = '5jcbndHqeMg9yRPw95Ti5cVfNus2'
const API_URL = 'https://api.play.ai/v1/tts/stream'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-User-Id': USER_ID,
      },
      body: JSON.stringify({
        model: 'PlayDialog',
        text: body.text,
        voice: body.voiceId,
        outputFormat: 'mp3',
        speed: 1.0,
        language: 'english'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new NextResponse(errorText, { status: response.status })
    }

    const audioData = await response.arrayBuffer()
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error) {
    console.error('TTS API error:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to generate speech' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
} 