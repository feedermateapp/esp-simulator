import JSZip from 'jszip';
import { ESPProject } from '../types/esp32';

export class ProjectExporter {
  /**
   * Generates a complete Arduino IDE compatible sketch bundle as a ready-to-unzip .zip file.
   */
  public static async exportToArduinoZip(project: ESPProject): Promise<Blob> {
    const zip = new JSZip();
    const folderName = project.metadata.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const folder = zip.folder(folderName) || zip;

    // All source files
    for (const file of project.files) {
      folder.file(file.name, file.content);
    }

    // Circuit JSON & Wiring Guide
    folder.file('circuit.json', JSON.stringify(project.circuit, null, 2));
    folder.file('WIRING_GUIDE.md', this.generateWiringMarkdown(project));

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  /**
   * Generates a complete PlatformIO project structure as a ready-to-use .zip file.
   */
  public static async exportToPlatformIOZip(project: ESPProject): Promise<Blob> {
    const zip = new JSZip();
    const folderName = project.metadata.name.replace(/[^a-zA-Z0-9_]/g, '_') + '_pio';
    const folder = zip.folder(folderName) || zip;

    // platformio.ini
    const platformioIni = `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
    adafruit/Adafruit SSD1306 @ ^2.5.9
    adafruit/Adafruit GFX Library @ ^1.11.9
    adafruit/Adafruit ST7735 and ST7789 Library @ ^1.10.4
    adafruit/Adafruit BMP280 Library @ ^2.6.8
    knolleary/PubSubClient @ ^2.8
`;

    folder.file('platformio.ini', platformioIni);

    const srcFolder = folder.folder('src') || folder;
    const includeFolder = folder.folder('include') || folder;

    // Source files
    for (const file of project.files) {
      if (file.name.endsWith('.h') || file.name.endsWith('.hpp')) {
        includeFolder.file(file.name, file.content);
      } else {
        const destName = file.name.endsWith('.ino') ? file.name.replace('.ino', '.cpp') : file.name;
        srcFolder.file(destName, file.content);
      }
    }

    // Wiring Guide and circuit.json
    folder.file('circuit.json', JSON.stringify(project.circuit, null, 2));
    folder.file('WIRING_GUIDE.md', this.generateWiringMarkdown(project));

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  /**
   * Triggers browser download of a Blob file.
   */
  public static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Generates `.espproj` JSON content.
   */
  public static exportToJson(project: ESPProject): string {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Generates a clear markdown wiring guide from circuit.json.
   */
  public static generateWiringMarkdown(project: ESPProject): string {
    let md = `# Áramköri Bekötési Útmutató (Wiring Guide)\n\n`;
    md += `**Projekt:** ${project.metadata.name}\n`;
    md += `**Célhardver:** ${project.circuit.board}\n\n`;
    md += `## Csatlakoztatott Perifériák és Lábkiosztás\n\n`;
    md += `| Periféria | Típus | Lábak (Pins) | Egyéb Beállítások |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    for (const p of project.circuit.peripherals) {
      const pinStr = Object.entries(p.pins)
        .map(([name, pin]) => `**${name.toUpperCase()}**: GPIO ${pin}`)
        .join(', ');
      
      const configStr = p.config ? JSON.stringify(p.config) : '-';
      md += `| **${p.name}** | \`${p.type}\` | ${pinStr} | ${configStr} |\n`;
    }

    md += `\n---\n*Generálva az ESP32 Desktop Hardware Simulator segítségével.*\n`;
    return md;
  }
}
