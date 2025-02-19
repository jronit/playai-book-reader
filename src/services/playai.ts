import { pdfjs } from 'react-pdf'
import '@/utils/pdfWorker'

const API_KEY = 'ak-103f9a8168df4f9fa8e3b336b1997082'
const USER_ID = 'irzkK8askqMXXt0WCpEm8Y209xa2'
const API_URL = 'https://api.play.ai/v1/tts/stream'
const AGENT_API_URL = 'https://api.play.ai/v1/agents'

// Maximum length for prompt to prevent API errors
const MAX_PROMPT_LENGTH = 1000

export async function synthesizeSpeech(text: string, voiceId: string) {
  try {
    console.log('Sending TTS request with:', { text: text.substring(0, 100), voiceId })
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const blob = await response.blob()
    if (!blob.size) {
      throw new Error('Received empty audio response')
    }
    
    return blob
  } catch (error) {
    console.error('Error synthesizing speech:', error)
    throw error
  }
}

export async function extractTextFromPDF(pdfUrl: string, pageNumber: number): Promise<string> {
  try {
    console.log('Extracting text from PDF:', { pdfUrl, pageNumber })
    
    const loadingTask = pdfjs.getDocument(pdfUrl)
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
    
    if (!text) {
      console.warn('No text extracted from page:', pageNumber)
    } else {
      console.log('Extracted text:', text.substring(0, 100) + '...')
    }
    
    return text
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw error
  }
}

export async function createOrUpdateAgent(agentId: string, prompt: string) {
  try {
    // Truncate prompt if it's too long
    const truncatedPrompt = prompt.length > MAX_PROMPT_LENGTH 
      ? prompt.substring(0, MAX_PROMPT_LENGTH) + "..."
      : prompt

    console.log('Updating agent:', { 
      agentId, 
      originalLength: prompt.length,
      truncatedLength: truncatedPrompt.length 
    })
    
    const response = await fetch(`https://api.play.ai/v1/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-User-Id': USER_ID,
      },
      body: JSON.stringify({
        voice: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f7-9d2a-4a5c0b6115b5/original/manifest.json',
        voiceSpeed: 1.0,
        displayName: "PDF Reader Agent",
        description: "An AI agent that helps read and understand PDFs",
        greeting: "Hi! I can help answer questions about your PDF document, just press speak and ask me anything.",
        prompt: truncatedPrompt,
        criticalKnowledge: "",
        visibility: "public",
        answerOnlyFromCriticalKnowledge: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Agent API Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint: `https://api.play.ai/v1/agents/${agentId}`,
        requestBody: truncatedPrompt.substring(0, 100) + "..."
      })
      throw new Error(`Failed to update agent: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Agent updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating agent:', error)
    throw error
  }
}

export async function getAgent(agentId: string) {
  try {
    const response = await fetch(`${AGENT_API_URL}/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-User-Id': USER_ID,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get agent: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting agent:', error)
    throw error
  }
}

export async function createAgent(pdfContent: string) {
  try {
    console.log('Creating new agent with PDF content length:', pdfContent.length)
    
    const response = await fetch('https://api.play.ai/api/v1/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-User-Id': USER_ID,
      },
      body: JSON.stringify({
        voice: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
        voiceSpeed: 1.2,
        displayName: "PDF Assistant",
        description: "An AI assistant that helps understand PDF content",
        greeting: "Hello! I'm here to help you understand the PDF content. What would you like to know?",
        prompt: "You are an AI assistant helping users understand PDF content. Answer their questions based on the provided context.",
        criticalKnowledge: pdfContent,
        visibility: "public",
        answerOnlyFromCriticalKnowledge: true,
        llm: null,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Agent Creation Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`Failed to create agent: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Agent created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating agent:', error)
    throw error
  }
}

export class PlayAIWebSocket {
  private ws: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private isRecording = false
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private audioQueue: AudioBuffer[] = []
  private isPlaying = false

  constructor(private agentId: string) {
    // Initialize audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    console.log('Connecting to WebSocket with agent ID:', this.agentId)
    this.ws = new WebSocket(`wss://api.play.ai/v1/talk/${this.agentId}`)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected, sending setup message')
      this.ws.send(JSON.stringify({
        type: "setup",
        apiKey: API_KEY
      }))
    }

    this.ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received WebSocket message:', message.type)
        
        if (message.type === 'audioStream') {
          // Convert base64 to audio buffer
          const byteCharacters = atob(message.data)
          const byteArray = new Uint8Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i)
          }

          try {
            // Decode audio data
            const audioBuffer = await this.audioContext!.decodeAudioData(byteArray.buffer)
            this.audioQueue.push(audioBuffer)
            
            if (!this.isPlaying) {
              this.playNextInQueue()
            }
          } catch (decodeError) {
            console.error('Error decoding audio:', decodeError)
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket closed')
      this.cleanup()
    }
  }

  private async playNextInQueue() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const audioBuffer = this.audioQueue.shift()!

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      
      source.onended = () => {
        this.playNextInQueue()
      }

      source.start(0)
    } catch (error) {
      console.error('Error playing audio:', error)
      this.playNextInQueue()
    }
  }

  async startRecording() {
    if (this.isRecording) return
    
    try {
      // Resume audio context if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume()
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      this.mediaRecorder = new MediaRecorder(this.stream)
      this.chunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
        }
      }
      
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'audio/wav' })
        const reader = new FileReader()
        
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1]
          if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('Sending audio data to WebSocket')
            this.ws.send(JSON.stringify({
              type: "audioIn",
              data: base64Audio
            }))
          } else {
            console.error('WebSocket not connected when trying to send audio')
          }
        }
        
        reader.readAsDataURL(blob)
      }
      
      this.mediaRecorder.start(100)
      this.isRecording = true
      console.log('Started recording')
    } catch (error) {
      console.error('Error starting recording:', error)
      throw error
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return
    
    console.log('Stopping recording')
    this.mediaRecorder.stop()
    this.isRecording = false
    
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => track.stop())
    }
  }

  cleanup() {
    this.stopRecording()
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.audioQueue = []
    this.isPlaying = false
  }

  disconnect() {
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
} 