import { useRef, useState, useCallback, DragEvent } from 'react';
import styles from './ZipUpload.module.css';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface Props {
  onFile: (file: File) => void;
  /** Optional: show path input for local-mode developer workflow */
  localModeEnabled?: boolean;
  localPath?: string;
  onLocalPathChange?: (v: string) => void;
  onLocalPathSubmit?: () => void;
}

export default function ZipUpload({
  onFile,
  localModeEnabled,
  localPath,
  onLocalPathChange,
  onLocalPathSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [showLocal, setShowLocal] = useState(false);

  const validate = useCallback((file: File): string => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return 'Only .zip files are accepted.';
    }
    if (file.size === 0) {
      return 'The selected file is empty.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large (${formatBytes(file.size)}). Maximum is ${MAX_SIZE_MB} MB.`;
    }
    return '';
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        setSelected(null);
        return;
      }
      setError('');
      setSelected(file);
      onFile(file);
    },
    [validate, onFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setSelected(null);
    setError('');
  };

  const zoneClass = [
    styles.dropZone,
    dragging ? styles.dropZoneOver : '',
    selected ? styles.dropZoneSelected : '',
    error ? styles.dropZoneError : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <div
        className={zoneClass}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !selected && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="ZIP upload area"
        onKeyDown={(e) => e.key === 'Enter' && !selected && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className={styles.hiddenInput}
          onChange={onInputChange}
        />

        {!selected ? (
          <>
            <span className={styles.dropIcon}>📦</span>
            <p className={styles.dropTitle}>
              {dragging ? 'Drop your ZIP here' : 'Drag & drop your project ZIP'}
            </p>
            <p className={styles.dropSubtitle}>
              or choose a file — max {MAX_SIZE_MB} MB
            </p>
            <button
              className={styles.browseBtn}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              type="button"
            >
              Browse ZIP
            </button>
          </>
        ) : (
          <>
            <span className={styles.dropIcon}>✅</span>
            <p className={styles.dropTitle}>Ready to analyze</p>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{selected.name}</span>
              <span className={styles.fileSize}>({formatBytes(selected.size)})</span>
              <button
                className={styles.removeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                type="button"
                aria-label="Remove file"
                title="Remove file"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className={styles.errorMsg}>⚠️ {error}</p>}

      {/* Developer / local mode toggle */}
      {localModeEnabled && (
        <div className={styles.localModeToggle}>
          <button
            className={styles.localModeBtn}
            type="button"
            onClick={() => setShowLocal((v) => !v)}
          >
            {showLocal ? '▲ Hide local-path mode' : '▼ Developer: use local path instead'}
          </button>
        </div>
      )}

      {localModeEnabled && showLocal && (
        <div className={styles.localModeSection}>
          <input
            type="text"
            value={localPath ?? ''}
            onChange={(e) => onLocalPathChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLocalPathSubmit?.()}
            placeholder="/absolute/path/to/your/project"
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              color: 'var(--text)',
              padding: '0.625rem 0.875rem',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
}
