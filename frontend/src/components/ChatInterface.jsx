/**
 * ChatInterface.jsx — Main chat UI for document Q&A
 * Displays conversation history and input box
 */

import React, { useState, useRef, useEffect } from 'react';
import { queryDocument } from '../services/api';

// Individual message bubble
function Message({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`message message--${isUser ? 'user' : 'assistant'}`}>
      <div className="message__avatar">
        {isUser ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        )}
      </div>
      <div className="message__body">
        <div className="message__bubble">
          <p className="message__text">{msg.content}</p>
        </div>
        {msg.meta && (
          <div className="message__meta">
            <span>{msg.meta.chunks} chunks searched</span>
            <span>·</span>
            <span>{msg.meta.time}ms</span>
          </div>
        )}
        {msg.sources && msg.sources.length > 0 && (
          <SourceAccordion sources={msg.sources} />
        )}
      </div>
    </div>
  );
}

// Expandable source snippets
function SourceAccordion({ sources }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sources">
      <button className="sources__toggle" onClick={() => setOpen(!open)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        {open ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}
      </button>
      {open && (
        <div className="sources__list">
          {sources.map((s, i) => (
            <div key={i} className="source-item">
              <div className="source-item__header">
                <span className="source-item__label">Page {s.page}</span>
                <span className="source-item__score">score: {s.score}</span>
              </div>
              <p className="source-item__text">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Animated typing indicator
function TypingIndicator() {
  return (
    <div className="message message--assistant">
      <div className="message__avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <div className="message__body">
        <div className="message__bubble message__bubble--typing">
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ document: doc }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Document ready! Ask me anything about "${doc.name}". I'll find the most relevant sections and answer based on the content.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    setInput('');
    setError('');

    // Add user message
    const userMsg = { id: Date.now().toString(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await queryDocument(question, doc.id);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        meta: {
          chunks: result.context_chunks,
          time: result.response_time_ms,
        },
        sources: result.source_snippets || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Suggested questions
  const suggestions = [
    'What are the key retail strategies mentioned?',
    'Summarize the main findings',
    'What are the revenue figures?',
    'List all recommendations',
  ];

  return (
    <div className="chat">
      {/* Chat Header */}
      <div className="chat__header">
        <div className="chat__doc-info">
          <div className="chat__doc-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <p className="chat__doc-name">{doc.name}</p>
            <p className="chat__doc-meta">{doc.chunks} chunks indexed</p>
          </div>
        </div>
        <span className="badge badge--success">Active</span>
      </div>

      {/* Messages */}
      <div className="chat__messages">
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (shown when only welcome message) */}
      {messages.length === 1 && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat__input-area">
        <div className="chat__input-wrapper">
          <textarea
            ref={inputRef}
            className="chat__input"
            placeholder="Ask a question about your document…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={`chat__send-btn ${(!input.trim() || isLoading) ? 'chat__send-btn--disabled' : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            title="Send (Enter)"
          >
            {isLoading ? (
              <span className="spinner spinner--sm" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="chat__input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
