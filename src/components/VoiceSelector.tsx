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
            {/* Round Radio Selector */}
            <div className="flex items-center h-5">
              <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center
                ${selectedVoice?.name === voice.name
                  ? 'border-indigo-600 bg-indigo-600'
                  : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {selectedVoice?.name === voice.name && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
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