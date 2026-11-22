import React, { useState, useRef } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  FolderTree, 
  Download, 
  Upload, 
  Copy, 
  Trash2, 
  Settings, 
  Check, 
  Cpu, 
  FileCode, 
  Layers, 
  Sparkles, 
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { ESPProject } from '../types/esp32';
import { projectManager, SavedProjectSummary } from '../project/projectManager';
import { ProjectExporter } from '../project/exporter';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ESPProject;
}

type ModalTab = 'browse' | 'create' | 'import_export' | 'settings';

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'builtin' | 'custom'>('all');

  // New Project Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectBoard, setNewProjectBoard] = useState<'ESP32_DEVKIT_V1' | 'ESP32_S3' | 'ESP32_C3'>('ESP32_DEVKIT_V1');
  const [newProjectTemplateId, setNewProjectTemplateId] = useState<string>('blank');

  // Metadata Settings state
  const [editName, setEditName] = useState(currentProject.metadata.name);
  const [editDesc, setEditDesc] = useState(currentProject.metadata.description);
  const [editVersion, setEditVersion] = useState(currentProject.metadata.version);
  const [editAuthor, setEditAuthor] = useState(currentProject.metadata.author);
  const [editBoard, setEditBoard] = useState(currentProject.metadata.targetBoard);
  const [editTags, setEditTags] = useState(currentProject.metadata.tags?.join(', ') || '');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Import error/success messages
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const projectSummaries: SavedProjectSummary[] = projectManager.getAllProjectSummaries();
  const templates = projectManager.getTemplates();

  const filteredProjects = projectSummaries.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.targetBoard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterType === 'builtin') return matchesSearch && p.isBuiltIn;
    if (filterType === 'custom') return matchesSearch && !p.isBuiltIn;
    return matchesSearch;
  });

  const handleOpenProject = (projectId: string) => {
    projectManager.loadProjectById(projectId);
    onClose();
  };

  const handleDuplicate = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const all = projectManager.getAllProjectSummaries();
    const target = all.find(p => p.id === projectId);
    const newName = prompt('Másolat neve:', target ? `${target.name} (Másolat)` : 'Új Projekt Másolat');
    if (newName) {
      // Find full project
      const userProjects = projectManager.getUserProjects();
      const userP = userProjects.find(p => p.metadata.id === projectId);
      const tpl = templates.find(t => t.project.metadata.id === projectId);
      const srcProject = userP || tpl?.project || currentProject;
      projectManager.duplicateProject(srcProject, newName);
      onClose();
    }
  };

  const handleDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Biztosan törölni szeretnéd ezt a mentett projektet?')) {
      projectManager.deleteUserProject(projectId);
    }
  };

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    if (newProjectTemplateId === 'blank') {
      projectManager.createBlankProject(newProjectName.trim(), newProjectBoard);
    } else {
      const template = templates.find(t => t.id === newProjectTemplateId);
      if (template) {
        const copy: ESPProject = JSON.parse(JSON.stringify(template.project));
        copy.metadata.id = 'proj_' + Date.now();
        copy.metadata.name = newProjectName.trim();
        copy.metadata.description = newProjectDesc.trim() || template.description;
        copy.metadata.targetBoard = newProjectBoard;
        copy.circuit.board = newProjectBoard;
        copy.metadata.createdAt = Date.now();
        copy.metadata.updatedAt = Date.now();
        projectManager.loadProject(copy);
        projectManager.saveUserProject(copy);
      }
    }
    onClose();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    projectManager.updateMetadata(editName.trim(), editDesc.trim(), {
      version: editVersion.trim(),
      author: editAuthor.trim(),
      targetBoard: editBoard,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const res = projectManager.importProjectFromJson(content);
      if (res.success) {
        setImportStatus({ success: true, message: `Sikeres importálás: "${res.project?.metadata.name}"` });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportStatus({ success: false, message: res.error || 'Importálási hiba' });
      }
    };
    reader.onerror = () => {
      setImportStatus({ success: false, message: 'Nem sikerült a fájl beolvasása.' });
    };
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const jsonStr = ProjectExporter.exportToJson(currentProject);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    ProjectExporter.downloadBlob(blob, `${currentProject.metadata.name.replace(/\s+/g, '_')}.espproj`);
  };

  const handleExportArduino = async () => {
    const blob = await ProjectExporter.exportToArduinoZip(currentProject);
    ProjectExporter.downloadBlob(blob, `${currentProject.metadata.name.replace(/\s+/g, '_')}_arduino.zip`);
  };

  const handleExportPlatformIO = async () => {
    const blob = await ProjectExporter.exportToPlatformIOZip(currentProject);
    ProjectExporter.downloadBlob(blob, `${currentProject.metadata.name.replace(/\s+/g, '_')}_platformio.zip`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>ESP32 Projektkezelő</span>
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                  v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Projektek tallózása, új vázlatok létrehozása, importálás/exportálás és beállítások
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/20 text-xs font-medium space-x-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'browse'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Projektek böngészése ({projectSummaries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'create'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Új Projekt Létrehozása</span>
          </button>

          <button
            onClick={() => setActiveTab('import_export')}
            className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'import_export'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import & Export</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Aktív Projekt Beállításai</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: BROWSE PROJECTS */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Keresés név, leírás, tag vagy mikrokontroller alapján..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl text-xs shrink-0">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Összes
                  </button>
                  <button
                    onClick={() => setFilterType('builtin')}
                    className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                      filterType === 'builtin'
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mintaprojektek
                  </button>
                  <button
                    onClick={() => setFilterType('custom')}
                    className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                      filterType === 'custom'
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Saját Mentett
                  </button>
                </div>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {filteredProjects.map((p) => {
                  const isActive = p.id === currentProject.metadata.id || 
                    (currentProject.metadata.id === 'proj_feedermate_step1' && p.id === 'template_feedermate_companion');

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenProject(p.id)}
                      className={`group relative p-4 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top status & badge */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
                              {p.name}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {isActive ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/40 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>AKTÍV</span>
                              </span>
                            ) : p.isBuiltIn ? (
                              <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/30 font-mono">
                                BEÉPÍTETT
                              </span>
                            ) : (
                              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/30 font-mono">
                                SAJÁT
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                          {p.description || 'Nincs részletes leírás megadva.'}
                        </p>
                      </div>

                      {/* Bottom stats & Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Cpu className="w-3 h-3 text-emerald-500" />
                            <span>{p.targetBoard}</span>
                          </span>

                          <span className="flex items-center space-x-1 text-slate-400">
                            <FileCode className="w-3 h-3 text-sky-400" />
                            <span>{p.filesCount} fájl</span>
                          </span>

                          <span className="flex items-center space-x-1 text-slate-400">
                            <Layers className="w-3 h-3 text-amber-400" />
                            <span>{p.peripheralsCount} periféria</span>
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => handleDuplicate(p.id, e)}
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                            title="Projekt duplikálása / másolat készítése"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {!p.isBuiltIn && (
                            <button
                              onClick={(e) => handleDelete(p.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Mentett projekt törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW PROJECT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateNewProject} className="max-w-xl mx-auto space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Új Projekt Paraméterei</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Projekt Neve *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="pl. My Smart Controller v1"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rövid Leírás
                  </label>
                  <textarea
                    rows={2}
                    placeholder="A projekt célja, funkciói..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Célhardver (Board)
                    </label>
                    <select
                      value={newProjectBoard}
                      onChange={(e) => setNewProjectBoard(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ESP32_DEVKIT_V1">ESP32 DevKit V1 (Alapértelmezett)</option>
                      <option value="ESP32_S3">ESP32-S3 (Dual Type-C / Vector)</option>
                      <option value="ESP32_C3">ESP32-C3 (RISC-V Single Core)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Kiinduló Sablon
                    </label>
                    <select
                      value={newProjectTemplateId}
                      onChange={(e) => setNewProjectTemplateId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="blank">🌟 Üres Projekt (Blank Sketch)</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Projekt Létrehozása</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: IMPORT & EXPORT */}
          {activeTab === 'import_export' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Import Card */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Projekt Importálása (.espproj / .json)
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Tölts be egy korábban exportált vagy lementett ESP32 szimulátor projektcsomagot.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json,.espproj"
                  className="hidden"
                />

                <div className="pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Fájl kiválasztása a számítógépről...</span>
                  </button>
                </div>

                {importStatus && (
                  <div className={`p-3 rounded-lg text-xs font-medium border ${
                    importStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {importStatus.message}
                  </div>
                )}
              </div>

              {/* Export Card */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <Download className="w-5 h-5 text-sky-400" />
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Aktív Projekt Exportálása ({currentProject.metadata.name})
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Mentsd le a projektet a merevlemezre szimulátor formátumban vagy fizikai mikrokontrollerre tölthető Arduino / PlatformIO ZIP csomagként.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={handleExportJson}
                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>.espproj JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Összes forráskód és periféria lábkiosztás
                    </p>
                  </button>

                  <button
                    onClick={handleExportArduino}
                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-xl text-left transition cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Arduino IDE ZIP</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Azonnal fordítható Arduino IDE v2 vázlat mappa
                    </p>
                  </button>

                  <button
                    onClick={handleExportPlatformIO}
                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>PlatformIO ZIP</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PlatformIO projekt platformio.ini fájllal
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & METADATA */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="max-w-xl mx-auto space-y-4">
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>Aktív Projekt Metaadatok</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Projekt Neve *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Leírás
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Verzió
                    </label>
                    <input
                      type="text"
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Szerző / Fejlesztő
                    </label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Célhardver
                    </label>
                    <select
                      value={editBoard}
                      onChange={(e) => setEditBoard(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ESP32_DEVKIT_V1">ESP32 DevKit V1</option>
                      <option value="ESP32_S3">ESP32-S3</option>
                      <option value="ESP32_C3">ESP32-C3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Címkék / Tagek (vesszővel elválasztva)
                    </label>
                    <input
                      type="text"
                      placeholder="pl. OLED, BLE, Sensor"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {settingsSaved && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>Metaadatok sikeresen elmentve!</span>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Változtatások Mentése</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
