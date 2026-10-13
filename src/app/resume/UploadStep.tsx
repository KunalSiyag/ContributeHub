'use client';

import { useEffect, useEffectEvent, useId, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Notice, Panel, Tag } from '@/components/ui/primitives';
import { IconFileText, IconUpload } from '@/components/icons';
import { INTEREST_AREAS, type SkillProfile } from '@/lib/matching';
import { DEFAULT_MAX_BYTES, formatBytes, type ResumeResult, type UploadConfig } from './flow';
import styles from './page.module.css';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ACCEPT = `.pdf,.docx,application/pdf,${DOCX_TYPE}`;
const AREA_LABELS = new Map(INTEREST_AREAS.map(area => [area.value, area.label]));

function fileKind(file: File): 'PDF' | 'DOCX' | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'PDF';
  if (name.endsWith('.docx') || file.type === DOCX_TYPE) return 'DOCX';
  return null;
}

/** Same rules as POST /api/resume, checked before uploading. */
function validate(file: File, maxBytes: number): string | null {
  if (!fileKind(file)) {
    return file.name.toLowerCase().endsWith('.doc')
      ? `“${file.name}” is an older Word file. Save it as DOCX or PDF, then try again.`
      : `“${file.name}” isn’t a PDF or DOCX file.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  if (file.size > maxBytes) {
    return `“${file.name}” is ${formatBytes(file.size)}. Files must be ${formatBytes(maxBytes)} or smaller.`;
  }
  return null;
}

const hasFiles = (event: DragEvent) => Boolean(event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files'));

interface UploadStepProps {
  /** Attached to the file input so the page can focus it when returning to this step. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** From GET /api/resume; null until it answers. */
  config: UploadConfig | null;
  aiEnabled: boolean;
  onAiChange: (enabled: boolean) => void;
  onAnalyzed: (result: ResumeResult, fileName: string) => void;
  onAnnounce: (message: string) => void;
  /** The user's saved skills, when they have any. */
  saved: SkillProfile | null;
  onUseSaved: () => void;
}

export default function UploadStep({
  inputRef,
  config,
  aiEnabled,
  onAiChange,
  onAnalyzed,
  onAnnounce,
  saved,
  onUseSaved,
}: UploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const readButtonRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const pendingFocus = useRef<'read' | 'input' | null>(null);
  const id = useId();

  const maxBytes = config?.maxBytes ?? DEFAULT_MAX_BYTES;
  const aiAvailable = config?.aiConfigured === true;
  const dropActive = dragging && !reading;

  const choose = (candidate: File | null | undefined) => {
    if (!candidate || reading) return;
    const problem = validate(candidate, maxBytes);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(candidate);
    pendingFocus.current = 'read';
    onAnnounce(`${candidate.name} selected, ${formatBytes(candidate.size)}.`);
  };

  const remove = () => {
    setFile(null);
    setError(null);
    pendingFocus.current = 'input';
    onAnnounce('File removed.');
  };

  // The input and the file summary swap places, so put focus somewhere useful.
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'read') readButtonRef.current?.focus();
    else if (target === 'input') inputRef.current?.focus();
  }, [file, inputRef]);

  // Accept a file dropped anywhere on the page, and light up the drop zone while dragging.
  const dropFile = useEffectEvent((dropped: File | undefined) => choose(dropped));
  useEffect(() => {
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      dropFile(event.dataTransfer?.files?.[0]);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Abandon an in-flight read if the user leaves this step.
  useEffect(() => {
    const request = requestRef;
    return () => request.current?.abort();
  }, []);

  const read = async () => {
    if (!file || reading) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const enhance = aiAvailable && aiEnabled;
    setReading(true);
    setError(null);
    onAnnounce(enhance ? `Reading ${file.name} with keyword matching and Gemini…` : `Reading ${file.name}…`);

    const body = new FormData();
    body.append('resume', file);
    body.append('enhance', enhance ? 'true' : 'false');

    try {
      const response = await fetch('/api/resume', { method: 'POST', body, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (response.ok && data?.analysis) {
        onAnalyzed(data as ResumeResult, file.name);
        return;
      }
      setError(typeof data?.message === 'string' ? data.message : 'We couldn’t read that file. Try again.');
    } catch {
      if (controller.signal.aborted) return;
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setReading(false);
      // Clear the picker so choosing the same file again still fires a change.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const cancel = () => {
    requestRef.current?.abort();
    onAnnounce('Stopped reading the file.');
    readButtonRef.current?.focus();
  };

  return (
    <section className={styles.step} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="visually-hidden">
        Upload a resume
      </h2>

      <Panel>
        <div className={styles.uploadBody}>
          {!file || dropActive ? (
            <>
              <input
                ref={inputRef}
                id={`${id}-file`}
                type="file"
                accept={ACCEPT}
                className={styles.fileInput}
                aria-labelledby={`${id}-drop`}
                aria-describedby={`${id}-limits`}
                disabled={reading}
                onChange={event => {
                  choose(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <label htmlFor={`${id}-file`} className={styles.dropzone} data-active={dropActive || undefined}>
                <span className={styles.dropIcon} aria-hidden="true">
                  <IconUpload size={16} />
                </span>
                <span id={`${id}-drop`} className={styles.dropTitle}>
                  {dropActive ? (
                    'Drop to add this file'
                  ) : (
                    <>
                      Drop a PDF or DOCX here, or <span className={styles.dropLink}>choose a file</span>
                    </>
                  )}
                </span>
                <span id={`${id}-limits`} className={styles.dropCaption}>
                  Up to {formatBytes(maxBytes)}. Files are read in memory and never stored.
                </span>
              </label>
            </>
          ) : (
            <div className={styles.file}>
              <span className={styles.fileIcon} aria-hidden="true">
                <IconFileText size={16} />
              </span>
              <div className={styles.fileText}>
                <span className={styles.fileRowName} title={file.name}>
                  {file.name}
                </span>
                <span className={styles.fileMeta}>
                  {fileKind(file)} · {formatBytes(file.size)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={remove} disabled={reading} aria-label={`Remove ${file.name}`}>
                Remove
              </Button>
            </div>
          )}

          {error && <Notice tone="danger">{error}</Notice>}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerStart}>
            {aiAvailable && (
              <div className={styles.option}>
                <Checkbox
                  label="Improve extraction with AI"
                  checked={aiEnabled}
                  disabled={reading}
                  onChange={event => onAiChange(event.target.checked)}
                  aria-describedby={`${id}-ai`}
                />
                <p id={`${id}-ai`} className={styles.optionNote}>
                  Sends the extracted text to Google’s Gemini API.
                </p>
              </div>
            )}
          </div>
          <div className={styles.footerActions}>
            {reading && (
              <Button variant="ghost" onClick={cancel}>
                Cancel
              </Button>
            )}
            <Button
              ref={readButtonRef}
              variant="primary"
              onClick={read}
              disabled={!file}
              aria-busy={reading || undefined}
              className={reading ? styles.busy : undefined}
            >
              {reading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Reading…
                </>
              ) : (
                'Read resume'
              )}
            </Button>
          </div>
        </div>
      </Panel>

      {saved && <SavedSkills skills={saved} onUse={onUseSaved} disabled={reading} />}
    </section>
  );
}

function SavedSkills({ skills, onUse, disabled }: { skills: SkillProfile; onUse: () => void; disabled: boolean }) {
  const entries = [
    ...skills.languages,
    ...skills.technologies,
    ...skills.interests.map(value => AREA_LABELS.get(value) ?? value),
  ];
  const preview = entries.slice(0, 4);
  const more = entries.length - preview.length;

  return (
    <div className={styles.saved}>
      <div className={styles.savedText}>
        <span className={styles.savedLabel}>Your saved skills</span>
        <span className={styles.savedTags}>
          {preview.map((entry, index) => (
            <Tag key={`${index}-${entry}`}>{entry}</Tag>
          ))}
          {more > 0 && (
            <span className={styles.savedMore}>
              +{more}
              <span className="visually-hidden"> more</span>
            </span>
          )}
        </span>
      </div>
      <Button variant="secondary" onClick={onUse} disabled={disabled}>
        Skip upload — use my saved skills
      </Button>
    </div>
  );
}
