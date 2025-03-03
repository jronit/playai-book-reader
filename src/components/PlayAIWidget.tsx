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
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  
  // Refs for managing WebSocket and audio
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
          outputFormat: 'raw',
          outputSampleRate: 44100,
          inputEncoding: 'media-container',
          outputBitDepth: 32,
          outputChannels: 1,
          timeoutSeconds: 60,
          noActivityTimeout: 60,
          silenceThreshold: -50,
          keepAlive: true,
          origin: typeof window !== 'undefined' ? window.location.origin : 'https://your-vercel-domain.vercel.app'
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
            setMessages(prev => {
              // If the last message is from the user, update it
              // Otherwise, add a new user message
              if (prev.length > 0 && prev[prev.length - 1].role === 'user') {
                return [...prev.slice(0, -1), { role: 'user', content: '' }];
              }
              return [...prev, { role: 'user', content: '' }];
            });
            break;
          case 'voiceActivityEnd':
            console.log('User stopped speaking');
            break;
          case 'onUserTranscript':
            console.log('User transcript:', message.message);
            setMessages(prev => {
              // If the last message is from the user, update it
              // Otherwise, add a new user message
              if (prev.length > 0 && prev[prev.length - 1].role === 'user') {
                return [...prev.slice(0, -1), { role: 'user', content: message.message }];
              }
              return [...prev, { role: 'user', content: message.message }];
            });
            break;
          case 'onAgentTranscript':
            console.log('Agent transcript:', message.message);
            setMessages(prev => {
              // If the last message is from the assistant, append to it
              // Otherwise, add a new assistant message
              if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
                return [...prev.slice(0, -1), { 
                  role: 'assistant', 
                  content: prev[prev.length - 1].content + ' ' + message.message 
                }];
              }
              return [...prev, { role: 'assistant', content: message.message }];
            });
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
      // If there's a timeout error, try to reconnect
      if (wsRef.current?.readyState === WebSocket.CLOSED) {
        console.log('Attempting to reconnect...');
        setupWebSocket(agentId);
      }
      setError('Connection error. Attempting to reconnect...');
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      // If it's a timeout closure (code 1006), try to reconnect
      if (event.code === 1006 && currentAgentId) {
        console.log('Connection timed out, attempting to reconnect...');
        setTimeout(() => {
          setupWebSocket(agentId);
        }, 1000);
      }
    };

    // Remove keep-alive ping as it's causing issues
    return () => {};
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
    // Instead of just stopping recording, we'll stop the entire agent
    stopAgent();
  };

  const handleCreateAgent = async () => {
    if (!pdfContent) {
      setError('Please load a PDF first')
      return
    }

    setIsLoading(true)
    setError(null)
    
    const apiKey = process.env.NEXT_PUBLIC_PLAY_AI_SECRET_KEY;
    const userId = process.env.NEXT_PUBLIC_PLAY_AI_USER_ID;

    if (!apiKey || !userId) {
      setError('Missing API credentials');
      setIsLoading(false);
      return;
    }

    console.log('Starting agent creation with:', {
      pdfContentLength: pdfContent.length,
      hasApiKey: !!apiKey,
      hasUserId: !!userId
    });

    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
          'X-User-Id': userId,
          'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://your-vercel-domain.vercel.app'
        },
        body: JSON.stringify({
          voice: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
          voiceSpeed: 1.0,
          displayName: "PDF Assistant",
          description: "An AI assistant that helps answer questions about your PDF document",
          greeting: "Hi! I can help answer questions about your PDF document, just press speak and ask me anything.",
          prompt: "You are an AI assistant that helps users understand their PDF documents. When they ask questions, use the provided critical knowledge (PDF content) to give accurate and helpful answers. If the information isn't in the PDF content, let them know.",
          criticalKnowledge: pdfContent,
          visibility: "private",
          answerOnlyFromCriticalKnowledge: true
        })
      };

      console.log('Sending request to create agent with headers:', {
        contentType: options.headers['Content-Type'],
        authLength: options.headers['Authorization'].length,
        userIdLength: options.headers['X-User-Id'].length,
        origin: options.headers['Origin']
      });

      const response = await fetch('https://api.play.ai/api/v1/agents', options);
      const responseText = await response.text();
      console.log('Raw API Response:', responseText);

      if (!response.ok) {
        throw new Error(responseText || 'Failed to create agent');
      }

      const data = JSON.parse(responseText);
      console.log('Agent creation response:', data);

      setCurrentAgentId(data.id);
      setupWebSocket(data.id);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError('Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const stopAgent = () => {
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop recording if it's active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear audio queue and stop playback
    audioQueueRef.current = [];
    if (audioBufferSourceRef.current) {
      try {
        audioBufferSourceRef.current.stop();
      } catch (e) {
        console.log('Error stopping audio:', e);
      }
      audioBufferSourceRef.current = null;
    }
    
    // Reset all states
    setCurrentAgentId(null);
    setMessages([]);
    isPlayingRef.current = false;
    setIsRecording(false);
  };

  return (
    <div className="fixed bottom-4 right-16 flex flex-col items-end space-y-4">
      {/* Chat Display */}
      {messages.length > 0 && (
        <div 
          ref={chatContainerRef}
          className="bg-white rounded-lg shadow-lg p-4 mb-4 w-80 max-h-96 overflow-y-auto scroll-smooth"
        >
          <div className="flex flex-col space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white ml-4'
                      : 'bg-gray-100 text-gray-800 mr-4'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
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
      <div className="flex space-x-2 items-center">
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

        {currentAgentId && (
          <button
            onClick={stopAgent}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all"
          >
            Stop Agent
          </button>
        )}

        {/* Voice Chat Button */}
        <button
          onClick={toggleRecording}
          disabled={isLoading || !currentAgentId}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all
            ${isLoading || !currentAgentId
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
          <svg 
            className="w-5 h-5" 
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
          <span>{isRecording ? 'Stop' : 'Speak'}</span>
        </button>
      </div>

      {/* Play.ai Widget Container */}
      <div id="playai-widget" />
    </div>
  )
}
