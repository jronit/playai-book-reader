# PlayAI Book Reader

A modern web application that converts PDF documents into an interactive audio experience. This application allows users to upload PDFs, select from various AI voices, and listen to the content while following along with the text.

## Features

- 📚 PDF document viewing with smooth page navigation
- 🎧 Text-to-speech conversion with multiple AI voice options
- 💬 Interactive AI assistant for document-related questions
- 🔄 Real-time page synchronization between text and audio
- 🎯 Precise text extraction and audio synthesis
- ⚡ Optimized performance with page caching and preloading
- 🎛️ Adjustable playback speed controls

## Technologies Used

### Frontend Framework
- Next.js 14 (React framework)
- TypeScript for type safety
- Tailwind CSS for styling

### PDF Processing
- react-pdf for PDF rendering
- pdf.js for text extraction
- Custom caching system for optimized performance

### Audio Processing
- Web Audio API for audio playback
- MediaRecorder API for voice input
- Custom audio queue system for smooth playback

### AI Integration
- Play.ai API for voice synthesis and AI assistant
- WebSocket integration for real-time AI communication

### Development Tools
- ESLint for code linting
- PostCSS for CSS processing
- TypeScript for static type checking

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- A Play.ai API key (sign up at play.ai)

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/playai-book-reader.git
cd playai-book-reader
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
\`\`\`

3. Create a .env.local file in the root directory:
\`\`\`env
NEXT_PUBLIC_PLAY_AI_SECRET_KEY=your_api_key_here
NEXT_PUBLIC_PLAY_AI_USER_ID=your_user_id_here
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Design Decisions

### Architecture
- **Component-Based Structure**: Modular components for better maintainability and reusability
- **Client-Side Architecture**: Leveraging Next.js for optimal client-side performance
- **State Management**: React's built-in state management with hooks for simplicity

### Performance Optimizations
- **PDF Caching**: Implementation of page and text caching to reduce processing overhead
- **Preloading Strategy**: Adjacent page preloading for seamless navigation
- **Debounced Text Extraction**: Optimized text extraction with minimal delay
- **Audio Buffering**: Custom audio queue system for smooth playback

### User Experience
- **Responsive Design**: Mobile-friendly layout using Tailwind CSS
- **Progressive Loading**: Granular loading progress indicators
- **Error Handling**: Comprehensive error states with user-friendly messages
- **Accessibility**: ARIA labels and keyboard navigation support

### Security
- **API Key Protection**: Environment variables for secure API key storage
- **Input Validation**: Proper file type and size validation
- **Error Boundaries**: Graceful error handling throughout the application

## Project Structure

\`\`\`
src/
├── components/         # React components
│   ├── AudioPlayer.tsx    # Audio playback control
│   ├── PDFViewer.tsx     # PDF rendering
│   ├── VoiceSelector.tsx # Voice selection
│   └── PlayAIWidget.tsx  # AI assistant integration
├── services/          # API services
│   └── playai.ts        # Play.ai API integration
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── app/              # Next.js app directory
\`\`\`

## Key Features Explained

### PDF Processing
- Efficient text extraction using pdf.js
- Page caching for improved performance
- Preloading of adjacent pages
- Real-time text synchronization

### Audio System
- Custom audio queue implementation
- Buffered playback for smooth transitions
- Playback speed control
- Error recovery mechanisms

### AI Integration
- Real-time voice synthesis
- WebSocket-based communication
- Context-aware responses
- Error handling and retry logic

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Play.ai for providing the AI voice synthesis API
- PDF.js contributors for the PDF processing capabilities
- The Next.js team for the excellent framework
- The open-source community for various tools and libraries used

## Contact

Your Name - [@yourusername](https://twitter.com/yourusername)
Project Link: [https://github.com/yourusername/playai-book-reader](https://github.com/yourusername/playai-book-reader) 