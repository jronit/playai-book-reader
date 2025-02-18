import { pdfjs } from 'react-pdf'
import '@/utils/pdfWorker'

const API_KEY = 'ak-c3eaeadb838944cfaec82e41129a71f3'
const USER_ID = '5jcbndHqeMg9yRPw95Ti5cVfNus2'
const API_URL = 'https://api.play.ai/v1/tts/stream'

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