/**
 * App.jsx — Root application component
 * Manages global state: which document is active
 */

import React, { useState } from 'react';
import UploadPanel from './components/UploadPanel';
import ChatInterface from './components/ChatInterface';
import './styles/global.css';
import './styles/App.css';

export default function App() {
  const [activeDocument, setActiveDocument] = useState(null);

  return (
    <div className="app">
      {/* Background decorative elements */}
      <div className="bg-orb bg-orb--1" />
      <div className="bg-orb bg-orb--2" />

      {/* Header */}
      <header className="app-header">
        <div className="app-header__logo">
          <div className="app-header__logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <span className="app-header__wordmark">RetailMind</span>
        </div>
        <div className="app-header__tagline">Document Intelligence</div>
        {activeDocument && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setActiveDocument(null)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            New Session
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="app-main">
        {!activeDocument ? (
          <div className="landing">
            <div className="landing__hero">
              <h1 className="landing__title">
                Ask anything about<br />
                <em>your retail documents</em>
              </h1>
              <p className="landing__description">
                Upload a PDF — product catalogues, sales reports, inventory sheets,
                policy documents — and get instant, accurate answers powered by AI.
              </p>
            </div>
            <div className="landing__upload">
              <UploadPanel onDocumentReady={setActiveDocument} />
            </div>
            <div className="landing__features">
              {[
                { icon: '⚡', label: 'Instant answers', desc: 'No manual searching' },
                { icon: '🔍', label: 'Source citations', desc: 'See exactly where answers come from' },
                { icon: '🔒', label: 'Local processing', desc: 'Documents stay on your server' },
              ].map((f) => (
                <div key={f.label} className="feature-card">
                  <span className="feature-card__icon">{f.icon}</span>
                  <p className="feature-card__label">{f.label}</p>
                  <p className="feature-card__desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="workspace">
            <div className="workspace__sidebar">
              <UploadPanel onDocumentReady={setActiveDocument} />
            </div>
            <div className="workspace__chat">
              <ChatInterface document={activeDocument} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
