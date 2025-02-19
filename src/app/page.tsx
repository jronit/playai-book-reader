'use client'

import { useState } from 'react'
import { BookReaderState, Voice } from '@/types'
import PDFUploader from '@/components/PDFUploader'
import VoiceSelector from '@/components/VoiceSelector'
import PDFViewer from '@/components/PDFViewer'
import CurrentPDF from '@/components/CurrentPDF'
import AudioPlayer from '@/components/AudioPlayer'
import PlayAIWidget from '@/components/PlayAIWidget'

const sampleVoices: Voice[] = [
  {
    name: 'Angelo',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Angelo_Sample.wav',
    gender: 'male',
    style: 'Conversational',
  },
  {
    name: 'Deedee',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Deedee_Sample.wav',
    gender: 'female',
    style: 'Conversational',
  },
  {
    name: 'Briggs',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/71cdb799-1e03-41c6-8a05-f7cd55134b0b/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Briggs_Sample.wav',
    gender: 'male',
    style: 'Narrative',
  },
]

const initialState: BookReaderState = {
  currentPage: 1,
  totalPages: 0,
  isPlaying: false,
  selectedVoice: null,
  pdfUrl: null,
  playbackSpeed: 1,
}

export default function Home() {
  const [state, setState] = useState<BookReaderState>(initialState)
  const [currentPdfContent, setCurrentPdfContent] = useState<string>('')

  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setState(prev => ({ 
      ...prev, 
      pdfUrl: url,
      currentPage: 1,
      totalPages: 0 
    }));
    // Reset content when new file is uploaded
    setCurrentPdfContent('');
  }

  const handlePageChange = (newPage: number) => {
    setState(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setState(prev => ({ ...prev, totalPages: numPages }))
  }

  // Function to update PDF content
  const handlePageTextContent = (text: string) => {
    setCurrentPdfContent(text);
  }

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="text-center mb-4">
          <h1 className="text-2xl font-bold text-indigo-900">
            PlayAI Book Reader
          </h1>
          <p className="text-sm text-indigo-600">
            Ronit Jain
          </p>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel */}
          <div className="w-72 flex flex-col gap-4">
            {/* Upload Section */}
            <section className="bg-white rounded-lg shadow-sm border border-indigo-100 p-4">
              <h2 className="text-sm font-semibold text-indigo-900 mb-3">
                Upload PDF
              </h2>
              <PDFUploader onUpload={handleUpload} />
              <CurrentPDF pdfUrl={state.pdfUrl} />
            </section>

            {/* Voice Selection */}
            <section className="flex-1 bg-white rounded-lg shadow-sm border border-indigo-100 p-4 overflow-auto">
              <h2 className="text-sm font-semibold text-indigo-900 mb-3">
                Select Voice to Read the PDF
              </h2>
              <VoiceSelector
                voices={sampleVoices}
                selectedVoice={state.selectedVoice}
                onSelect={(voice) => setState(prev => ({ ...prev, selectedVoice: voice }))}
              />
            </section>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-indigo-100 p-4 flex flex-col">
            <div className="flex-1 min-h-0">
              <PDFViewer
                pdfUrl={state.pdfUrl}
                currentPage={state.currentPage}
                onPageChange={handlePageChange}
                totalPages={state.totalPages}
                onDocumentLoadSuccess={handleDocumentLoadSuccess}
                onPageTextContent={handlePageTextContent}
              />
            </div>

            {/* Audio Controls */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AudioPlayer
                  pdfUrl={state.pdfUrl}
                  currentPage={state.currentPage}
                  selectedVoice={state.selectedVoice}
                  playbackSpeed={state.playbackSpeed}
                  totalPages={state.totalPages}
                  onPageChange={handlePageChange}
                />
                
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-indigo-600">Speed:</label>
                  <select 
                    className="text-xs bg-gray-50 border border-indigo-100 rounded px-2 py-1"
                    value={state.playbackSpeed}
                    onChange={(e) => setState(prev => ({ ...prev, playbackSpeed: Number(e.target.value) }))}
                  >
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PlayAIWidget 
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        pdfContent={currentPdfContent}
      />
    </div>
  )
} 