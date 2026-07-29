import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCw, RefreshCw, Trophy } from 'lucide-react';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onToggleMastered: (id: string) => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards, onToggleMastered }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'needs-review'>('all');

  // Filter flashcards based on mode
  const activeCards = flashcards.filter(card => {
    if (filterMode === 'needs-review') {
      return !card.mastered;
    }
    return true;
  });

  // Keyboard navigation shortcuts (Left/Right arrows, Space for flip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (activeCards.length > 0) {
          setIsFlipped(false);
          setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % activeCards.length);
          }, 150);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (activeCards.length > 0) {
          setIsFlipped(false);
          setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + activeCards.length) % activeCards.length);
          }, 150);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCards.length]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
    }, 150);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkMastered = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMastered(id);
    
    // If we're filtering, and the card becomes mastered, it will vanish from activeCards.
    // Let's adjust the index so we don't go out of bounds.
    if (filterMode === 'needs-review' && activeCards.length > 1) {
      if (currentIndex === activeCards.length - 1) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleResetReview = () => {
    // Un-master all cards to start over
    flashcards.forEach(c => {
      if (c.mastered) onToggleMastered(c.id);
    });
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const totalMastered = flashcards.filter(c => c.mastered).length;
  const percentMastered = flashcards.length > 0 ? Math.round((totalMastered / flashcards.length) * 100) : 0;

  // Render complete state if review mode is empty
  if (activeCards.length === 0) {
    return (
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
        gap: '1.5rem',
        borderRadius: 'var(--border-radius-lg)',
        border: '2px dashed var(--color-border)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-success-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-success)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <Trophy size={40} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Splendid Work! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
            {filterMode === 'needs-review' 
              ? 'You have successfully mastered all review cards!' 
              : 'You have mastered this entire set of flashcards!'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {filterMode === 'needs-review' && (
            <button className="btn-secondary" onClick={() => setFilterMode('all')}>
              View All Cards
            </button>
          )}
          <button className="btn-primary" onClick={handleResetReview}>
            <RefreshCw size={16} />
            <span>Study Deck Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Ensure current index is within bounds of activeCards
  const safeIndex = currentIndex >= activeCards.length ? 0 : currentIndex;
  const currentCard = activeCards[safeIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filtering Header & Progress Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => { setFilterMode('all'); setCurrentIndex(0); setIsFlipped(false); }}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterMode === 'all' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              backgroundColor: filterMode === 'all' ? 'var(--color-accent)' : 'var(--bg-card)',
              color: filterMode === 'all' ? '#ffffff' : 'var(--text-main)',
              boxShadow: filterMode === 'all' ? '0 2px 4px rgba(var(--color-accent-rgb), 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            All Cards ({flashcards.length})
          </button>
          <button
            onClick={() => { setFilterMode('needs-review'); setCurrentIndex(0); setIsFlipped(false); }}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterMode === 'needs-review' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              backgroundColor: filterMode === 'needs-review' ? 'var(--color-accent)' : 'var(--bg-card)',
              color: filterMode === 'needs-review' ? '#ffffff' : 'var(--text-main)',
              boxShadow: filterMode === 'needs-review' ? '0 2px 4px rgba(var(--color-accent-rgb), 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Review Pile ({flashcards.filter(c => !c.mastered).length})
          </button>
        </div>

        {/* Circular Progress Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Mastery:</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid rgba(13, 148, 136, 0.2)',
            padding: '0.25rem 0.65rem',
            borderRadius: '12px',
            fontWeight: 700,
            color: 'var(--color-success)'
          }}>
            {percentMastered}%
          </div>
        </div>
      </div>

      {/* 3D Flashcard Deck Container */}
      <div className="flashcard-perspective" onClick={handleFlip}>
        <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
          
          {/* Card Front */}
          <div className="flashcard-front">
            <span style={{
              position: 'absolute',
              top: '1rem',
              left: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Front
            </span>

            {/* Check/X badges if mastered */}
            {currentCard.mastered && (
              <span style={{
                position: 'absolute',
                top: '1rem',
                right: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-success)',
                backgroundColor: 'var(--color-success-bg)',
                padding: '0.25rem 0.5rem',
                borderRadius: '8px'
              }}>
                <CheckCircle size={12} />
                Mastered
              </span>
            )}

            <h3 style={{
              fontSize: '1.6rem',
              color: 'var(--text-main)',
              lineHeight: 1.4,
              maxWidth: '90%',
              margin: 'auto'
            }}>
              {currentCard.front}
            </h3>

            <div style={{
              position: 'absolute',
              bottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--color-accent)',
              fontWeight: 600
            }}>
              <RotateCw size={14} />
              <span>Click Card to Flip</span>
            </div>
          </div>

          {/* Card Back */}
          <div className="flashcard-back">
            <span style={{
              position: 'absolute',
              top: '1rem',
              left: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Definition & Context
            </span>

            <p style={{
              fontSize: '1.15rem',
              color: 'var(--text-main)',
              lineHeight: 1.6,
              maxWidth: '90%',
              margin: 'auto',
              whiteSpace: 'pre-line'
            }}>
              {currentCard.back}
            </p>

            <div style={{
              position: 'absolute',
              bottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}>
              <RotateCw size={14} />
              <span>Click to Flip Back</span>
            </div>
          </div>

        </div>
      </div>

      {/* Flashcard Controller Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Prev Button */}
        <button
          className="btn-secondary"
          onClick={handlePrev}
          style={{ padding: '0.6rem 1rem' }}
          title="Previous Card"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Pass/Fail Controllers */}
        <div style={{ display: 'flex', justifySelf: 'center', gap: '0.75rem' }}>
          <button
            onClick={(e) => handleMarkMastered(currentCard.id, e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              border: `2px solid ${currentCard.mastered ? 'var(--color-success)' : 'var(--color-border)'}`,
              backgroundColor: currentCard.mastered ? 'var(--color-success-bg)' : 'var(--bg-card)',
              color: currentCard.mastered ? 'var(--color-success)' : 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle size={16} />
            <span>{currentCard.mastered ? 'Mastered!' : 'Mastered'}</span>
          </button>

          {!currentCard.mastered && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--border-radius-md)',
                border: '2px solid var(--color-border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              <XCircle size={16} />
              <span>Needs Review</span>
            </button>
          )}
        </div>

        {/* Next Button */}
        <button
          className="btn-secondary"
          onClick={handleNext}
          style={{ padding: '0.6rem 1rem', justifySelf: 'end' }}
          title="Next Card"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress Stats Tracker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Card {safeIndex + 1} of {activeCards.length}</span>
          <span>{filterMode === 'needs-review' ? 'Review Deck' : 'Full Deck'}</span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'var(--color-border)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((safeIndex + 1) / activeCards.length) * 100}%`,
            height: '100%',
            backgroundColor: 'var(--color-accent)',
            transition: 'width 0.2s ease-out'
          }} />
        </div>
      </div>

    </div>
  );
};
