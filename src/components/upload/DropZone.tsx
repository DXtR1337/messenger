'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileJson, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 500;
const WARN_FILE_SIZE_MB = 200;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateAndSetFiles = useCallback(
    (files: File[]) => {
      setError(null);
      setSizeWarning(null);

      // Filter to only .json files
      const jsonFiles = files.filter((file) => file.name.endsWith('.json'));
      if (jsonFiles.length === 0) {
        setError('Only .json files are accepted. Please select a Messenger export file.');
        return;
      }

      if (jsonFiles.length < files.length) {
        setError(
          `${files.length - jsonFiles.length} non-JSON file(s) were ignored.`
        );
      }

      // Check individual file sizes
      const totalSize = jsonFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);

      for (const file of jsonFiles) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          setError(
            `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit (${formatFileSize(file.size)}). Please use a smaller export.`
          );
          return;
        }
      }

      if (totalSizeMB > MAX_FILE_SIZE_MB) {
        setError(
          `Total file size (${formatFileSize(totalSize)}) exceeds the ${MAX_FILE_SIZE_MB}MB limit.`
        );
        return;
      }

      if (totalSizeMB > WARN_FILE_SIZE_MB) {
        setSizeWarning(
          `Large upload (${formatFileSize(totalSize)}). Processing may take a while.`
        );
      }

      setSelectedFiles(jsonFiles);
      onFilesSelected(jsonFiles);
    },
    [onFilesSelected]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      dragCounter.current++;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (disabled) return;

      const droppedFiles = Array.from(event.dataTransfer.files);
      if (droppedFiles.length > 0) {
        validateAndSetFiles(droppedFiles);
      }
    },
    [disabled, validateAndSetFiles]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = event.target.files;
      if (!inputFiles || inputFiles.length === 0) return;
      validateAndSetFiles(Array.from(inputFiles));
      // Reset so the same file can be re-selected
      event.target.value = '';
    },
    [validateAndSetFiles]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const removeFile = useCallback(
    (index: number) => {
      const updated = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updated);
      setSizeWarning(null);
      setError(null);

      if (updated.length > 0) {
        const totalSize = updated.reduce((sum, file) => sum + file.size, 0);
        const totalSizeMB = totalSize / (1024 * 1024);
        if (totalSizeMB > WARN_FILE_SIZE_MB) {
          setSizeWarning(
            `Large upload (${formatFileSize(totalSize)}). Processing may take a while.`
          );
        }
        onFilesSelected(updated);
      } else {
        onFilesSelected([]);
      }
    },
    [selectedFiles, onFilesSelected]
  );

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const hasFiles = selectedFiles.length > 0;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative min-h-[200px] rounded-lg border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-4 px-6 py-8',
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
          isDragging && !disabled && 'border-primary bg-primary/5',
          !isDragging && !disabled && 'border-border bg-card/50 hover:border-muted-foreground/50 hover:bg-card/80',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="Select JSON files"
        />

        <div
          className={cn(
            'rounded-full p-4 transition-colors duration-200',
            isDragging ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Upload className="size-8" />
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop files here' : 'Drop your Messenger JSON here'}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground/70">
            Supports multiple files (message_1.json, message_2.json, ...)
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Size warning */}
      {sizeWarning && !error && (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/20 px-3 py-2.5 text-xs text-warning">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{sizeWarning}</span>
        </div>
      )}

      {/* Selected files list */}
      {hasFiles && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <span>{formatFileSize(totalSize)}</span>
          </div>
          <div className="space-y-1.5">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <FileJson className="size-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-sm font-mono text-foreground">
                  {file.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
