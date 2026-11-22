import { ESPProject, ProjectFile, PeripheralConfig, ProjectTemplate, ProjectMetadata } from '../types/esp32';
import { FEEDERMATE_COMPANION_PROJECT, DEFAULT_TEMPLATES, LOADED_PROJECTS } from './defaultProjects';

export type ProjectChangeListener = (project: ESPProject) => void;

const STORAGE_KEY = 'esp32_simulator_active_project_v47';
const USER_PROJECTS_STORAGE_KEY = 'esp32_simulator_user_projects_v1';

export interface SavedProjectSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  targetBoard: string;
  updatedAt: number;
  isBuiltIn?: boolean;
  tags?: string[];
  filesCount: number;
  peripheralsCount: number;
}

export class ProjectManager {
  private currentProject: ESPProject;
  private listeners: Set<ProjectChangeListener> = new Set();

  constructor() {
    this.currentProject = this.loadFromStorage() || JSON.parse(JSON.stringify(FEEDERMATE_COMPANION_PROJECT));
  }

  public getProject(): ESPProject {
    return this.currentProject;
  }

  public getTemplates(): ProjectTemplate[] {
    return DEFAULT_TEMPLATES;
  }

  public resetToDefault() {
    this.currentProject = JSON.parse(JSON.stringify(FEEDERMATE_COMPANION_PROJECT));
    this.notify();
  }

