'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface PDFUploaderProps {
  onUpload: (file: File) => void
}

export default function PDFUploader({ onUpload }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }
      onUpload(file)
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB max
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropRejected: () => {
      setError('Invalid file. Please upload a PDF under 50MB.')
    }
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={`relative rounded-lg border-2 border-dashed p-4 transition-all
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 hover:border-indigo-300'}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 text-indigo-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-1 text-xs text-indigo-500">
            Drag and drop your PDF here, or{' '}
            <span className="text-indigo-600 font-medium">browse</span>
          </p>
          <p className="mt-1 text-xs text-indigo-400">
            Maximum file size: 50MB
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">
          {error}
        </p>
      )}
    </div>
  )
}