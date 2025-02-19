# PlayAI Book Reader

https://playai-book-reader-ronitjain5.replit.app/ 

This web application converts your PDFs and reads them aloud using PlayAI's voice Text To Speech API. Moreover, using PlayAI's Voice Agent's the user can chat with the application to ask questions pertaining to the uploaded document. To use, start off by uploading a PDF in the top left of the page. Then, you can select a voice to read over the PDF. After selecting a voice, press the "Load Pages to Read" button. This will start process of parsing the PDF document and feeding it to the TTS model so that your PDF will be read aloud by the voice you selected. This may take a while so be patient, but you can track its progress with the percentage progress bar. After that you can simply play the audio to hear your PDF read aloud to you. You can pause, move pages, and even change the speed of the voice. 

In addition to the audio playback, you can initiate a chat with a Voice Agent to ask the application questions about the PDF. Simply press "Create Agent" to start the process the "Speak" to actually talk. Press "Stop" or "Stop Agent" to close the interaction. 

## Features

- PDF document viewing with smooth page navigation
- Text-to-speech conversion with multiple AI voice options
- Interactive AI assistant for document-related questions
- Real-time page synchronization between text and audio
- Precise text extraction and audio synthesis
- Optimized performance with page caching and preloading
- Adjustable playback speed controls

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


### Installation

Deployed on Replit @https://playai-book-reader-ronitjain5.replit.app/ 

or can be installed locally 

1. Clone the repository:
\`\`\`bash
git clone https://github.com/jronit/playai-book-reader.git
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

