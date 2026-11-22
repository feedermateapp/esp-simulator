import { ESPProject, ProjectFile, ProjectTemplate, CircuitConfig, ProjectMetadata } from '../types/esp32';

interface ProjectDescriptor extends Partial<ProjectMetadata> {
  id: string;
  name: string;
  description: string;
  template?: {
    id: string;
    name: string;
    description: string;
    category: 'Starter' | 'Sensors' | 'Display' | 'Complete Project' | 'Wireless';
    icon: string;
  };
}

// 1. Eager load all project.json descriptors
const projectJsonModules = import.meta.glob<ProjectDescriptor>('./*/project.json', {
  eager: true,
  import: 'default'
});

// 2. Eager load all circuit.json circuit wiring configurations
const circuitJsonModules = import.meta.glob<CircuitConfig>('./*/circuit.json', {
  eager: true,
  import: 'default'
});

// 3. Eager raw load all source files (.ino, .h, .cpp, .c, .json, .md)
const sourceRawModules = import.meta.glob<string>('./*/**', {
  query: '?raw',
  import: 'default',
  eager: true
});

function determineLanguage(filePath: string): 'cpp' | 'c' | 'json' | 'h' | 'markdown' {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'h' || ext === 'hpp') return 'h';
  if (ext === 'c') return 'c';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'cpp';
}

function loadAllProjects(): { projects: Record<string, ESPProject>; templates: ProjectTemplate[] } {
  const projects: Record<string, ESPProject> = {};
  const templates: ProjectTemplate[] = [];

  // Iterate over each project folder discovered by project.json
  for (const [projectPath, descriptor] of Object.entries(projectJsonModules)) {
    // projectPath looks like "./feedermate-companion/project.json"
    const folderMatch = projectPath.match(/\.\/([^/]+)\/project\.json$/);
    if (!folderMatch) continue;
    const folderName = folderMatch[1];

    // Find circuit.json for this folder
    const circuitPath = `./${folderName}/circuit.json`;
    const circuitConfig: CircuitConfig = circuitJsonModules[circuitPath] || {
      board: 'ESP32_DEVKIT_V1',
      peripherals: []
    };

    // Collect all source files under this folder (excluding project.json and circuit.json)
    const files: ProjectFile[] = [];
    const folderPrefix = `./${folderName}/`;

    for (const [fileKey, content] of Object.entries(sourceRawModules)) {
      if (!fileKey.startsWith(folderPrefix)) continue;
      if (fileKey.endsWith('/project.json') || fileKey.endsWith('/circuit.json')) continue;

      const relativePath = fileKey.substring(folderPrefix.length);
      const fileName = relativePath.split('/').pop() || relativePath;
      const fileId = `file_${fileName.replace(/[^a-zA-Z0-9_]/g, '_')}`;

      files.push({
        id: fileId,
        name: fileName,
        path: relativePath,
        language: determineLanguage(fileName),
        content: typeof content === 'string' ? content : String(content || '')
      });
    }

    // Determine active file (prefer mainFile or first file)
    const targetMainFile = descriptor.mainFile || 'src/main.ino';
    const activeFile = files.find(f => f.path === targetMainFile || f.name === 'main.ino') || files[0];
    const activeFileId = activeFile ? activeFile.id : (files[0]?.id || 'file_main_ino');

    const project: ESPProject = {
      metadata: {
        id: descriptor.id || `proj_${folderName}`,
        name: descriptor.name || folderName,
        description: descriptor.description || '',
        version: descriptor.version || '1.0.0',
        author: descriptor.author || 'ESP Developer',
        targetBoard: descriptor.targetBoard || 'ESP32_DEVKIT_V1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mainFile: descriptor.mainFile || 'src/main.ino',
        tags: descriptor.tags || []
      },
      circuit: circuitConfig,
      files: files,
      activeFileId: activeFileId
    };

    projects[folderName] = project;
    if (descriptor.id) {
      projects[descriptor.id] = project;
    }

    // Build template definition if provided or construct default template
    if (descriptor.template) {
      templates.push({
        id: descriptor.template.id,
        name: descriptor.template.name,
        description: descriptor.template.description,
        category: descriptor.template.category,
        icon: descriptor.template.icon,
        project: project
      });
    }
  }

  return { projects, templates };
}

const loadedData = loadAllProjects();

export const LOADED_PROJECTS = loadedData.projects;
export const DEFAULT_TEMPLATES: ProjectTemplate[] = loadedData.templates;

// Named project exports for direct reference and backwards compatibility
export const FEEDERMATE_COMPANION_PROJECT: ESPProject = 
  LOADED_PROJECTS['proj_feedermate_step1'] || LOADED_PROJECTS['feedermate-companion'];

export const WEATHER_STATION_PROJECT: ESPProject = 
  LOADED_PROJECTS['proj_weather_station'] || LOADED_PROJECTS['weather-station'];

export const ROTARY_BASICS_PROJECT: ESPProject = 
  LOADED_PROJECTS['proj_rotary_basics'] || LOADED_PROJECTS['rotary-basics'];

export const OLED_GRAPHICS_PROJECT: ESPProject = 
  LOADED_PROJECTS['proj_oled_graphics'] || LOADED_PROJECTS['oled-graphics'];
