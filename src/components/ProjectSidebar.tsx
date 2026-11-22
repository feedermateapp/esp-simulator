import React, { useState } from 'react';
import { 
  FolderTree, 
  FilePlus, 
  Trash2, 
  Edit3, 
  Cpu, 
  Check, 
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { ESPProject } from '../types/esp32';
import { projectManager } from '../project/projectManager';

interface ProjectSidebarProps {
  project: ESPProject;
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onOpenCircuitModal: () => void;
  onOpenProjectManagerModal?: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  project,
  activeFileId,
  onSelectFile,
  onOpenCircuitModal,
  onOpenProjectManagerModal
}) => {
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [peripheralsExpanded, setPeripheralsExpanded] = useState(true);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      projectManager.addFile(newFileName.trim());
      setNewFileName('');
      setIsAddingFile(false);
    }
  };

  const handleRenameFile = (fileId: string) => {
    if (editingFileName.trim()) {
      projectManager.renameFile(fileId, editingFileName.trim());
      setEditingFileId(null);
    }
  };

  const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.files.length <= 1) {
      alert('A projektnek legalább egy fájlt tartalmaznia kell!');
      return;
    }
    if (confirm('Biztosan törölni szeretnéd ezt a fájlt?')) {
      projectManager.deleteFile(fileId);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.ino')) return '⚡';
    if (fileName.endsWith('.h') || fileName.endsWith('.hpp')) return '📌';
    if (fileName.endsWith('.cpp') || fileName.endsWith('.c')) return '📄';
    if (fileName.endsWith('.json')) return '⚙️';
    return '📝';
  };

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full select-none shrink-0 text-slate-300">
      {/* Header: Project Explorer Title */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={onOpenProjectManagerModal}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-200 hover:text-emerald-400 uppercase tracking-wider transition cursor-pointer"
          title="Projektkezelő megnyitása"
        >
          <FolderTree className="w-4 h-4 text-emerald-400" />
          <span>Project Explorer</span>
        </button>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsAddingFile(true)}
            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
            title="Új fájl hozzáadása"
          >
            <FilePlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Source Files Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => setFilesExpanded(!filesExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded"
        >
          <div className="flex items-center space-x-1.5">
            {filesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>FORRÁSFÁJLOK (SRC)</span>
          </div>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
            {project.files.length}
          </span>
        </button>

        {filesExpanded && (
          <div className="space-y-0.5 pl-2">
            {/* New File Inline Form */}
            {isAddingFile && (
              <div className="flex items-center space-x-1 bg-slate-800 p-1.5 rounded border border-emerald-500/50 my-1">
                <input
                  type="text"
                  placeholder="pl. display.cpp"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') setIsAddingFile(false);
                  }}
                  autoFocus
                  className="bg-slate-900 text-slate-100 text-xs px-1.5 py-1 rounded w-full focus:outline-none border border-slate-700"
                />
                <button
                  onClick={handleCreateFile}
                  className="p-1 text-emerald-400 hover:bg-slate-700 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsAddingFile(false)}
                  className="p-1 text-slate-400 hover:bg-slate-700 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* File List */}
            {project.files.map((file) => {
              const isActive = file.id === activeFileId;
              const isEditing = editingFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/50 shadow-sm'
                      : 'border border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate flex-1 mr-2">
                    <span className="shrink-0">{getFileIcon(file.name)}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingFileName}
                        onChange={(e) => setEditingFileName(e.target.value)}
                        onBlur={() => handleRenameFile(file.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameFile(file.id);
                          if (e.key === 'Escape') setEditingFileId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-800 text-slate-100 text-xs px-1.5 py-0.5 rounded w-full focus:outline-none border border-emerald-500"
                      />
                    ) : (
                      <span className={`truncate ${isActive ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                        {file.name}
                      </span>
                    )}
                  </div>

                  {/* Action Icons on hover */}
                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFileId(file.id);
                          setEditingFileName(file.name);
                        }}
                        className="p-0.5 text-slate-400 hover:text-sky-400 rounded"
                        title="Átnevezés"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {project.files.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          className="p-0.5 text-slate-400 hover:text-rose-400 rounded"
                          title="Fájl törlése"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Peripherals & Circuit Summary Section */}
        <div className="pt-4">
          <button
            onClick={() => setPeripheralsExpanded(!peripheralsExpanded)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded"
          >
            <div className="flex items-center space-x-1.5">
              {peripheralsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>ÁRAMKÖR (PERIFÉRIÁK)</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCircuitModal();
              }}
              className="text-[10px] text-emerald-400 hover:underline"
            >
              Kezelés
            </button>
          </button>

          {peripheralsExpanded && (
            <div className="space-y-1 pl-2 pt-1">
              {project.circuit.peripherals.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-2 rounded text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between font-medium text-slate-200">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">
                      {p.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-1">
                    {Object.entries(p.pins).map(([pinName, pinNum]) => (
                      <span key={pinName} className="bg-slate-800/80 px-1 py-0.5 rounded border border-slate-700/50">
                        {pinName.toUpperCase()}: <strong className="text-emerald-400">GPIO {pinNum}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Target Board Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center space-x-1.5">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>{project.circuit.board}</span>
        </div>
        <span>v{project.metadata.version}</span>
      </div>
    </aside>
  );
};
