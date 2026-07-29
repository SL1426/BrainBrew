import React, { useState, useEffect, useRef } from 'react';
import { StudySession, Flashcard, QuizQuestion } from './types';
import { FlashcardDeck } from './components/FlashcardDeck';
import { QuizView } from './components/QuizView';
import { ErrorState } from './components/ErrorState';
import { 
  Brain, 
  Trash2, 
  BookOpen, 
  HelpCircle, 
  History, 
  PlusCircle, 
  Clock,
  Paperclip,
  Send,
  X,
  FileDown,
  Image as ImageIcon
} from 'lucide-react';

const LOADING_TIPS = [
  '🧠 Reading notes & indexing concepts...',
  '☕ Brewing study flashcards...',
  '⚡ Connecting semantic synapses...',
  '📚 Extracting core concepts...',
  '🧐 Drafting challenging quiz items...',
  '🔑 Structuring conceptual explanations...',
  '🚀 Launching your personalized study deck...'
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [generateType, setGenerateType] = useState<'flashcards' | 'quiz' | 'both'>('both');
  const [attachments, setAttachments] = useState<{ name: string; type: string; base64: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0]);
  const [error, setError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | undefined>(undefined);

  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('bb-sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz'>('flashcards');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const tipIntervalRef = useRef<number | null>(null);

  // Sync sessions to localStorage
  useEffect(() => {
    localStorage.setItem('bb-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Cycle tips during loading
  useEffect(() => {
    if (isLoading) {
      let index = 0;
      tipIntervalRef.current = window.setInterval(() => {
        index = (index + 1) % LOADING_TIPS.length;
        setLoadingTip(LOADING_TIPS[index]);
      }, 2500);
    } else {
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
      }
    }

    return () => {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    };
  }, [isLoading]);

  // File Upload base64 convertor
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    files.forEach(file => {
      // 100MB limit check
      if (file.size > 100 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Please upload files smaller than 100MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64Data = (event.target.result as string).split(',')[1];
          setAttachments(prev => [
            ...prev,
            { name: file.name, type: file.type, base64: base64Data }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // API Call logic
  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string, customAttachments?: typeof attachments) => {
    if (e) e.preventDefault();
    
    const promptText = customPrompt !== undefined ? customPrompt : prompt;
    const activeAttachments = customAttachments !== undefined ? customAttachments : attachments;

    if (!promptText.trim() && activeAttachments.length === 0) return;

    // Abort active request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError(null);
    setRawOutput(undefined);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          type: generateType,
          attachments: activeAttachments
        }),
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP error! status: ${response.status}`);
      }

      if (controller.signal.aborted) return;

      // Map unique IDs to generated items
      const flashcards: Flashcard[] = (data.flashcards || []).map((card: Omit<Flashcard, 'id'>, index: number) => ({
        ...card,
        id: `fc-${Date.now()}-${index}`,
        mastered: false
      }));

      const quiz: QuizQuestion[] = (data.quiz || []).map((question: Omit<QuizQuestion, 'id'>, index: number) => ({
        ...question,
        id: `q-${Date.now()}-${index}`
      }));

      if (flashcards.length === 0 && quiz.length === 0) {
        throw new Error('The AI generated an empty response without flashcards or quizzes.');
      }

      // Create new session
      let title = promptText;
      if (!title.trim() && activeAttachments.length > 0) {
        title = `Uploaded notes (${activeAttachments[0].name})`;
      }
      const finalTitle = title.length > 25 ? `${title.slice(0, 25)}...` : title;

      const newSession: StudySession = {
        id: `session-${Date.now()}`,
        title: finalTitle,
        prompt: promptText || `Analyzing ${activeAttachments.length} file(s)`,
        flashcards,
        quiz,
        type: generateType,
        createdAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      
      if (generateType === 'quiz' && quiz.length > 0) {
        setActiveTab('quiz');
      } else {
        setActiveTab('flashcards');
      }

      // Clear Inputs
      setPrompt('');
      setAttachments([]);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError(err.message || 'An error occurred during material generation.');
      if (err.rawOutput) {
        setRawOutput(err.rawOutput);
      }
      setActiveSessionId(null);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleToggleMastered = (cardId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          flashcards: s.flashcards.map(fc => 
            fc.id === cardId ? { ...fc, mastered: !fc.mastered } : fc
          )
        };
      }
      return s;
    }));
  };

  const handleUpdateQuizQuestions = (updatedQuestions: QuizQuestion[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          quiz: updatedQuestions
        };
      }
      return s;
    }));
  };

  const handleLoadFallback = (flashcards: Flashcard[], quiz: QuizQuestion[], topic: string) => {
    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      title: topic,
      prompt: `Mock offline study set on ${topic}`,
      flashcards,
      quiz,
      createdAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveTab(flashcards.length > 0 ? 'flashcards' : 'quiz');
    setError(null);
  };

  const handleSampleTopic = (topic: string, type: 'flashcards' | 'quiz' | 'both') => {
    setPrompt(topic);
    setGenerateType(type);
    handleGenerate(undefined, topic, []);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="app-container">
      
      {/* 1. CLAUDE-STYLE SIDEBAR */}
      <aside className="sidebar">
        
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.5rem' }}>
          <div style={{
            background: 'var(--logo-gradient)',
            color: 'var(--button-text)',
            padding: '0.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Brain size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              BrainBrew
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
              AI Study Assistant
            </p>
          </div>
        </div>

        {/* New Session Button */}
        <button
          onClick={() => { setActiveSessionId(null); setError(null); setPrompt(''); setAttachments([]); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#334155';
            e.currentTarget.style.borderColor = '#475569';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
            e.currentTarget.style.borderColor = '#334155';
          }}
        >
          <PlusCircle size={16} />
          <span>New Study Deck</span>
        </button>

        <hr style={{ border: 'none', borderBottom: '1px solid #334155' }} />

        {/* Saved Study Decks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <History size={14} />
            <span>Study History</span>
          </div>

          {sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              border: '1px dashed #334155',
              borderRadius: 'var(--border-radius-md)',
              color: '#94a3b8',
              fontSize: '0.75rem',
              lineHeight: 1.4
            }}>
              Your completed decks will be saved here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const hasFlashcards = s.flashcards && s.flashcards.length > 0;
                const hasQuiz = s.quiz && s.quiz.length > 0;
                const sessionType = s.type || (hasFlashcards && hasQuiz ? 'both' : hasFlashcards ? 'flashcards' : 'quiz');

                let badgeText = 'Both';
                let badgeStyle: React.CSSProperties = {
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  lineHeight: 1
                };

                if (sessionType === 'flashcards') {
                  badgeText = 'Flashcards Only';
                  badgeStyle.backgroundColor = 'rgba(192, 132, 252, 0.15)';
                  badgeStyle.color = '#c084fc';
                  badgeStyle.border = '1px solid rgba(192, 132, 252, 0.3)';
                } else if (sessionType === 'quiz') {
                  badgeText = 'Quiz Only';
                  badgeStyle.backgroundColor = 'rgba(251, 146, 60, 0.15)';
                  badgeStyle.color = '#fb923c';
                  badgeStyle.border = '1px solid rgba(251, 146, 60, 0.3)';
                }

                return (
                  <div
                    key={s.id}
                    onClick={() => { setActiveSessionId(s.id); setError(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: isActive ? '#334155' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontWeight: isActive ? 600 : 500
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', width: '80%' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={10} /> {s.createdAt}
                        </span>
                        <span style={badgeStyle}>{badgeText}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: '4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      title="Delete deck"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </aside>

      {/* 2. CHAT / WORKSPACE MAIN CONTENT */}
      <main className="main-content">
        
        {/* Full-width scroll container so scrollbar is at the screen edge */}
        <div className="workspace-wrapper">
          {/* Scrollable middle workspace content */}
          <div className="workspace-scrollable">
          {isLoading ? (
            /* LOADING SCREEN */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              gap: '1.5rem',
              textAlign: 'center',
              minHeight: '60vh'
            }}>
              <div className="spinner" />
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>Brewing Study Deck</h2>
                <p style={{ color: 'var(--color-accent)', fontWeight: 600, animation: 'fadeIn 0.5s ease-out' }}>
                  {loadingTip}
                </p>
              </div>
            </div>
          ) : error ? (
            /* ERROR BOUNDARY */
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <ErrorState 
                error={error} 
                rawOutput={rawOutput} 
                onRetry={() => handleGenerate()} 
                onLoadFallback={handleLoadFallback} 
              />
            </div>
          ) : activeSession ? (
            /* ACTIVE DECK WORKSPACE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out', flexGrow: 1 }}>
              
              {/* Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                    <Brain size={14} />
                    <span>Topic File</span>
                  </div>
                  <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', fontWeight: 800 }}>
                    {activeSession.title}
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '500px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={activeSession.prompt}>
                    Source: "{activeSession.prompt}"
                  </p>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() => { setActiveSessionId(null); setError(null); }}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <PlusCircle size={14} />
                  <span>Create New</span>
                </button>
              </div>

              {/* Tab Toggle Bar */}
              <div style={{
                display: 'flex',
                borderBottom: '2px solid var(--color-border)',
                gap: '1.5rem'
              }}>
                {activeSession.flashcards.length > 0 && (
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    style={{
                      padding: '0.6rem 0.25rem',
                      border: 'none',
                      background: 'none',
                      borderBottom: `3px solid ${activeTab === 'flashcards' ? 'var(--color-accent)' : 'transparent'}`,
                      color: activeTab === 'flashcards' ? 'var(--color-accent)' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      marginBottom: '-2px'
                    }}
                  >
                    <BookOpen size={16} />
                    <span>Flashcards</span>
                    <span style={{
                      fontSize: '0.7rem',
                      backgroundColor: activeTab === 'flashcards' ? 'var(--color-accent)' : 'var(--color-border)',
                      color: activeTab === 'flashcards' ? 'var(--button-text)' : 'var(--text-muted)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px'
                    }}>
                      {activeSession.flashcards.length}
                    </span>
                  </button>
                )}

                {activeSession.quiz.length > 0 && (
                  <button
                    onClick={() => setActiveTab('quiz')}
                    style={{
                      padding: '0.6rem 0.25rem',
                      border: 'none',
                      background: 'none',
                      borderBottom: `3px solid ${activeTab === 'quiz' ? 'var(--color-accent)' : 'transparent'}`,
                      color: activeTab === 'quiz' ? 'var(--color-accent)' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      marginBottom: '-2px'
                    }}
                  >
                    <HelpCircle size={16} />
                    <span>Practice Quiz</span>
                    <span style={{
                      fontSize: '0.7rem',
                      backgroundColor: activeTab === 'quiz' ? 'var(--color-accent)' : 'var(--color-border)',
                      color: activeTab === 'quiz' ? 'var(--button-text)' : 'var(--text-muted)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px'
                    }}>
                      {activeSession.quiz.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Deck/Quiz display */}
              <div style={{ flexGrow: 1, minHeight: '350px' }}>
                {activeTab === 'flashcards' ? (
                  <FlashcardDeck
                    flashcards={activeSession.flashcards}
                    onToggleMastered={handleToggleMastered}
                  />
                ) : (
                  <QuizView
                    questions={activeSession.quiz}
                    onUpdateQuestions={handleUpdateQuizQuestions}
                  />
                )}
              </div>

            </div>
          ) : (
            /* IDLE DASHBOARD (Student Hero Banner) */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              gap: '2.5rem',
              textAlign: 'center',
              animation: 'fadeIn 0.35s ease-out',
              minHeight: '60vh'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  background: 'var(--logo-gradient)',
                  color: 'var(--button-text)',
                  padding: '1.1rem',
                  borderRadius: '24px',
                  boxShadow: '0 12px 30px rgba(99, 102, 241, 0.35)',
                  display: 'inline-flex'
                }}>
                  <Brain size={48} />
                </div>
                <h1 style={{
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  marginTop: '0.5rem',
                  background: 'linear-gradient(135deg, #0f172a 0%, #4338ca 50%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Master Any Subject 10x Faster 🚀
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '540px', lineHeight: 1.6 }}>
                  Paste study notes, write a topic, or upload PDF files & screenshots. BrainBrew constructs interactive 3D flashcards and practice quizzes instantly.
                </p>
              </div>

              {/* Sample starter blocks */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '0.85rem',
                width: '100%',
                maxWidth: '700px'
              }}>
                <button
                  onClick={() => handleSampleTopic('Computer Organization & 8086 Microprocessor', 'both')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>💻 Computer Architecture</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>8086 microprocessor, registers & ISA</span>
                </button>

                <button
                  onClick={() => handleSampleTopic('Leaves Calvin Cycle Steps', 'both')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>🍃 Photosynthesis Cycle</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Carbon fixation & Calvin cycle steps</span>
                </button>

                <button
                  onClick={() => handleSampleTopic('JavaScript Closures & Lexical Scope', 'both')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>⚡ JS Lexical Closures</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Memory closures & inner function scope</span>
                </button>
                <button
                  onClick={() => handleSampleTopic('Causes of World War I', 'both')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>🌍 Causes of WWI</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Alliance systems & imperialism trigger</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* 3. SLEEK CHAT INPUT BOX FLOATING AT BOTTOM */}
        {!activeSession && !isLoading && (
          <div className="chat-input-wrapper">
            
            {/* File Previews block */}
            {attachments.length > 0 && (
              <div className="file-preview-container">
                {attachments.map((att, idx) => (
                  <div key={idx} className="file-preview-pill">
                    {att.type === 'application/pdf' ? (
                      <FileDown size={14} style={{ color: 'var(--color-accent)' }} />
                    ) : (
                      <ImageIcon size={14} style={{ color: 'var(--color-accent)' }} />
                    )}
                    <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </span>
                    <button className="file-preview-remove" onClick={() => removeAttachment(idx)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Prompt Box container */}
            <form onSubmit={handleGenerate} className="chat-prompt-box">
              
              {/* Textarea */}
              <textarea
                placeholder="Ask AI to make cards or quizzes... Paste syllabus details, or write a topic. Click paperclip to upload notes (PDFs or screenshots)."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="chat-prompt-textarea"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim() || attachments.length > 0) {
                      handleGenerate();
                    }
                  }
                }}
              />

              {/* Action Toolbar */}
              <div className="chat-prompt-bar">
                
                {/* Left side actions (clip uploads & type selectors) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  
                  {/* File Upload Clip */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s, color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = 'var(--color-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    title="Upload study materials (PDF or Screenshot)"
                  >
                    <Paperclip size={18} />
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf, image/*"
                    multiple
                    style={{ display: 'none' }}
                  />

                  {/* Divider line */}
                  <div style={{ height: '18px', width: '1.5px', backgroundColor: 'var(--color-border)' }} />

                  {/* Output Choice Select box */}
                  <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#f1f5f9', padding: '0.15rem', borderRadius: '8px' }}>
                    {(['both', 'flashcards', 'quiz'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGenerateType(t)}
                        style={{
                          border: 'none',
                          backgroundColor: generateType === t ? '#ffffff' : 'transparent',
                          color: generateType === t ? 'var(--color-accent)' : 'var(--text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: generateType === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {t === 'both' ? 'Both' : t === 'flashcards' ? 'Cards' : 'Quiz'}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Right side: Send Arrow button */}
                <button
                  type="submit"
                  disabled={!prompt.trim() && attachments.length === 0}
                  className="btn-primary"
                  style={{
                    borderRadius: '50%',
                    padding: '0.5rem',
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none'
                  }}
                >
                  <Send size={16} />
                </button>

              </div>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}
