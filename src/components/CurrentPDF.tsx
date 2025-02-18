'use client'

interface CurrentPDFProps {
  pdfUrl: string | null
}

export default function CurrentPDF({ pdfUrl }: CurrentPDFProps) {
  // Extract filename from blob URL or show default message
  const getFileName = () => {
    if (!pdfUrl) return 'No PDF uploaded'
    
    // Try to get the file name from the URL
    try {
      const url = new URL(pdfUrl)
      const pathParts = url.pathname.split('/')
      return pathParts[pathParts.length - 1] || 'Current PDF'
    } catch {
      return 'Current PDF'
    }
  }

  return (
    <div className="mt-2 p-2 bg-white rounded-lg shadow-sm border border-indigo-100">
      <h3 className="text-xs font-medium text-indigo-900 mb-1">Current PDF</h3>
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-indigo-400 shrink-0"
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
        <span className="text-xs text-indigo-600 truncate">
          {getFileName()}
        </span>
      </div>
    </div>
  )
} 