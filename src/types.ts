export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  selectedAnswer?: number;
  isCorrect?: boolean;
}

export interface StudySession {
  id: string;
  title: string;
  prompt: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  createdAt: string;
  type?: 'flashcards' | 'quiz' | 'both';
}

export type ThemeType = 'bubblegum' | 'cyberpunk' | 'library' | 'ocean';
