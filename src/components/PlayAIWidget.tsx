'use client'

import { useEffect, useState, useRef } from 'react'
import { createOrUpdateAgent, createAgent, PlayAIWebSocket } from '@/services/playai'

interface PlayAIWidgetProps {
  currentPage: number
  totalPages: number
  pdfContent: string
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function base64ToAudio(base64Data: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = reject;
  });
}

export default function PlayAIWidget({ currentPage, totalPages, pdfContent }: PlayAIWidgetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<{ user: string; agent: string }>({ user: '', agent: '' })
  
  // Refs for managing WebSocket and audio
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioBufferSourceRef.current) {
        audioBufferSourceRef.current.stop();
      }
    }
  }, [])

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) {
      return;
    }

    try {
      isPlayingRef.current = true;
      const base64Data = audioQueueRef.current[0]; // Peek at the first item

      if (!audioContextRef.current) {
        console.log('Creating new AudioContext');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Convert base64 to Float32Array (raw PCM data)
      const binaryString = atob(base64Data);
      const pcmData = new Float32Array(binaryString.length / 4);
      const dataView = new DataView(new ArrayBuffer(binaryString.length));
      
      for (let i = 0; i < binaryString.length; i++) {
        dataView.setUint8(i, binaryString.charCodeAt(i));
      }
      
      for (let i = 0; i < pcmData.length; i++) {
        pcmData[i] = dataView.getFloat32(i * 4, true);
      }

      console.log('Creating audio buffer...');
      const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, 44100);
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(pcmData);

      console.log('Audio buffer created, duration:', audioBuffer.duration);

      // Create and configure source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      // Add playbackRate control
      source.playbackRate.value = 0.5; // Half speed
      
      // Create a pitch correction node to maintain pitch while slowing down
      const pitchCorrection = audioContextRef.current.createBiquadFilter();
      pitchCorrection.type = 'lowshelf';
      pitchCorrection.frequency.value = 1000;
      pitchCorrection.gain.value = 6;

      // Connect the nodes: source -> pitch correction -> destination
      source.connect(pitchCorrection);
      pitchCorrection.connect(audioContextRef.current.destination);
      
      audioBufferSourceRef.current = source;

      // Play the audio
      console.log('Starting playback at 0.5x speed');
      source.start(0);

      // Handle completion
      source.onended = () => {
        console.log('Playback completed');
        audioBufferSourceRef.current = null;
        isPlayingRef.current = false;
        audioQueueRef.current.shift(); // Remove the played item
        playNextInQueue(); // Play next item if available
      };
    } catch (err) {
      console.error('Error playing audio:', err);
      if (err instanceof Error) {
        setError(`Audio playback error: ${err.message}`);
      }
      isPlayingRef.current = false;
      audioQueueRef.current.shift(); // Remove the problematic item
      playNextInQueue(); // Try next item
    }
  };

  const queueAudio = (base64Data: string) => {
    console.log('Queueing audio chunk');
    audioQueueRef.current.push(base64Data);
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  };

  const setupWebSocket = (agentId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    console.log('Setting up WebSocket for agent:', agentId);
    wsRef.current = new WebSocket(`wss://api.play.ai/v1/talk/${agentId}`);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected, sending setup message');
      if (wsRef.current) {
        const setupMessage = {
          type: 'setup',
          apiKey: process.env.NEXT_PUBLIC_PLAY_AI_SECRET_KEY,
          outputFormat: 'raw',  // Request raw PCM data
          outputSampleRate: 44100,
          inputEncoding: 'media-container',
          outputBitDepth: 32,   // 32-bit float PCM
          outputChannels: 1     // Mono audio
        };
        console.log('Setup message:', setupMessage);
        wsRef.current.send(JSON.stringify(setupMessage));
      }
    };

    wsRef.current.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message type:', message.type, 'at:', new Date().toISOString());

        switch (message.type) {
          case 'audioStream':
            if (typeof message.data === 'string' && message.data.length > 0) {
              console.log('Received audio data, size:', message.data.length);
              queueAudio(message.data);
            } else {
              console.warn('Received empty or invalid audio data');
            }
            break;
          case 'newAudioStream':
            console.log('New audio stream starting');
            // Clear the queue and stop current playback for new stream
            audioQueueRef.current = [];
            if (audioBufferSourceRef.current) {
              try {
                audioBufferSourceRef.current.stop();
              } catch (e) {
                console.log('Error stopping audio:', e);
              }
              audioBufferSourceRef.current = null;
            }
            isPlayingRef.current = false;
            break;
          case 'error':
            console.error('WebSocket error:', message);
            setError(`Error: ${message.message}`);
            break;
          case 'voiceActivityStart':
            console.log('User started speaking');
            setTranscript(prev => ({ ...prev, user: '' }));
            break;
          case 'voiceActivityEnd':
            console.log('User stopped speaking');
            break;
          case 'onUserTranscript':
            console.log('User transcript:', message.message);
            setTranscript(prev => ({ ...prev, user: message.message }));
            break;
          case 'onAgentTranscript':
            console.log('Agent transcript:', message.message);
            setTranscript(prev => ({ ...prev, agent: prev.agent + ' ' + message.message }));
            break;
          default:
            console.log('Unknown message type:', message.type, message);
        }
      } catch (err) {
        console.error('Error processing message:', err);
        console.log('Raw message data:', event.data);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    };
  };

  const startRecording = async () => {
    try {
      if (!currentAgentId) {
        setError('Please create an agent first');
        return;
      }

      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('Got audio data, size:', event.data.size);
          const base64Data = await blobToBase64(event.data);
          console.log('Sending audio data, length:', base64Data.length);
          wsRef.current.send(JSON.stringify({ 
            type: 'audioIn', 
            data: base64Data 
          }));
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      console.log('MediaRecorder started');
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleCreateAgent = async () => {
    if (!pdfContent) {
      setError('Please load a PDF first')
      return
    }

    setIsLoading(true)
    setError(null)
    console.log('Starting agent creation with PDF content length:', pdfContent.length)

    try {
      const options = {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'AUTHORIZATION': process.env.NEXT_PUBLIC_PLAY_AI_SECRET_KEY || '',
          'X-USER-ID': process.env.NEXT_PUBLIC_PLAY_AI_USER_ID || ''
        },
        body: JSON.stringify({
          voice: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
          voiceSpeed: 1.0,
          displayName: "PDF Assistant",
          description: "An AI assistant that helps answer questions about your PDF document",
          greeting: "Hello! I'm ready to help you with any questions about your PDF document.",
          prompt: "You are an AI assistant that helps users understand their PDF documents. When they ask questions, use the provided critical knowledge (PDF content) to give accurate and helpful answers. If the information isn't in the PDF content, let them know.",
          criticalKnowledge: pdfContent,
          visibility: "private",
          answerOnlyFromCriticalKnowledge: true
        })
      };

      console.log('Sending request to create agent...')
      const response = await fetch('https://api.play.ai/api/v1/agents', options)
      const data = await response.json()
      console.log('Agent creation response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create agent')
      }

      setCurrentAgentId(data.id)
      setupWebSocket(data.id)
    } catch (err) {
      console.error('Error creating agent:', err)
      setError('Failed to create agent. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-4">
      {/* Transcript Display */}
      {(transcript.user || transcript.agent) && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 w-80 max-h-60 overflow-y-auto">
          {transcript.user && (
            <div className="mb-2">
              <span className="font-semibold text-indigo-600">You:</span>
              <span className="ml-2">{transcript.user}</span>
            </div>
          )}
          {transcript.agent && (
            <div>
              <span className="font-semibold text-purple-600">Assistant:</span>
              <span className="ml-2">{transcript.agent}</span>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      <div className="relative">
        {isLoading && (
          <div className="absolute -top-8 right-0 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
            {isLoading ? 'Creating agent...' : 'Processing...'}
          </div>
        )}
        {error && (
          <div className="absolute -top-8 right-0 bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Create Agent Button */}
      <button
        onClick={handleCreateAgent}
        disabled={isLoading || !pdfContent}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${isLoading || !pdfContent
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        {currentAgentId ? 'Create New Agent' : 'Create Agent'}
      </button>

      {/* Voice Chat Button */}
      <button
        onClick={toggleRecording}
        disabled={isLoading || !currentAgentId}
        className={`p-3 rounded-full transition-all
          ${isLoading || !currentAgentId
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isRecording
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          {isRecording ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      </button>

      {/* Play.ai Widget Container */}
      <div id="playai-widget" />
    </div>
  )
}
