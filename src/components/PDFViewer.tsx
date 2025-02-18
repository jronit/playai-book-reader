'use client'

import { useState, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import '@/utils/pdfWorker'

interface PDFViewerProps {
  pdfUrl: string | null
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void
}

export default function PDFViewer({
  pdfUrl,
  currentPage,
  onPageChange,
  totalPages,
  onDocumentLoadSuccess,
}: PDFViewerProps) {
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [containerHeight, setContainerHeight] = useState<number>(0)

  // Reference to measure the container width and height
  const measureContainer = (node: HTMLDivElement) => {
    if (node !== null) {
      const rect = node.getBoundingClientRect()
      // Reduce width to 55% of container
      setPageWidth(rect.width * 0.55)
      setContainerHeight(rect.height)
    }
  }

  // Calculate scale to fit page in container
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.pdf-container')
      if (container) {
        measureContainer(container as HTMLDivElement)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLoadError = (error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF. Please try again with a different file.')
    setLoading(false)
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
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
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-1 text-sm text-indigo-400">
            Upload a PDF to start reading
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={measureContainer}
        className="pdf-container flex-1 overflow-auto relative flex justify-center items-start py-1"
        style={{ maxHeight: 'calc(100vh - 300px)' }} // Further reduced height
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={(pdf) => {
            setLoading(false)
            onDocumentLoadSuccess(pdf)
          }}
          onLoadError={handleLoadError}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="mt-2 text-sm text-indigo-600">Loading PDF...</p>
              </div>
            </div>
          }
          className="flex justify-center"
        >
          <div className="shadow-lg bg-white p-1"> {/* Reduced padding */}
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              className="max-h-[calc(100vh-400px)]" // Further reduced max height
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
              scale={0.8} // Reduced scale from 0.9 to 0.8
            />
          </div>
        </Document>
      </div>

      {/* Navigation controls */}
      <div className="mt-4 flex items-center justify-between">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${currentPage > 1
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>

        <span className="text-sm text-indigo-600">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${currentPage < totalPages
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          <span>Next</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
} 