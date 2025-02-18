'use client'

import { useState, useRef, useEffect } from 'react'
import { synthesizeSpeech, extractTextFromPDF } from '@/services/playai'
import { Voice } from '@/types'

interface AudioPlayerProps {
  pdfUrl: string | null
  currentPage: number
  selectedVoice: Voice | null
  playbackSpeed: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function AudioPlayer({
  pdfUrl,
  currentPage,
  selectedVoice,
  playbackSpeed,
  totalPages,
  onPageChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrls, setAudioUrls] = useState<string[]>([])
  const previousPage = useRef(currentPage)

  // Cleanup audio URLs when component unmounts
  useEffect(() => {
    return () => {
      audioUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [audioUrls])

  // Handle page changes
  useEffect(() => {
    if (previousPage.current !== currentPage && audioUrls.length > 0) {
      // Page was changed manually
      const newAudioUrl = audioUrls[currentPage - 1]
      if (audioRef.current && newAudioUrl) {
        audioRef.current.src = newAudioUrl
        audioRef.current.currentTime = 0 // Reset to start of audio
        if (isPlaying) {
          // If we were playing, continue playing on new page
          audioRef.current.play().catch(err => {
            console.error('Error playing audio after page change:', err)
            setError('Error playing audio')
            setIsPlaying(false)
          })
        }
      }
    }
    previousPage.current = currentPage
  }, [currentPage, audioUrls, isPlaying])

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const loadAllPages = async () => {
    if (!pdfUrl || !selectedVoice) {
      setError('Please select a voice and upload a PDF first')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Clear existing audio URLs
      audioUrls.forEach(url => URL.revokeObjectURL(url))
      setAudioUrls([])

      const newAudioUrls: string[] = []
      let successCount = 0

      // Load audio for all pages
      for (let page = 1; page <= totalPages; page++) {
        try {
          setLoadingProgress(Math.round((page / totalPages) * 100))
          console.log(`Processing page ${page} of ${totalPages}`)
          
          // Extract text from page
          const text = await extractTextFromPDF(pdfUrl, page)
          
          if (!text.trim()) {
            console.warn(`No text found on page ${page}`)
            newAudioUrls.push('')
            continue
          }

          // Get audio from API
          const audioBlob = await synthesizeSpeech(text, selectedVoice.value)
          if (!audioBlob.size) {
            throw new Error('Received empty audio response')
          }
          
          const audioUrl = URL.createObjectURL(audioBlob)
          newAudioUrls.push(audioUrl)
          successCount++
          
        } catch (pageError) {
          console.error(`Error processing page ${page}:`, pageError)
          newAudioUrls.push('')
          // Continue with next page instead of failing completely
        }
      }

      if (successCount === 0) {
        throw new Error('Failed to load any audio. Please try again.')
      }

      setAudioUrls(newAudioUrls)
      console.log(`Successfully loaded ${successCount} of ${totalPages} pages`)
      
      // Set up first page audio
      if (audioRef.current && newAudioUrls[currentPage - 1]) {
        audioRef.current.src = newAudioUrls[currentPage - 1]
        audioRef.current.playbackRate = playbackSpeed
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audio. Please try again.')
      console.error('Loading error:', err)
    } finally {
      setIsLoading(false)
      setLoadingProgress(0)
    }
  }

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Error playing audio:', err)
        setError('Error playing audio')
      }
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Handle audio ending
  const handleAudioEnd = () => {
    setIsPlaying(false)
    
    // If there's another page, go to it
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1
      onPageChange(nextPage)
      
      // Audio for next page will be handled by the page change effect
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Load Button */}
      <button
        onClick={loadAllPages}
        disabled={!pdfUrl || !selectedVoice || isLoading}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${(!pdfUrl || !selectedVoice || isLoading)
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Loading... {loadingProgress}%</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>Load All Pages</span>
          </>
        )}
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        disabled={!audioUrls.length || isLoading}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${(!audioUrls.length || isLoading)
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isPlaying
              ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            }
          />
        </svg>
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}

      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnd}
        onError={(e) => {
          console.error('Audio playback error:', e)
          setError('Error playing audio')
          setIsPlaying(false)
        }}
      />
    </div>
  )
} 