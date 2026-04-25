import React, { useEffect, useRef, useState } from 'react';
import './FloatingChatbot.css';
import { askChatbot } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const HEALTH_URL = `${API_BASE.replace(/\/api\/v1\/?$/, '')}/health`;

const quickPrompts = [
  'What can AI-SHIELD do?',
  'How do I scan a phishing URL?',
  'How does the steganography detector work?',
];

const greeting = {
  id: 'welcome',
  role: 'assistant',
  text: 'Ask me about scans, phishing checks, steganography, or how the platform works.',
};

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([greeting]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [serviceState, setServiceState] = useState('idle');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let mounted = true;
    const checkHealth = async () => {
      setServiceState('checking');
      try {
        const res = await fetch(HEALTH_URL);
        if (!mounted) return;
        setServiceState(res.ok ? 'online' : 'offline');
      } catch {
        if (!mounted) return;
        setServiceState('offline');
      }
    };

    checkHealth();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const normalizeAssistantResponse = (text, askedQuestion) => {
    const raw = (text || '').trim();
    if (!raw) {
      return 'I do not have an answer for that right now.';
    }

    if (raw.toLowerCase().includes('ai brain is currently disconnected')) {
      return `I could not access full retrieval context right now, but I can still help. Try asking a focused question like: "${askedQuestion}".`;
    }

    return raw;
  };

  const submitQuestion = async (questionText) => {
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion || isSending) {
      return;
    }

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: trimmedQuestion }]);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const data = await askChatbot(trimmedQuestion);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: normalizeAssistantResponse(data.response, 'How do I scan a phishing URL?'),
        },
      ]);
    } catch (requestError) {
      setError(requestError.message || 'Chatbot request failed.');
      setServiceState('offline');
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: 'I could not reach the chatbot service. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(input);
  };

  return (
    <div className="floating-chatbot-shell">
      {isOpen && <button type="button" className="chatbot-backdrop" aria-label="Close chatbot" onClick={() => setIsOpen(false)} />}

      {isOpen && (
        <section className="chatbot-panel" aria-label="AI chatbot">
          <header className="chatbot-header">
            <div>
              <div className="chatbot-kicker">AI ASSISTANT</div>
              <h2>Security Copilot</h2>
              <p>Answers from AI-SHIELD backend knowledge plus built-in platform guidance.</p>
              <div className={`chatbot-status ${serviceState}`}>
                {serviceState === 'online' ? 'Backend online' : serviceState === 'offline' ? 'Backend unreachable' : serviceState === 'checking' ? 'Checking backend...' : 'Ready'}
              </div>
            </div>
            <button type="button" className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <span />
              <span />
            </button>
          </header>

          <div className="chatbot-body">
            <div className="chatbot-quick-prompts">
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" className="chatbot-chip" onClick={() => submitQuestion(prompt)} disabled={isSending}>
                  {prompt}
                </button>
              ))}
            </div>

            <div className="chatbot-messages" role="log" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`chatbot-message ${message.role}`}>
                  <span>{message.text}</span>
                </div>
              ))}
              {isSending && (
                <div className="chatbot-message assistant typing">
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about AI-SHIELD..."
              aria-label="Chat question"
            />
            <button type="submit" disabled={isSending || !input.trim()}>
              Send
            </button>
          </form>

          {error ? <div className="chatbot-error">{error}</div> : null}
        </section>
      )}

      <button
        type="button"
        className={`chatbot-launcher ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <span className="chatbot-launcher-orb" />
        <span className="chatbot-launcher-copy">
          <strong>AI</strong>
          <small>Ask Copilot</small>
        </span>
      </button>
    </div>
  );
};

export default FloatingChatbot;