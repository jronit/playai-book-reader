export interface Voice {
  name: string;
  accent: string;
  language: string;
  languageCode: string;
  value: string;
  sample: string;
  gender: string;
  style: string;
}

export interface BookReaderState {
  currentPage: number;
  totalPages: number;
  isPlaying: boolean;
  selectedVoice: Voice | null;
  pdfUrl: string | null;
  playbackSpeed: number;
} 