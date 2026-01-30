'use client';

import { useState, useCallback, useRef } from 'react';
import styles from './ResumeUploader.module.css';

interface ResumeAnalysis {
  skills: string[];
  technologies: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  source: 'fast' | 'ai' | 'hybrid';
}

interface ResumeUploaderProps {
  onAnalysisComplete: (analysis: ResumeAnalysis) => void;
  onError?: (error: string) => void;
}

export default function ResumeUploader({ onAnalysisComplete, onError }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhanceWithAI, setEnhanceWithAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExtensions = ['.pdf', '.docx'];

    if (file.size > maxSize) {
      return 'File is too large. Maximum size is 5MB.';
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext) && !validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF or DOCX file.';
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('enhance', enhanceWithAI ? 'true' : 'false');

      const response = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process resume');
      }

      onAnalysisComplete(data.analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process resume';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [enhanceWithAI]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isProcessing ? styles.processing : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className={styles.hiddenInput}
        />

        {isProcessing ? (
          <div className={styles.processingState}>
            <div className={styles.spinner}></div>
            <p className={styles.processingText}>
              {enhanceWithAI ? 'Analyzing with AI...' : 'Extracting skills...'}
            </p>
            <p className={styles.fileName}>{fileName}</p>
          </div>
        ) : (
          <div className={styles.uploadState}>
            <div className={styles.iconContainer}>
              <span className={styles.icon}>📄</span>
            </div>
            <h3 className={styles.title}>Drop your resume here</h3>
            <p className={styles.subtitle}>or click to browse</p>
            <p className={styles.hint}>Supports PDF and DOCX (max 5MB)</p>
          </div>
        )}
      </div>

      {/* AI Enhancement Toggle */}
      <label className={styles.aiToggle}>
        <input
          type="checkbox"
          checked={enhanceWithAI}
          onChange={(e) => setEnhanceWithAI(e.target.checked)}
          disabled={isProcessing}
        />
        <span className={styles.toggleLabel}>
          ✨ Enhance with AI for better accuracy
          <span className={styles.toggleHint}>(takes ~3-5 seconds)</span>
        </span>
      </label>

      {error && (
        <div className={styles.error}>
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
