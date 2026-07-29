import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizViewProps {
  questions: QuizQuestion[];
  onUpdateQuestions: (updatedQuestions: QuizQuestion[]) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ questions, onUpdateQuestions }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWrongOnlyMode, setIsWrongOnlyMode] = useState(false);

  // Derive a unique key for the question set ID list
  const questionIdsKey = questions.map(q => q.id).join(',');

  // Initialize or reset quiz questions when a NEW set of questions is loaded
  useEffect(() => {
    setQuizQuestions(questions.map(q => ({ ...q })));
    setCurrentIdx(0);
    setIsCompleted(false);
    setIsWrongOnlyMode(false);
  }, [questionIdsKey]);

  const handleSelectOption = (optionIndex: number) => {
    if (quizQuestions[currentIdx].selectedAnswer !== undefined) return; // Answer already selected

    const updated = [...quizQuestions];
    updated[currentIdx].selectedAnswer = optionIndex;
    updated[currentIdx].isCorrect = optionIndex === updated[currentIdx].answerIndex;
    setQuizQuestions(updated);

    // Call parent handler to persist progress
    // Find the original index of this question in the props array and update it
    const updatedParentQuestions = questions.map(q => {
      if (q.id === updated[currentIdx].id) {
        return { ...updated[currentIdx] };
      }
      return q;
    });
    onUpdateQuestions(updatedParentQuestions);
  };

  const handleNext = () => {
    if (currentIdx < quizQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsCompleted(true);
      
      // Calculate score and fire confetti if they got a high score
      const correctCount = quizQuestions.filter(q => q.isCorrect).length;
      const scorePct = (correctCount / quizQuestions.length) * 100;
      if (scorePct >= 70) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']
        });
      }
    }
  };

  const handleRestartFull = () => {
    const resetQuestions = questions.map(q => ({
      ...q,
      selectedAnswer: undefined,
      isCorrect: undefined
    }));
    onUpdateQuestions(resetQuestions);
    setQuizQuestions(resetQuestions);
    setCurrentIdx(0);
    setIsCompleted(false);
    setIsWrongOnlyMode(false);
  };

  const handleRetestWrong = () => {
    // Filter to only questions the user got wrong
    const wrongQuestions = quizQuestions
      .filter(q => q.selectedAnswer === undefined || !q.isCorrect)
      .map(q => ({
        ...q,
        selectedAnswer: undefined,
        isCorrect: undefined
      }));

    if (wrongQuestions.length === 0) return;

    setQuizQuestions(wrongQuestions);
    setCurrentIdx(0);
    setIsCompleted(false);
    setIsWrongOnlyMode(true);
  };

  if (quizQuestions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>No quiz questions available for this topic.</p>
      </div>
    );
  }

  // Quiz Completion Screen
  if (isCompleted) {
    const correctCount = quizQuestions.filter(q => q.isCorrect).length;
    const totalCount = quizQuestions.length;
    const scorePct = Math.round((correctCount / totalCount) * 100);
    const wrongQuestions = quizQuestions.filter(q => !q.isCorrect);

    return (
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)'
      }}>
        {/* Score Header */}
        <div style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: scorePct >= 70 ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: scorePct >= 70 ? 'var(--color-success)' : 'var(--color-error)',
            fontSize: '2rem',
            fontWeight: 800,
            boxShadow: 'var(--shadow-md)'
          }}>
            {scorePct}%
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>
              {scorePct === 100 
                ? 'Perfect Score! 🌟' 
                : scorePct >= 70 
                ? 'Great Job! 🎉' 
                : 'Keep practicing! 💪'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              You answered <strong>{correctCount}</strong> out of <strong>{totalCount}</strong> questions correctly.
            </p>
          </div>
        </div>

        {/* Incorrect answers review list */}
        {wrongQuestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} />
              <span>Questions to Review ({wrongQuestions.length})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {wrongQuestions.map((q, idx) => (
                <div key={q.id} style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 'var(--border-radius-md)',
                  borderLeft: '4px solid var(--color-error)',
                  fontSize: '0.9rem'
                }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {idx + 1}. {q.question}
                  </p>
                  <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    ❌ Your answer: {q.selectedAnswer !== undefined ? q.options[q.selectedAnswer] : 'Skipped'}
                  </p>
                  <p style={{ color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✅ Correct answer: {q.options[q.answerIndex]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginTop: '1rem',
          justifyContent: 'center'
        }}>
          <button className="btn-secondary" onClick={handleRestartFull}>
            <RotateCcw size={16} />
            <span>Restart Entire Quiz</span>
          </button>
          
          {wrongQuestions.length > 0 && (
            <button className="btn-primary" onClick={handleRetestWrong}>
              <Sparkles size={16} />
              <span>Re-test Wrong Answers ({wrongQuestions.length})</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentIdx];
  const hasAnswered = currentQuestion.selectedAnswer !== undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Quiz Progress Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <HelpCircle size={16} />
          <span>Question {currentIdx + 1} of {quizQuestions.length}</span>
        </div>
        {isWrongOnlyMode && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-error)',
            backgroundColor: 'var(--color-error-bg)',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px'
          }}>
            Review Mode (Wrong Answers)
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--color-border)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${((currentIdx) / quizQuestions.length) * 100}%`,
          height: '100%',
          backgroundColor: 'var(--color-accent)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Question Card */}
      <div className="card" style={{
        padding: '2rem',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          lineHeight: 1.4
        }}>
          {currentQuestion.question}
        </h2>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = currentQuestion.selectedAnswer === idx;
            const isCorrectAnswer = currentQuestion.answerIndex === idx;
            const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
            
            // Set styles based on status
            let btnStyle: React.CSSProperties = {
              padding: '1rem 1.25rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1.5px solid var(--color-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontWeight: 500,
              textAlign: 'left',
              cursor: hasAnswered ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              width: '100%',
              boxShadow: 'var(--shadow-sm)'
            };

            if (hasAnswered) {
              if (isCorrectAnswer) {
                btnStyle.borderColor = 'var(--color-success)';
                btnStyle.backgroundColor = 'var(--color-success-bg)';
                btnStyle.color = 'var(--color-success)';
                btnStyle.fontWeight = 700;
              } else if (isSelected) {
                btnStyle.borderColor = 'var(--color-error)';
                btnStyle.backgroundColor = 'var(--color-error-bg)';
                btnStyle.color = 'var(--color-error)';
                btnStyle.fontWeight = 700;
              } else {
                btnStyle.opacity = 0.55;
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={hasAnswered}
                style={btnStyle}
                onMouseEnter={(e) => {
                  if (!hasAnswered) {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.03)';
                    e.currentTarget.style.transform = 'translateX(3px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasAnswered) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    backgroundColor: (hasAnswered && isCorrectAnswer) 
                      ? 'var(--color-success)' 
                      : (hasAnswered && isSelected) 
                      ? 'var(--color-error)' 
                      : '#f1f5f9',
                    color: (hasAnswered && (isCorrectAnswer || isSelected)) ? '#ffffff' : 'var(--text-main)',
                    flexShrink: 0
                  }}>
                    {optionLetters[idx] || idx + 1}
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>{option}</span>
                </div>
                {hasAnswered && isCorrectAnswer && <CheckCircle2 size={18} style={{ flexShrink: 0, color: 'var(--color-success)' }} />}
                {hasAnswered && isSelected && !isCorrectAnswer && <XCircle size={18} style={{ flexShrink: 0, color: 'var(--color-error)' }} />}
              </button>
            );
          })}
        </div>

        {/* Immediate Feedback Explanation Block */}
        {hasAnswered && (
          <div style={{
            padding: '1.25rem',
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: currentQuestion.isCorrect ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            borderLeft: `4px solid ${currentQuestion.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
            marginTop: '0.5rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: currentQuestion.isCorrect ? 'var(--color-success)' : 'var(--color-error)',
              marginBottom: '0.25rem'
            }}>
              <span>{currentQuestion.isCorrect ? 'Correct!' : 'Incorrect'}</span>
            </div>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: 'var(--text-main)'
            }}>
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Controller */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={!hasAnswered}
          style={{ minWidth: '120px' }}
        >
          <span>{currentIdx === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
        </button>
      </div>

    </div>
  );
};
