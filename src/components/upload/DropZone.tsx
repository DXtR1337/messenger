'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, FileJson, FileText, AlertTriangle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 500;
const WARN_FILE_SIZE_MB = 200;

// Recursively read all files from a dropped directory
async function readDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = entry.createReader();

  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  // readEntries returns batches — keep reading until empty
  let batch: FileSystemEntry[];
  do {
    batch = await readBatch();
    for (const item of batch) {
      if (item.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (item as FileSystemFileEntry).file(resolve, reject)
        );
        files.push(file);
      } else if (item.isDirectory) {
        const subFiles = await readDirectoryEntries(item as FileSystemDirectoryEntry);
        files.push(...subFiles);
      }
    }
  } while (batch.length > 0);

  return files;
}

// Extract files from DataTransfer, supporting both flat files and directories
async function extractFilesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items;
  const hasEntryApi = items.length > 0 && typeof items[0].webkitGetAsEntry === 'function';

  if (!hasEntryApi) {
    return Array.from(dataTransfer.files);
  }

  const files: File[] = [];
  const entries: FileSystemEntry[] = [];

  // Collect entries first (items collection changes during async ops)
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) entries.push(entry);
  }

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      );
      files.push(file);
    } else if (entry.isDirectory) {
      const dirFiles = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
      files.push(...dirFiles);
    }
  }

  return files;
}

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
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Set webkitdirectory attribute imperatively (non-standard, not in React types)
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
    }
  }, []);

  // Use ref to access current files without adding to useCallback deps
  const selectedFilesRef = useRef<File[]>([]);
  selectedFilesRef.current = selectedFiles;

  const validateAndSetFiles = useCallback(
    (files: File[], replace = false) => {
      setError(null);
      setSizeWarning(null);

      // Filter to .json and .txt files
      const validNewFiles = files.filter((file) => file.name.endsWith('.json') || file.name.endsWith('.txt'));
      if (validNewFiles.length === 0) {
        setError('Akceptowane są tylko pliki .json i .txt. Wybierz eksport rozmowy z Messengera, Instagrama, Telegrama lub WhatsAppa.');
        return;
      }

      if (validNewFiles.length < files.length) {
        setError(
          `${files.length - validNewFiles.length} plik(i) o nieobsługiwanym formacie zostały pominięte.`
        );
      }

      // Append to existing files (deduplicate by name), or replace if folder upload
      let merged: File[];
      if (replace || selectedFilesRef.current.length === 0) {
        merged = validNewFiles;
      } else {
        const existingNames = new Set(selectedFilesRef.current.map(f => f.name));
        const newOnly = validNewFiles.filter(f => !existingNames.has(f.name));
        merged = [...selectedFilesRef.current, ...newOnly];
      }

      // Check individual file sizes
      const totalSize = merged.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);

      for (const file of merged) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          setError(
            `"${file.name}" przekracza limit ${MAX_FILE_SIZE_MB}MB (${formatFileSize(file.size)}).`
          );
          return;
        }
      }

      if (totalSizeMB > MAX_FILE_SIZE_MB) {
        setError(
          `Łączny rozmiar plików (${formatFileSize(totalSize)}) przekracza limit ${MAX_FILE_SIZE_MB}MB.`
        );
        return;
      }

      if (totalSizeMB > WARN_FILE_SIZE_MB) {
        setSizeWarning(
          `Duży upload (${formatFileSize(totalSize)}). Przetwarzanie może chwilę potrwać.`
        );
      }

      setSelectedFiles(merged);
      onFilesSelected(merged);
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
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (disabled) return;

      try {
        const droppedFiles = await extractFilesFromDrop(event.dataTransfer);
        if (droppedFiles.length > 0) {
          validateAndSetFiles(droppedFiles);
        }
      } catch {
        // Fallback to flat file list
        const flatFiles = Array.from(event.dataTransfer.files);
        if (flatFiles.length > 0) {
          validateAndSetFiles(flatFiles);
        }
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

  const handleFolderClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    folderInputRef.current?.click();
  }, [disabled]);

  const handleFolderInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = event.target.files;
      if (!inputFiles || inputFiles.length === 0) return;
      validateAndSetFiles(Array.from(inputFiles), true);
      event.target.value = '';
    },
    [validateAndSetFiles]
  );

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
            `Duży upload (${formatFileSize(totalSize)}). Przetwarzanie może chwilę potrwać.`
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
          accept=".json,.txt"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="Select JSON files"
        />
        <input
          ref={folderInputRef}
          type="file"
          onChange={handleFolderInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="Select conversation folder"
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
            {isDragging ? 'Upuść pliki lub folder tutaj' : 'Upuść eksport rozmowy (.json lub .txt)'}
          </p>
          <p className="text-xs text-muted-foreground">
            lub kliknij, żeby wybrać pliki
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFolderClick}
            disabled={disabled}
            className="mt-1 gap-1.5 text-xs"
          >
            <FolderOpen className="size-3.5" />
            Wybierz cały folder rozmowy
          </Button>
          <p className="text-[10px] text-primary/70">
            Zalecane dla Messengera — automatycznie połączy wszystkie pliki
          </p>
          <p className="text-xs text-muted-foreground/70">
            Messenger · Instagram · Telegram (JSON) · WhatsApp (TXT)
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <p className="text-center text-[11px] text-muted-foreground/50">
        🔒 Twoje wiadomości są przetwarzane wyłącznie w przeglądarce. Żadne dane nie trafiają na serwer.
      </p>

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
              {selectedFiles.length} plik{selectedFiles.length !== 1 ? '(i)' : ''} wybrany{selectedFiles.length !== 1 ? 'ch' : ''}
            </span>
            <span>{formatFileSize(totalSize)}</span>
          </div>
          <div className="space-y-1.5">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                {file.name.endsWith('.txt') ? (
                  <FileText className="size-4 shrink-0 text-primary" />
                ) : (
                  <FileJson className="size-4 shrink-0 text-primary" />
                )}
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
