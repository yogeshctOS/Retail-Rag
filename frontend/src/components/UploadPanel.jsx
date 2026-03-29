/**
 * UploadPanel.jsx — PDF upload component with drag-and-drop
 */

import React, { useState, useRef, useCallback } from 'react';
import { uploadDocument } from '../services/api';

export default function UploadPanel({ onDocumentReady }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [docInfo, setDocInfo] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File size must be under 50MB.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
    setUploadState('idle');
    setDocInfo(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadState('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const result = await uploadDocument(selectedFile, setProgress);
      setDocInfo(result.document);
      setUploadState('success');
      onDocumentReady(result.document);
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err.message);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setProgress(0);
    setErrorMsg('');
    setDocInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-panel">
      <div className="upload-panel__header">
        <div className="upload-panel__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div>
          <h2 className="upload-panel__title">Upload Document</h2>
          <p className="upload-panel__subtitle">PDF files up to 50MB</p>
        </div>
      </div>

      {uploadState !== 'success' ? (
        <>
          {/* Drop Zone */}
          <div
            className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${selectedFile ? 'dropzone--filled' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!selectedFile ? (
              <div className="dropzone__empty">
                <div className="dropzone__icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="dropzone__hint-main">Drop your PDF here</p>
                <p className="dropzone__hint-sub">or <span className="dropzone__link">click to browse</span></p>
              </div>
            ) : (
              <div className="dropzone__file">
                <div className="file-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="file-details">
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  className="file-remove"
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  title="Remove file"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploadState === 'uploading' && (
            <div className="upload-progress">
              <div className="upload-progress__bar">
                <div className="upload-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="upload-progress__label">
                {progress < 100 ? `Uploading… ${progress}%` : 'Processing document…'}
              </p>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="alert alert--error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {errorMsg}
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && uploadState !== 'uploading' && (
            <button
              className="btn btn--primary btn--full"
              onClick={handleUpload}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Process Document
            </button>
          )}

          {uploadState === 'uploading' && (
            <button className="btn btn--primary btn--full btn--loading" disabled>
              <span className="spinner" />
              Processing…
            </button>
          )}
        </>
      ) : (
        /* Success State */
        <div className="upload-success">
          <div className="upload-success__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h3 className="upload-success__title">Document Ready</h3>
          <p className="upload-success__name">{docInfo?.name}</p>
          <div className="upload-success__meta">
            <span className="badge badge--success">{docInfo?.chunks} chunks indexed</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={handleReset}>
            Upload Another
          </button>
        </div>
      )}
    </div>
  );
}
