import React, { useState, useEffect } from 'react';
import { Button } from './common/Button';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (files: File[]) => void;
  isProcessing: boolean;
  multiple?: boolean;
  title?: string;
  description?: string;
}

// Fix: Changed default export to a named export to resolve module resolution error.
export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ 
    isOpen, 
    onClose, 
    onProcess, 
    isProcessing,
    multiple = false,
    title = 'Upload Document',
    description = 'Upload a file to automatically extract data.'
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [progress, setProgress] = useState(0);

  // Effect to simulate progress bar animation
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isProcessing) {
        setProgress(0); // Reset on new processing start
        let currentProgress = 0;
        // Simulate a ~3 second processing time for a better UX
        timer = setInterval(() => {
            currentProgress += 5;
            if (currentProgress >= 95) { // Stop just before 100 to let the actual completion finish it
                clearInterval(timer);
            } else {
                setProgress(currentProgress);
            }
        }, 150);
    } else {
        setProgress(0);
    }
    
    return () => {
        if (timer) {
            clearInterval(timer);
        }
    };
  }, [isProcessing]);
  
  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
        setSelectedFiles([]);
        setError('');
        setIsDragging(false);
    }
  }, [isOpen]);

  const handleFilesSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!multiple && files.length > 1) {
        setError('Please upload only one file.');
        setSelectedFiles([]);
        return;
    }
    
    const newFiles: File[] = Array.from(files);
    let validationError = '';
    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'];

    for (const file of newFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            validationError = `Invalid file type: ${file.name}. Please upload images (JPG, PNG, WEBP), PDFs, or CSVs.`;
            break;
        }
        if (file.size > MAX_FILE_SIZE) {
            validationError = `File is too large: ${file.name}. Please upload files smaller than 200MB.`;
            break;
        }
    }

    if (validationError) {
        setError(validationError);
        setSelectedFiles([]);
    } else {
        setSelectedFiles(newFiles);
        setError('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelect(event.target.files);
  };
  
  const handleProcessClick = () => {
      if (selectedFiles.length > 0) {
          onProcess(selectedFiles);
      }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium mb-2">Upload File(s)</label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full min-h-32 p-4 border-2 border-dashed rounded-lg cursor-pointer bg-muted transition-colors ${isDragging ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <svg className="w-8 h-8 mb-4 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                  {selectedFiles.length > 0 ? (
                    <div className="text-sm text-foreground">
                        <p className="font-semibold">{selectedFiles.length} file(s) selected</p>
                         <ul className="text-xs text-muted-foreground mt-1 max-h-16 overflow-y-auto">
                            {selectedFiles.map(f => <li key={f.name} className="truncate">{f.name}</li>)}
                        </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG, WEBP, PDF, or CSV (max 200MB each)</p>
                </div>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,application/pdf,text/csv" multiple={multiple} />
              </label>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          {isProcessing && (
            <div className="px-6 pb-6">
              <div className="space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground text-center">AI is analyzing your document(s)...</p>
                  <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.2s ease-in-out' }}></div>
                  </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end p-6 border-t space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button type="button" onClick={handleProcessClick} disabled={selectedFiles.length === 0 || isProcessing}>
            {isProcessing ? 'Processing...' : `Process ${selectedFiles.length > 0 ? selectedFiles.length : ''} File(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
};
