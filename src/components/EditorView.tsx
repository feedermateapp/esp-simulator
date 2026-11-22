import React, { useRef, useState } from 'react';
import { X, Code2, Sparkles, FileCode } from 'lucide-react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { ESPProject, ProjectFile } from '../types/esp32';
import { projectManager } from '../project/projectManager';

// Configure Monaco to use local monaco-editor package (works 100% offline in Electron)
loader.config({ monaco });

interface EditorViewProps {
  project: ESPProject;
  activeFile: ProjectFile | undefined;
  onSelectFile: (fileId: string) => void;
  onCloseFile?: (fileId: string) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  project,
  activeFile,
  onSelectFile
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 text-sm">
        <Code2 className="w-12 h-12 text-slate-700 mb-2" />
        <p>Nincs megnyitott forrásfájl.</p>
        <p className="text-xs text-slate-600 mt-1">Válassz ki egy fájlt a bal oldali Project Explorerből.</p>
      </div>
    );
  }

  const getLanguage = (fileName: string): string => {
    if (fileName.endsWith('.ino') || fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.h') || fileName.endsWith('.hpp')) {
      return 'cpp';
    }
    if (fileName.endsWith('.json')) {
      return 'json';
    }
    if (fileName.endsWith('.md')) {
      return 'markdown';
    }
    return 'plaintext';
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Define custom dark theme matching the app's Slate-950 / Emerald aesthetic
    monacoInstance.editor.defineTheme('esp-dark-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'type.identifier', foreground: '8be9fd' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'delimiter', foreground: 'f8f8f2' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'keyword.directive', foreground: 'ff79c6' },
        { token: 'keyword.directive.include', foreground: 'ff79c6' }
      ],
      colors: {
        'editor.background': '#020617', // Slate 950
        'editor.foreground': '#e2e8f0', // Slate 200
        'editor.lineHighlightBackground': '#0f172a', // Slate 900
        'editor.selectionBackground': '#10b98133', // Emerald 500 transparent
        'editorCursor.foreground': '#10b981', // Emerald 500
        'editorLineNumber.foreground': '#475569', // Slate 600
        'editorLineNumber.activeForeground': '#10b981',
        'editorGutter.background': '#020617',
        'editorWidget.background': '#0f172a',
        'editorWidget.border': '#1e293b',
        'editorSuggestWidget.background': '#0f172a',
        'editorSuggestWidget.border': '#1e293b',
        'editorSuggestWidget.selectedBackground': '#1e293b',
        'scrollbarSlider.background': '#1e293b80',
        'scrollbarSlider.hoverBackground': '#33415580',
        'scrollbarSlider.activeBackground': '#47556980'
      }
    });

    monacoInstance.editor.setTheme('esp-dark-theme');

    // Track cursor movement for status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
  };

  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      projectManager.updateFileContent(activeFile.id, value);
    }
  };

  const lineCount = activeFile.content.split('\n').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden border-r border-slate-800">
      {/* Tab Bar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-2 space-x-1 overflow-x-auto select-none">
        {project.files.map((file) => {
          const isActive = file.id === activeFile.id;
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-mono rounded-t-md cursor-pointer border-t-2 transition ${
                isActive
                  ? 'bg-slate-950 text-emerald-400 border-emerald-500 font-semibold shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{file.name}</span>
              {project.files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    projectManager.deleteFile(file.id);
                  }}
                  className="p-0.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition ml-1"
                  title="Fájl bezárása"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Main Canvas with Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          key={activeFile.id}
          height="100%"
          width="100%"
          language={getLanguage(activeFile.name)}
          value={activeFile.content}
          path={activeFile.path || activeFile.name}
          theme="esp-dark-theme"
          onChange={handleContentChange}
          onMount={handleEditorDidMount}
          options={{
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
            fontSize: 13,
            lineHeight: 20,
            fontLigatures: true,
            minimap: {
              enabled: true,
              scale: 1,
              renderCharacters: false,
              side: 'right'
            },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'off',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: {
              enabled: true
            },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            padding: {
              top: 10,
              bottom: 10
            },
            folding: true,
            showFoldingControls: 'mouseover',
            matchBrackets: 'always',
            contextmenu: true
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-slate-950 text-slate-500 font-mono text-xs">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-spin mr-2" />
              Szerkesztő betöltése...
            </div>
          }
        />
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>{getLanguage(activeFile.name).toUpperCase()} / Arduino</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>UTF-8</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{activeFile.path || activeFile.name}</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>Sor: {cursorPos.line}, Oszlop: {cursorPos.col}</span>
          <span className="text-slate-600">|</span>
          <span>{lineCount} sor</span>
        </div>
      </div>
    </div>
  );
};
