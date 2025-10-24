import React, { useRef, useEffect } from 'react';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextInput: React.FC<RichTextInputProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // This effect synchronizes the editor's content with the `value` prop from the parent.
  // It only updates if the DOM's content is different from the prop, which avoids
  // re-rendering on every keystroke and prevents cursor jumps or other editing issues.
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);


  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  
  const selectClasses = "h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground";
  const buttonClasses = "p-1.5 rounded hover:bg-accent text-foreground hover:text-accent-foreground";

  return (
    <div className="rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 border-b p-2 bg-muted/50 text-foreground">
        <select onChange={e => handleCommand('fontName', e.target.value)} className={selectClasses} title="Font Family">
            <option value="Inter, sans-serif">Default</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
        </select>

        <select onChange={e => handleCommand('fontSize', e.target.value)} className={selectClasses} title="Font Size">
            <option value="2">Small</option>
            <option value="3" selected>Normal</option>
            <option value="5">Large</option>
            <option value="6">Heading</option>
        </select>
        
        <div className="w-px h-5 bg-border mx-1"></div>
        
        <button type="button" onClick={() => handleCommand('bold')} className={buttonClasses} title="Bold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M6.55 3.32h2.15c1.48 0 2.5.82 2.5 2.12 0 1.34-.98 2.1-2.5 2.1H7.85v2.32H6.55V3.32zm1.3 3.32c.73 0 1.25-.42 1.25-1.12 0-.7-.52-1.12-1.25-1.12H7.85v2.24h.98z"/></svg>
        </button>
        <button type="button" onClick={() => handleCommand('italic')} className={buttonClasses} title="Italic">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M7.25 3.32h1.45L6.5 12.68H5.05l2.2-9.36z"/></svg>
        </button>
        <button type="button" onClick={() => handleCommand('underline')} className={buttonClasses} title="Underline">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M6.3 3.32h3.4v6.2c0 1.2-.82 2.1-2.25 2.1-1.42 0-2.25-.9-2.25-2.1v-6.2zm1.45 6.2c0 .58.4 1.02 1.1 1.02s1.1-.44 1.1-1.02V4.4h-2.2v5.12zM5.15 13.5h5.7V12H5.15v1.5z"/></svg>
        </button>
        
        <div className="w-px h-5 bg-border mx-1"></div>

        <button type="button" onClick={() => handleCommand('insertUnorderedList')} className={buttonClasses} title="Bulleted List">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
        </button>
        <button type="button" onClick={() => handleCommand('insertOrderedList')} className={buttonClasses} title="Numbered List">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM1.854 2.146a.5.5 0 0 1 0 .708L1.146 3.5H2.5a.5.5 0 0 1 0 1H1.146l.708.708a.5.5 0 0 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5a.5.5 0 0 1 .708 0zM1.854 7.146a.5.5 0 0 1 0 .708L1.146 8.5H2.5a.5.5 0 0 1 0 1H1.146l.708.708a.5.5 0 0 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5a.5.5 0 0 1 .708 0zM1.854 12.146a.5.5 0 0 1 0 .708L1.146 13.5H2.5a.5.5 0 0 1 0 1H1.146l.708.708a.5.5 0 0 1-.708.708l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5a.5.5 0 0 1 .708 0z"/></svg>
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[80px] w-full px-3 py-2 text-sm focus:outline-none bg-background text-foreground"
        data-placeholder={placeholder}
        dir="ltr"
        style={{
          textAlign: 'left',
          unicodeBidi: 'isolate',
          whiteSpace: 'pre-wrap'
        }}
      ></div>
    </div>
  );
};

export default RichTextInput;