/**
 * ESP32 / Arduino C++ to JavaScript Runtime Transpiler
 * Transpiles Arduino C++ code (variables, functions, classes, preprocessor definitions,
 * structs, enums, multi-file headers/sources) into valid executable JavaScript for the simulation sandbox.
 */

import { ProjectFile } from '../types/esp32';
import { logger } from '../utils/logger';

export function transpileArduinoCpp(mainCode: string, files: ProjectFile[] = []): string {
  logger.debug('VM', 'Transpiling Arduino C++ project to JavaScript...');

  // 1. Collect all header contents and cpp contents
  let combinedCode = '';

  // Order: Headers first (config first, state_types second, data_models third), then other sources (.cpp/.c), then main sketch
  const headerFiles = files.filter(f => f.name.endsWith('.h') || f.name.endsWith('.hpp'));
  headerFiles.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    if (aName.includes('config')) return -3;
    if (bName.includes('config')) return 3;
    if (aName.includes('state')) return -2;
    if (bName.includes('state')) return 2;
    if (aName.includes('data')) return -1;
    if (bName.includes('data')) return 1;
    return aName.localeCompare(bName);
  });

  const sourceFiles = files.filter(f => (f.name.endsWith('.cpp') || f.name.endsWith('.c') || f.name.endsWith('.ino')) && f.content.trim() !== mainCode.trim());

  for (const h of headerFiles) {
    combinedCode += `\n// --- Header: ${h.name} ---\n` + h.content + '\n';
  }

  for (const s of sourceFiles) {
    combinedCode += `\n// --- Source: ${s.name} ---\n` + s.content + '\n';
  }

  combinedCode += `\n// --- Main Sketch ---\n` + mainCode + '\n';

  let code = combinedCode;

  // 1. Strip comments carefully
  code = code.replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments
  code = code.replace(/\/\/[^\r\n]*/g, '');     // single-line comments

  // 2. Strip single-line header guards: #ifndef, #endif, #pragma once, #include
  code = code.replace(/#ifndef\s+[A-Za-z0-9_]+/g, '');
  code = code.replace(/#endif.*/g, '');
  code = code.replace(/#pragma\s+once/g, '');
  code = code.replace(/#include\s+[<"][^>"]+[>"]/g, '');

  // 3. Strip compiler attributes & specifiers
  code = code.replace(/\bIRAM_ATTR\b/g, '');
  code = code.replace(/\binline\b/g, '');
  code = code.replace(/\bconstexpr\b/g, '');
  code = code.replace(/\bPROGMEM\b/g, '');
  code = code.replace(/\bstatic\b/g, '');
  code = code.replace(/\bextern\b/g, '');

  // 4. Pointer dereference arrow -> to dot .
  code = code.replace(/->/g, '.');

  // 5. Convert enums: enum Name { A = 0, B = 1, C }; -> var A = 0; var B = 1; var C = 2;
  code = code.replace(/enum(?:\s+class)?\s+[A-Za-z0-9_]*\s*\{([^}]*)\}\s*;/g, (_m, body) => {
    let currentVal = 0;
    const items = body.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
    const decls = items.map((item: string) => {
      if (item.includes('=')) {
        const [k, v] = item.split('=').map(x => x.trim());
        const parsed = parseInt(v, 10);
        currentVal = isNaN(parsed) ? 0 : parsed + 1;
        return `var ${k} = ${v};`;
      } else {
        const line = `var ${item} = ${currentVal};`;
        currentVal++;
        return line;
      }
    });
    return decls.join('\n');
  });

  // 6. Extract struct schemas
  const structSchemas = new Map<string, string[]>(); // structName -> fieldNames[]
  const structRegex = /struct\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}\s*;/g;
  let structMatch: RegExpExecArray | null;
  while ((structMatch = structRegex.exec(code)) !== null) {
    const structName = structMatch[1];
    const structBody = structMatch[2];
    const fieldLines = structBody.split(';').map(l => l.trim()).filter(Boolean);
    const fieldNames: string[] = [];
    for (const fl of fieldLines) {
      const parts = fl.trim().split(/[\s*&]+/);
      if (parts.length >= 2) {
        const fname = parts[parts.length - 1].replace(/\[.*\]/, '').trim();
        if (fname && /^[A-Za-z0-9_]+$/.test(fname)) {
          fieldNames.push(fname);
        }
      }
    }
    structSchemas.set(structName, fieldNames);
  }

  code = code.replace(/struct\s+([A-Za-z0-9_]+)\s*\{[\s\S]*?\}\s*;/g, (_m, structName) => {
    return `function ${structName}() { return __createAutoStruct(); }`;
  });

  // 7. Convert #define macros (horizontal whitespace only!)
  code = code.replace(/^[ \t]*#define[ \t]+([A-Za-z0-9_]+)(?:[ \t]+([^\r\n]*))?$/gm, (_match, name, val) => {
    const trimmedVal = (val || '').trim();
    if (!trimmedVal) return `var ${name} = true;`;
    return `var ${name} = ${trimmedVal};`;
  });

  // 8. Convert struct arrays / struct initializations with schema mapping
  for (const [sName, fields] of structSchemas.entries()) {
    // Array of structs: Type name[] = { ... };
    const structArrayRegex = new RegExp(`(?:const\\s+)?(?:unsigned\\s+)?${sName}\\s+([A-Za-z0-9_]+)\\s*\\[\\s*\\d*\\s*\\]\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;`, 'g');
    code = code.replace(structArrayRegex, (_m, varName, arrayBody) => {
      const elementRegex = /\{([^}]+)\}/g;
      const elements: string[] = [];
      let elemMatch: RegExpExecArray | null;
      while ((elemMatch = elementRegex.exec(arrayBody)) !== null) {
        const rawValues = elemMatch[1].split(',').map(v => v.trim()).filter(Boolean);
        const objProps: string[] = [];
        for (let i = 0; i < rawValues.length; i++) {
          const fieldKey = fields[i] || `field_${i}`;
          let val = rawValues[i].replace(/(\d+\.\d+)[fF]\b/g, '$1');
          objProps.push(`${fieldKey}: ${val}`);
        }
        elements.push(`{ ${objProps.join(', ')} }`);
      }
      return `var ${varName} = [\n  ${elements.join(',\n  ')}\n];`;
    });

    // Single struct instance with initializer list: Type name = { ... };
    const singleStructInitRegex = new RegExp(`(?:const\\s+)?(?:unsigned\\s+)?${sName}\\s+([A-Za-z0-9_]+)\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;`, 'g');
    code = code.replace(singleStructInitRegex, (_m, varName, body) => {
      const rawValues = body.split(',').map((v: string) => v.trim()).filter(Boolean);
      const objProps: string[] = [];
      for (let i = 0; i < rawValues.length; i++) {
        const fieldKey = fields[i] || `field_${i}`;
        let val = rawValues[i].replace(/(\d+\.\d+)[fF]\b/g, '$1');
        objProps.push(`${fieldKey}: ${val}`);
      }
      return `var ${varName} = Object.assign(__createAutoStruct(), {\n  ${objProps.join(',\n  ')}\n});`;
    });
  }

  // Generic struct array / nested braces fallback
  code = code.replace(/(?:const\s+)?(?:unsigned\s+)?[A-Z][A-Za-z0-9_]*\s+([A-Za-z0-9_]+)\s*\[\s*\d*\s*\]\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;/g, (_m, varName, arrayBody) => {
    const elementRegex = /\{([^}]+)\}/g;
    const elements: string[] = [];
    let elemMatch: RegExpExecArray | null;
    while ((elemMatch = elementRegex.exec(arrayBody)) !== null) {
      const rawValues = elemMatch[1].split(',').map((v: string) => v.trim()).filter(Boolean);
      elements.push(`[${rawValues.join(', ')}]`);
    }
    if (elements.length > 0) {
      return `var ${varName} = [\n  ${elements.join(',\n  ')}\n];`;
    }
    return `var ${varName} = [${arrayBody}];`;
  });

  // 9. sizeof(ARRAY) / sizeof(...) -> ARRAY.length
  code = code.replace(/\bsizeof\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*\/\s*sizeof\s*\([^)]+\)/g, '$1.length');
  code = code.replace(/\bsizeof\s*\(\s*([A-Za-z0-9_]+)\s*\)/g, '($1 && $1.length !== undefined ? $1.length : 4)');

  // 10. Convert class object instantiations:
  const knownClasses = [
    'Adafruit_SSD1306', 'Adafruit_ST7789', 'Adafruit_ILI9341', 'TFT_eSPI',
    'Adafruit_BMP280', 'Adafruit_BME280', 'WiFiServer',
    'WiFiClient', 'WebServer', 'HTTPClient', 'PubSubClient', 'BLEServer',
    'BLEClient', 'BLEService', 'BLECharacteristic', 'BLE2902', 'Preferences', 'Wire', 'TwoWire'
  ];

  for (const cls of knownClasses) {
    const withArgsRegex = new RegExp(`(?:(?:const|static|unsigned|signed|volatile)\\s+)*\\b${cls}\\s+([A-Za-z0-9_]+)\\s*\\(([^;]*)\\)\\s*;`, 'g');
    code = code.replace(withArgsRegex, (_m, varName, args) => {
      const cleanArgs = args.replace(/&(?:Wire|SPI|[A-Za-z0-9_]+)/g, (m: string) => m.substring(1)).replace(/&/g, '');
      return `var ${varName} = new ${cls}(${cleanArgs});`;
    });

    const assignArgsRegex = new RegExp(`(?:(?:const|static|unsigned|signed|volatile)\\s+)*\\b${cls}\\s+([A-Za-z0-9_]+)\\s*=\\s*${cls}\\s*\\(([^;]*)\\)\\s*;`, 'g');
    code = code.replace(assignArgsRegex, (_m, varName, args) => {
      const cleanArgs = args.replace(/&(?:Wire|SPI|[A-Za-z0-9_]+)/g, (m: string) => m.substring(1)).replace(/&/g, '');
      return `var ${varName} = new ${cls}(${cleanArgs});`;
    });

    const withoutArgsRegex = new RegExp(`(?:(?:const|static|unsigned|signed|volatile)\\s+)*\\b${cls}\\s+([A-Za-z0-9_]+)\\s*;`, 'g');
    code = code.replace(withoutArgsRegex, `var $1 = new ${cls}();`);

    const newRegex = new RegExp(`(?<!new\\s+)\\b${cls}\\s*\\(`, 'g');
    code = code.replace(newRegex, `new ${cls}(`);
  }

  // 11. Remove all forward function declarations (any return type, ending with semicolon):
  code = code.replace(/^[ \t]*(?:(?:const|static|unsigned|signed|volatile)\s+)*(?:void|int|float|double|bool|long|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|[A-Z][A-Za-z0-9_]*)(?:\s*[*&])?\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*;/gm, '');

  // 12. Convert primitive array initializers: Type name[] = { ... }; -> var name = [ ... ];
  code = code.replace(/^[ \t]*(?:(?:const|static|unsigned|signed|volatile)\s+)*(?:int|float|double|bool|long|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String)[*&\s]+(?:(?:const|static|unsigned|signed|volatile)\s+)*([A-Za-z0-9_]+)\s*\[\s*\]\s*=\s*\{([^}]*)\}\s*;/gm, 'var $1 = [$2];');

  // 13. Convert fixed-size buffer/array definitions: Type name[size]; -> var name = [];
  code = code.replace(/^[ \t]*(?:(?:const|static|unsigned|signed|volatile)\s+)*(?:int|float|double|bool|long|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String)[*&\s]+(?:(?:const|static|unsigned|signed|volatile)\s+)*([A-Za-z0-9_]+)\s*\[\s*[^\]]*\s*\]\s*;/gm, 'var $1 = [];');

  // 14. Namespace static accesses: BLEDevice::init -> BLEDevice.init, etc.
  code = code.replace(/([A-Za-z0-9_]+)::([A-Za-z0-9_]+)/g, '$1.$2');

  // 15. Convert function definitions:
  code = code.replace(/^[ \t]*(?:(?:const|static|unsigned|signed|volatile)\s+)*(?:void|int|float|double|bool|long|char\*?|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|[A-Za-z0-9_]+)(?:\s*[*&])?\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/gm, (_match, funcName, rawParams) => {
    const params = rawParams
      .split(',')
      .map((p: string) => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        const parts = trimmed.split(/[\s*&]+/);
        return parts[parts.length - 1];
      })
      .filter((p: string) => p.length > 0)
      .join(', ');

    if (funcName === 'setup' || funcName === 'loop') {
      return `async function ${funcName}(${params}) {`;
    }
    return `function ${funcName}(${params}) {`;
  });

  // 16. Array declarations
  code = code.replace(/\bchar\s+([a-zA-Z0-9_]+)\s*\[\s*\d*\s*\]\s*;/g, 'var $1 = "";');
  code = code.replace(/\b(?:int|float|double|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|long)\s+([a-zA-Z0-9_]+)\s*\[\s*\d*\s*\]\s*;/g, 'var $1 = [];');

  // 17. sprintf statement assignment
  code = code.replace(/\bsprintf\s*\(\s*([a-zA-Z0-9_.\[\]]+)\s*,/g, '$1 = sprintf($1,');

  // 18. Pointer and reference variable declarations with assignment (SAFE: line start or ;, single * or &, assignment = NOT ==)
  code = code.replace(/(?:^|[;{}])[ \t]*(?:(?:const|unsigned|signed|volatile)\s+)*[A-Za-z0-9_]+(?:\s*[*&]|\s+)\s*([a-zA-Z0-9_]+)\s*=(?!=)/gm, (match, varName) => {
    const prefix = match.charAt(0) === ';' || match.charAt(0) === '{' || match.charAt(0) === '}' ? match.charAt(0) + ' ' : '';
    return `${prefix}var ${varName} =`;
  });

  // 19. Convert C++ variable declarations with type keywords
  code = code.replace(/\bconst\s+(?:int|float|double|bool|long|char\*|char|uint8_t|uint16_t|uint32_t|size_t|String)\s+/g, 'var ');
  code = code.replace(/\b(?:volatile\s+)?(?:unsigned\s+)?(?:int|float|double|bool|long|char\*|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String)\s+/g, 'var ');
  code = code.replace(/\bvolatile\s+/g, 'var ');
  code = code.replace(/\bconst\b/g, 'var');

  // 20. Custom struct variable instantiations: e.g. AppState app; -> var app = __createAutoStruct();
  code = code.replace(/\b([A-Z][A-Za-z0-9_]*)\s+([a-zA-Z0-9_]+)\s*;/g, (_m, typeName, varName) => {
    if (typeName === 'Serial' || typeName === 'Wire' || typeName === 'SPI' || typeName === 'WiFi' || typeName === 'BLEDevice' || typeName === 'Adafruit_ST7789' || typeName === 'Adafruit_SSD1306' || typeName === 'Adafruit_BMP280') return _m;
    return `var ${varName} = __createAutoStruct();`;
  });

  // 21. Numbers, Wire/SPI, Pointers & nullptr cleanup
  code = code.replace(/(\d+\.\d+)[fF]\b/g, '$1');
  code = code.replace(/&(?:Wire|SPI)\b/g, (m) => m.substring(1));
  code = code.replace(/(?<=[\(,][ \t]*)&([A-Za-z0-9_]+)/g, '$1');
  code = code.replace(/\bnullptr\b/g, 'null');
  code = code.replace(/\bNULL\b/g, 'null');

  // 22. ONLY strip specific known cast keywords, NEVER arbitrary parentheses
  code = code.replace(/\((?:int|float|double|bool|long|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|char\*?|ScreenMode|ScreenState|SpeciesType)\)/g, '');

  // 23. Clean up redundant declarations
  code = code.replace(/\b(?:var\s+var|var\s+const|const\s+var|const\s+const)\b/g, 'var');
  code = code.replace(/\b(?:var\s+var)\b/g, 'var');

  const structRuntimeHelper = `
function __createAutoStruct() {
  var obj = {
    currentScreen: 0,
    selectedMainMenuIndex: 0,
    selectedPresetIndex: 0,
    activePresetIndex: 0,
    targetSeconds: 300,
    customTempSeconds: 180,
    isTimerRunning: false,
    isOvertime: false,
    timerStartMs: 0,
    elapsedSec: 0,
    castCount: 0,
    catchSpeciesIndex: 0,
    catchTempWeightKg: 1.0,
    selectedCatchStep: 0,
    fishCount: 0,
    totalWeightKg: 0,
    keepnet1Fish: 0,
    keepnet1WeightKg: 0,
    keepnet2Fish: 0,
    keepnet2WeightKg: 0,
    activeKeepnetIndex: 0,
    targetDistanceM: 50,
    tempDistanceM: 50,
    isSessionActive: false,
    sessionStartMs: 0,
    fastestCatchSec: 0,
    selectedSettingIndex: 0,
    brightnessLevel: 3,
    isCountdownMode: true,
    buzzerEnabled: true,
    ledAlertEnabled: true,
    languageIndex: 0,
    rtcBaseEpochSec: 8 * 3600,
    rtcBootMs: 0,
    stopwatch: { isRunning: false, isOvertime: false, targetSeconds: 30, elapsedSeconds: 0, startMillis: 0, lastTickMillis: 0, castCount: 0, castDistance: 50, selectedPresetIndex: 0, setupStep: 0, distPresets: [30, 50, 75], distPresetCount: 3, selectedDistPresetIndex: 1, isFineTuningDist: false },
    stopper: { isRunning: false, isOvertime: false, targetSeconds: 30, elapsedSeconds: 0, startMillis: 0, lastTickMillis: 0, castCount: 0, castDistance: 50, selectedPresetIndex: 0, setupStep: 0, distPresets: [30, 50, 75], distPresetCount: 3, selectedDistPresetIndex: 1, isFineTuningDist: false },
    rods: [{ isRunning: false, isOvertime: false }, { isRunning: false, isOvertime: false }, { isRunning: false, isOvertime: false }, { isRunning: false, isOvertime: false }],
    keepnets: [
      { currentWeight: 0, fishCount: 0, maxWeight: 20, weighedTotal: 0 },
      { currentWeight: 0, fishCount: 0, maxWeight: 25, weighedTotal: 0 },
      { currentWeight: 0, fishCount: 0, maxWeight: 20, weighedTotal: 0 },
      { currentWeight: 0, fishCount: 0, maxWeight: 25, weighedTotal: 0 }
    ],
    sensors: { temperature: 24.5, pressure: 1013.8, batteryPercent: 95, batteryVolts: 4.12, isBmpAvailable: false }
  };
  var handler = {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON' || prop === 'valueOf') return undefined;
      target[prop] = __createAutoStruct();
      return target[prop];
    }
  };
  return typeof Proxy !== 'undefined' ? new Proxy(obj, handler) : obj;
}
`;

  logger.debug('VM', 'Transpilation completed successfully.');
  return structRuntimeHelper + '\n' + code;
}
