import './globals.css'
import { Inter } from 'next/font/google'
import PlayAIScript from '@/components/PlayAIScript'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PlayAI Book Reader',
  description: 'An AI-powered book reader that brings your PDFs to life',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <PlayAIScript />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 