'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import '@/utils/pdfWorker'

interface PDFViewerProps {
  pdfUrl: string | null
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void
  onPageTextContent?: (text: string) => void
}

export default function PDFViewer({
  pdfUrl,
  currentPage,
  onPageChange,
  totalPages,
  onDocumentLoadSuccess,
  onPageTextContent,
}: PDFViewerProps) {
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [containerHeight, setContainerHeight] = useState<number>(0)
  const pdfDocRef = useRef<any>(null)
  const extractionTimeout = useRef<NodeJS.Timeout>()
  const pageCache = useRef<Map<number, any>>(new Map())
  const textCache = useRef<Map<number, string>>(new Map())

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

  // Preload adjacent pages
  const preloadAdjacentPages = async () => {
    if (!pdfDocRef.current) return;

    const pagesToPreload = [
      currentPage - 1,
      currentPage + 1
    ].filter(page => page > 0 && page <= totalPages);

    for (const pageNum of pagesToPreload) {
      if (!pageCache.current.has(pageNum)) {
        try {
          const page = await pdfDocRef.current.getPage(pageNum);
          pageCache.current.set(pageNum, page);
          // Pre-extract text while we're at it
          if (onPageTextContent && !textCache.current.has(pageNum)) {
            extractTextFromPage(pageNum, page);
          }
        } catch (error) {
          console.error(`Error preloading page ${pageNum}:`, error);
        }
      }
    }
  };

  // Load PDF document once
  useEffect(() => {
    if (pdfUrl) {
      setLoading(true)
      // Clear caches when loading new PDF
      pageCache.current.clear();
      textCache.current.clear();
      
      pdfjs.getDocument(pdfUrl).promise
        .then(pdf => {
          pdfDocRef.current = pdf
          setLoading(false)
          // Preload first page and adjacent pages
          preloadAdjacentPages();
        })
        .catch(error => {
          console.error('Error loading PDF:', error)
          setError('Failed to load PDF. Please try again.')
          setLoading(false)
        })
    }
    
    return () => {
      if (extractionTimeout.current) {
        clearTimeout(extractionTimeout.current)
      }
    }
  }, [pdfUrl])

  // Function to extract text from a page
  const extractTextFromPage = async (pageNum: number, pageObj?: any) => {
    if (!onPageTextContent) return;

    try {
      // Check if we already have the text cached
      if (textCache.current.has(pageNum)) {
        onPageTextContent(textCache.current.get(pageNum)!);
        return;
      }

      const page = pageObj || (pageCache.current.get(pageNum) || await pdfDocRef.current.getPage(pageNum));
      if (!pageCache.current.has(pageNum)) {
        pageCache.current.set(pageNum, page);
      }

      const textContent = await page.getTextContent()
      
      // Improved text extraction with better formatting
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\n\r]+/g, ' ') // Replace newlines with space
        .trim();

      if (text.length > 0) {
        textCache.current.set(pageNum, text);
        onPageTextContent(text);
      }
    } catch (error) {
      console.error('Error extracting text:', error)
    }
  }

  // Extract text with minimal debounce when page changes
  useEffect(() => {
    if (extractionTimeout.current) {
      clearTimeout(extractionTimeout.current)
    }

    extractionTimeout.current = setTimeout(() => {
      if (!pdfDocRef.current || !onPageTextContent) return;
      extractTextFromPage(currentPage);
      // Preload adjacent pages after current page is loaded
      preloadAdjacentPages();
    }, 100) // Reduced debounce time for faster response
  }, [currentPage, onPageTextContent])

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
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={(pdf) => {
            onDocumentLoadSuccess(pdf)
            pdfDocRef.current = pdf
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
          className="flex justify-center w-full"
        >
          <div className="shadow-lg bg-white p-1">
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              className="max-h-[calc(100vh-400px)]"
              renderTextLayer={true}
              renderAnnotationLayer={false}
              loading={null}
              scale={0.8}
              canvasRef={(canvas) => {
                if (canvas) {
                  // Force better quality rendering
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                  }
                }
              }}
            />
          </div>
        </Document>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-center w-full">
        <div className="mt-4 flex items-center justify-center space-x-4" style={{ width: pageWidth }}>
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

          <span className="text-sm text-indigo-600 min-w-[100px] text-center">
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
    </div>
  )
} 