  public subscribe(listener: ProjectChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProject);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.currentProject.metadata.updatedAt = Date.now();
    this.saveToStorage();
    this.listeners.forEach(listener => listener(this.currentProject));
  }

  public loadProject(project: ESPProject) {
    this.currentProject = JSON.parse(JSON.stringify(project));
    this.notify();
  }

  public createFromTemplate(templateId: string): boolean {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newProject: ESPProject = JSON.parse(JSON.stringify(template.project));
      newProject.metadata.id = 'proj_' + Date.now();
      newProject.metadata.createdAt = Date.now();
      newProject.metadata.updatedAt = Date.now();
      this.currentProject = newProject;
      this.notify();
      return true;
    }
    return false;
  }

  public createBlankProject(name: string, targetBoard: 'ESP32_DEVKIT_V1' | 'ESP32_S3' | 'ESP32_C3' = 'ESP32_DEVKIT_V1'): ESPProject {
    const newProject: ESPProject = {
      metadata: {
        id: 'proj_' + Date.now(),
        name: name.trim() || 'Új ESP32 Projekt',
        description: 'Üres ESP32 vázlat és szimulációs környezet',
        version: '1.0.0',
        author: 'ESP Developer',
        targetBoard: targetBoard,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mainFile: 'src/main.ino',
        tags: ['Custom', targetBoard]
      },
      circuit: {
        board: targetBoard,
        peripherals: [
          {
            id: 'status_led',
            type: 'LED',
            name: 'Beépített LED (GPIO 2)',
            pins: { pin: 2 }
          }
        ]
      },
      files: [
        {
          id: 'file_main_ino',
          name: 'main.ino',
          path: 'src/main.ino',
          language: 'cpp',
          content: `// =========================================================================\n// ${name.trim() || 'Új ESP32 Projekt'}\n// =========================================================================\n\n#define PIN_LED 2\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(PIN_LED, OUTPUT);\n  Serial.println("${name.trim() || 'ESP32'} elindult!");\n}\n\nvoid loop() {\n  digitalWrite(PIN_LED, HIGH);\n  delay(500);\n  digitalWrite(PIN_LED, LOW);\n  delay(500);\n  Serial.println("Villogas ciklus kesz.");\n}\n`
        }
      ],
      activeFileId: 'file_main_ino'
    };

    this.currentProject = newProject;
    this.saveUserProject(newProject);
    this.notify();
    return newProject;
  }

  public duplicateProject(sourceProject?: ESPProject, newName?: string): ESPProject {
    const src = sourceProject || this.currentProject;
    const duplicated: ESPProject = JSON.parse(JSON.stringify(src));
    duplicated.metadata.id = 'proj_' + Date.now();
    duplicated.metadata.name = newName?.trim() || `${src.metadata.name} (Másolat)`;
    duplicated.metadata.createdAt = Date.now();
    duplicated.metadata.updatedAt = Date.now();

    this.currentProject = duplicated;
    this.saveUserProject(duplicated);
    this.notify();
    return duplicated;
  }

  public importProjectFromJson(jsonString: string): { success: boolean; project?: ESPProject; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Érvénytelen JSON formátum.' };
      }

      // Validate basic structure
      if (!parsed.metadata || !parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        return { success: false, error: 'A projekt nem tartalmaz megfelelő metaadatokat vagy forrásfájlokat.' };
      }

      const importedProject: ESPProject = {
        metadata: {
          id: parsed.metadata.id || 'proj_' + Date.now(),
          name: parsed.metadata.name || 'Importált Projekt',
          description: parsed.metadata.description || '',
          version: parsed.metadata.version || '1.0.0',
          author: parsed.metadata.author || 'Imported',
          targetBoard: parsed.metadata.targetBoard || 'ESP32_DEVKIT_V1',
          createdAt: parsed.metadata.createdAt || Date.now(),
          updatedAt: Date.now(),
          mainFile: parsed.metadata.mainFile || parsed.files[0]?.path || 'src/main.ino',
          tags: parsed.metadata.tags || ['Imported']
        },
        circuit: parsed.circuit || {
          board: parsed.metadata.targetBoard || 'ESP32_DEVKIT_V1',
          peripherals: []
        },
        files: parsed.files.map((f: any, idx: number) => ({
          id: f.id || `file_${idx}_${Date.now()}`,
          name: f.name || `file_${idx}.ino`,
          path: f.path || `src/${f.name || `file_${idx}.ino`}`,
          language: f.language || 'cpp',
          content: typeof f.content === 'string' ? f.content : ''
        })),
        activeFileId: parsed.activeFileId || parsed.files[0]?.id || 'file_0'
      };

      this.currentProject = importedProject;
      this.saveUserProject(importedProject);
      this.notify();
      return { success: true, project: importedProject };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Hiba történt a JSON feldolgozása közben.' };
    }
  }

  public updateMetadata(name: string, description: string, extra?: Partial<ProjectMetadata>) {
    this.currentProject.metadata.name = name;
    this.currentProject.metadata.description = description;
    if (extra) {
      if (extra.version) this.currentProject.metadata.version = extra.version;
      if (extra.author) this.currentProject.metadata.author = extra.author;
      if (extra.targetBoard) {
        this.currentProject.metadata.targetBoard = extra.targetBoard;
        this.currentProject.circuit.board = extra.targetBoard as any;
      }
      if (extra.tags) this.currentProject.metadata.tags = extra.tags;
    }
    this.saveUserProject(this.currentProject);
    this.notify();
  }

  // --- Saved User Projects Library ---

  public getUserProjects(): ESPProject[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(USER_PROJECTS_STORAGE_KEY);
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch {
      // Ignored
    }
    return [];
  }

  public saveUserProject(project: ESPProject) {
    try {
      if (typeof localStorage !== 'undefined') {
        const userProjects = this.getUserProjects();
        const existingIdx = userProjects.findIndex(p => p.metadata.id === project.metadata.id);
        const copy: ESPProject = JSON.parse(JSON.stringify(project));
        copy.metadata.updatedAt = Date.now();

        if (existingIdx !== -1) {
          userProjects[existingIdx] = copy;
        } else {
          userProjects.unshift(copy);
        }
        localStorage.setItem(USER_PROJECTS_STORAGE_KEY, JSON.stringify(userProjects));
      }
    } catch {
      // Ignored
    }
  }

  public deleteUserProject(projectId: string): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        let userProjects = this.getUserProjects();
        userProjects = userProjects.filter(p => p.metadata.id !== projectId);
        localStorage.setItem(USER_PROJECTS_STORAGE_KEY, JSON.stringify(userProjects));
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  }

  public getAllProjectSummaries(): SavedProjectSummary[] {
    const summaries: SavedProjectSummary[] = [];
    const seenIds = new Set<string>();

    // 1. Built-in Templates
    DEFAULT_TEMPLATES.forEach(tpl => {
      const proj = tpl.project;
      if (!seenIds.has(proj.metadata.id)) {
        seenIds.add(proj.metadata.id);
        summaries.push({
          id: proj.metadata.id,
          name: tpl.name,
          description: tpl.description,
          version: proj.metadata.version,
          author: proj.metadata.author,
          targetBoard: proj.metadata.targetBoard,
          updatedAt: proj.metadata.updatedAt,
          isBuiltIn: true,
          tags: proj.metadata.tags || [tpl.category],
          filesCount: proj.files.length,
          peripheralsCount: proj.circuit.peripherals.length
        });
      }
    });

    // 2. User Saved Projects
    const userProjects = this.getUserProjects();
    userProjects.forEach(proj => {
      if (!seenIds.has(proj.metadata.id)) {
        seenIds.add(proj.metadata.id);
        summaries.push({
          id: proj.metadata.id,
          name: proj.metadata.name,
          description: proj.metadata.description,
          version: proj.metadata.version,
          author: proj.metadata.author,
          targetBoard: proj.metadata.targetBoard,
          updatedAt: proj.metadata.updatedAt,
          isBuiltIn: false,
          tags: proj.metadata.tags || ['Custom'],
          filesCount: proj.files.length,
          peripheralsCount: proj.circuit.peripherals.length
        });
      }
    });

    return summaries;
  }

  public loadProjectById(projectId: string): boolean {
    // 1. Check user projects
    const userProjects = this.getUserProjects();
    const userProj = userProjects.find(p => p.metadata.id === projectId);
    if (userProj) {
      this.loadProject(userProj);
      return true;
    }

    // 2. Check built-in templates
    const tpl = DEFAULT_TEMPLATES.find(t => t.project.metadata.id === projectId || t.id === projectId);
    if (tpl) {
      this.loadProject(tpl.project);
      return true;
    }

    // 3. Check loaded projects map
    if (LOADED_PROJECTS[projectId]) {
      this.loadProject(LOADED_PROJECTS[projectId]);
      return true;
    }

    return false;
  }

  // --- Multi-File Operations ---

  public getActiveFile(): ProjectFile | undefined {
    return this.currentProject.files.find(f => f.id === this.currentProject.activeFileId) 
      || this.currentProject.files[0];
  }

  public setActiveFile(fileId: string) {
    const file = this.currentProject.files.find(f => f.id === fileId);
    if (file) {
      this.currentProject.activeFileId = fileId;
      this.notify();
    }
  }

  public updateFileContent(fileId: string, content: string) {
    const file = this.currentProject.files.find(f => f.id === fileId);
    if (file) {
      file.content = content;
      this.notify();
    }
  }

  public addFile(name: string): ProjectFile {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    let lang: 'cpp' | 'c' | 'json' | 'h' | 'markdown' = 'cpp';
    if (ext === 'h' || ext === 'hpp') lang = 'h';
    else if (ext === 'json') lang = 'json';
    else if (ext === 'md') lang = 'markdown';
    else if (ext === 'c') lang = 'c';

    const newFile: ProjectFile = {
      id: 'file_' + Date.now(),
      name: name,
      path: `src/${name}`,
      language: lang,
      content: lang === 'h' 
        ? `#ifndef ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n#define ${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}\n\n// Header declarations\n\n#endif\n`
        : `// ${name}\n#include <Arduino.h>\n\n`
    };

    this.currentProject.files.push(newFile);
    this.currentProject.activeFileId = newFile.id;
    this.notify();
    return newFile;
  }

  public renameFile(fileId: string, newName: string): boolean {
    const file = this.currentProject.files.find(f => f.id === fileId);
    if (file && newName.trim().length > 0) {
      file.name = newName.trim();
      file.path = `src/${newName.trim()}`;
      this.notify();
      return true;
    }
    return false;
  }

  public deleteFile(fileId: string): boolean {
    if (this.currentProject.files.length <= 1) {
      return false; // Mindig maradjon legalább 1 fájl
    }
    const idx = this.currentProject.files.findIndex(f => f.id === fileId);
    if (idx !== -1) {
      this.currentProject.files.splice(idx, 1);
      if (this.currentProject.activeFileId === fileId) {
        this.currentProject.activeFileId = this.currentProject.files[0].id;
      }
      this.notify();
      return true;
    }
    return false;
  }

  // --- Circuit & Peripheral Operations ---

  public getPeripherals(): PeripheralConfig[] {
    return this.currentProject.circuit.peripherals;
  }

  public addPeripheral(peripheral: PeripheralConfig) {
    this.currentProject.circuit.peripherals.push(peripheral);
    this.notify();
  }

  public removePeripheral(id: string) {
    this.currentProject.circuit.peripherals = this.currentProject.circuit.peripherals.filter(p => p.id !== id);
    this.notify();
  }

  public updatePeripheralPins(id: string, pins: Record<string, number>) {
    const p = this.currentProject.circuit.peripherals.find(item => item.id === id);
    if (p) {
      p.pins = { ...pins };
      this.notify();
    }
  }

  // --- Persistence ---

  private saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentProject));
      }
    } catch {
      // Ignored in non-browser env
    }
  }

  private loadFromStorage(): ESPProject | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const proj: ESPProject = JSON.parse(data);
          
          if (proj.metadata.id === 'proj_feedermate_companion' || proj.metadata.id === 'proj_feedermate_step1') {
            const hasST7789 = proj.circuit.peripherals.some(p => p.type === 'ST7789_DISPLAY');
            if (proj.metadata.version !== FEEDERMATE_COMPANION_PROJECT.metadata.version || !hasST7789) {
              return JSON.parse(JSON.stringify(FEEDERMATE_COMPANION_PROJECT));
            }
          }

          if (proj.metadata.id === 'proj_weather_station') {
            const btn = proj.circuit.peripherals.find(p => p.id === 'btn_back');
            if (btn && btn.pins.pin === 4) btn.pins.pin = 14;
            const led = proj.circuit.peripherals.find(p => p.id === 'status_led');
            if (led && led.pins.pin === 2) led.pins.pin = 13;
            const bmp = proj.circuit.peripherals.find(p => p.id === 'bmp280_sensor');
            if (bmp && bmp.pins.sda === 21 && bmp.pins.scl === 22) {
              bmp.pins.sda = 25;
              bmp.pins.scl = 26;
            }

            const cfgFile = proj.files.find(f => f.name === 'config.h');
            if (cfgFile) {
              cfgFile.content = cfgFile.content
                .replace(/#define\s+PIN_BTN_BACK\s+\d+/, '#define PIN_BTN_BACK     14')
                .replace(/#define\s+PIN_LED_STATUS\s+\d+/, '#define PIN_LED_STATUS   13');
            }
          }
          return proj;
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }
}

export const projectManager = new ProjectManager();
