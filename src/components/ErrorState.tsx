import React, { useState } from 'react';
import { AlertCircle, RefreshCw, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Flashcard, QuizQuestion } from '../types';

interface ErrorStateProps {
  error: string;
  rawOutput?: string;
  onRetry: () => void;
  onLoadFallback: (flashcards: Flashcard[], quiz: QuizQuestion[], topic: string) => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, rawOutput, onRetry, onLoadFallback }) => {
  const [showRaw, setShowRaw] = useState(false);

  // High quality offline fallback deck
  const loadMockData = () => {
    const mockFlashcards: Flashcard[] = [
      {
        id: 'fc-1',
        front: 'JavaScript Promises',
        back: 'An object representing the eventual completion or failure of an asynchronous operation. It can be in one of three states: pending, fulfilled, or rejected.',
        mastered: false
      },
      {
        id: 'fc-2',
        front: 'Closure',
        back: 'The combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). Closures allow inner functions to access outer function scopes.',
        mastered: false
      },
      {
        id: 'fc-3',
        front: 'Virtual DOM',
        back: 'A programming concept where a virtual representation of the UI is kept in memory and synced with the "real" DOM by a library such as ReactDOM (a process called reconciliation).',
        mastered: false
      },
      {
        id: 'fc-4',
        front: 'HTTP Status 404',
        back: 'The server cannot find the requested resource. In the browser, this means the URL is not recognized or the path is incorrect.',
        mastered: false
      },
      {
        id: 'fc-5',
        front: 'CSS Flexbox vs Grid',
        back: 'Flexbox is designed for one-dimensional layouts (row OR column), whereas CSS Grid is designed for two-dimensional layouts (rows AND columns simultaneously).',
        mastered: false
      }
    ];

    const mockQuiz: QuizQuestion[] = [
      {
        id: 'q-1',
        question: 'Which of the following describes a "pure function" in programming?',
        options: [
          'A function that modifies variables outside its scope.',
          'A function that always returns the same output for the same input and has no side effects.',
          'A function that uses random variables to compute its output.',
          'A function that does not return any value.'
        ],
        answerIndex: 1,
        explanation: 'Pure functions are predictable: they do not modify global state (no side effects) and their return value depends solely on the arguments passed in.'
      },
      {
        id: 'q-2',
        question: 'What is the correct order of the React Component Lifecycle phases?',
        options: [
          'Updating, Mounting, Unmounting',
          'Mounting, Updating, Unmounting',
          'Unmounting, Mounting, Updating',
          'Creation, Destructuring, Rendering'
        ],
        answerIndex: 1,
        explanation: 'Components first mount (created and inserted into the DOM), then update (re-render due to changes in state or props), and finally unmount (removed from the DOM).'
      },
      {
        id: 'q-3',
        question: 'What does the term "Hoisting" refer to in JavaScript?',
        options: [
          'Moving heavy server loads to the client side.',
          'The browser raising a syntax error during compilation.',
          'The default behavior of moving variable and function declarations to the top of their containing scope before code execution.',
          'Injecting external HTML elements into the DOM.'
        ],
        answerIndex: 2,
        explanation: 'In JS, declarations of variables (using var) and functions are hoisted, meaning they can be referenced before they are declared in the source code.'
      }
    ];

    onLoadFallback(mockFlashcards, mockQuiz, 'Web Development Basics');
  };

  return (
    <div className="card" style={{
      border: '2px solid var(--color-error)',
      backgroundColor: 'var(--bg-card)',
      padding: '2.5rem 2rem',
      borderRadius: 'var(--border-radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '650px',
      margin: '2rem auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{
          padding: '0.75rem',
          borderRadius: '50%',
          backgroundColor: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <AlertCircle size={32} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 700 }}>
            Whoops! Something went wrong
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            We encountered an issue while communicating with the AI model or parsing the response.
          </p>
        </div>
      </div>

      {/* Error Message Box */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--border-radius-md)',
        backgroundColor: 'var(--color-error-bg)',
        borderLeft: '4px solid var(--color-error)',
        fontSize: '0.9rem',
        color: 'var(--text-main)',
        fontWeight: 500,
        lineHeight: 1.5
      }}>
        {error}
      </div>

      {/* Raw output review dropdown (useful for debugging bad JSON) */}
      {rawOutput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setShowRaw(!showRaw)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: 0
            }}
          >
            <span>{showRaw ? 'Hide raw AI response' : 'Show raw AI response'}</span>
            {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showRaw && (
            <pre style={{
              padding: '1rem',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              overflowX: 'auto',
              maxHeight: '150px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}>
              {rawOutput}
            </pre>
          )}
        </div>
      )}

      {/* Action Area */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginTop: '0.5rem'
      }}>
        <button className="btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          <span>Retry Generation</span>
        </button>

        <button className="btn-secondary" onClick={loadMockData}>
          <BookOpen size={16} />
          <span>Practice Offline (Mock Study Set)</span>
        </button>
      </div>
    </div>
  );
};
