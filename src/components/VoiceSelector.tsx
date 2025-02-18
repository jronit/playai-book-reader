'use client'

import { Voice } from '@/types'

interface VoiceSelectorProps {
  voices: Voice[]
  selectedVoice: Voice | null
  onSelect: (voice: Voice) => void
}

export default function VoiceSelector({
  voices,
  selectedVoice,
  onSelect,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-2">
      {voices.map((voice) => (
        <div
          key={voice.name}
          className={`relative rounded-lg border p-3 cursor-pointer transition-all
            ${selectedVoice?.name === voice.name
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-200'
            }`}
          onClick={() => onSelect(voice)}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-indigo-900">{voice.name}</h3>
              <div className="mt-1 space-x-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                  {voice.style}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                  {voice.gender}
                </span>
              </div>
            </div>
            {selectedVoice?.name === voice.name && (
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          {voice.sample && (
            <div className="mt-2">
              <audio controls className="w-full h-6">
                <source src={voice.sample} type="audio/wav" />
              </audio>
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 