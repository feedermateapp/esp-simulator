import React, { useState, useEffect } from 'react';
import { ESPProject, SimulationState, GPIOPinState, SerialMessage, WaveformSample } from './types/esp32';
import { projectManager } from './project/projectManager';
import { esp32Engine } from './core/esp32Engine';
import { gpioManager } from './core/gpioManager';
import { bmp280 } from './core/devices/bmp280';
import { ssd1306 } from './core/devices/ssd1306';
import { st7789 } from './core/devices/st7789';
import { rotaryEncoder } from './core/devices/rotaryEncoder';
import { TopBar, WorkspaceViewMode } from './components/TopBar';
import { ProjectSidebar } from './components/ProjectSidebar';
import { EditorView } from './components/EditorView';
import { BottomDock } from './components/BottomDock';
import { HardwareWorkbench } from './components/HardwareWorkbench';
import { TemplateModal } from './components/TemplateModal';
import { CircuitModal } from './components/CircuitModal';
import { HardwareSerialModal } from './components/HardwareSerialModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { hardwareSerial } from './core/hardwareSerial';
import { i2cBus } from './core/i2cBus';

export const App: React.FC = () => {
  // View Layout Mode ('split' | 'hardware' | 'code')
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('split');

  // Project State
  const [project, setProject] = useState<ESPProject>(projectManager.getProject());
  const [activeFileId, setActiveFileId] = useState<string>(project.activeFileId);

  // Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>(esp32Engine.getState());
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Modals
  const [isProjectManagerModalOpen, setIsProjectManagerModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isCircuitModalOpen, setIsCircuitModalOpen] = useState<boolean>(false);
  const [isHardwareSerialModalOpen, setIsHardwareSerialModalOpen] = useState<boolean>(false);

  // Hardware State
  const [rotaryPosition, setRotaryPosition] = useState<number>(0);
  const [isRotaryPressed, setIsRotaryPressed] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(bmp280.temperature);
  const [pressure, setPressure] = useState<number>(bmp280.pressure / 100.0);
  const [frameBuffer, setFrameBuffer] = useState<Uint8Array | null>(null);
  const [colorFrameBuffer, setColorFrameBuffer] = useState<Uint8ClampedArray | null>(null);
  const [buttonStates, setButtonStates] = useState<Record<number, boolean>>({ 4: false, 5: false });
  const [ledStates, setLedStates] = useState<Record<number, { on: boolean; pwm: number }>>({
    2: { on: false, pwm: 0 }
  });
  const [gpioStates, setGpioStates] = useState<Map<number, GPIOPinState>>(gpioManager.getAllPinStates());
  const [serialLogs, setSerialLogs] = useState<SerialMessage[]>([
    {
      id: 'init_1',
      timestamp: Date.now(),
      type: 'SYSTEM',
      text: 'ESP32 Virtual MCU Ready. Kattints a Run gombra a szimuláció indításához!'
    }
  ]);
  const [waveformSamples] = useState<WaveformSample[]>([]);

  // Subscribe to project updates
  useEffect(() => {
    const unsubscribe = projectManager.subscribe((updatedProject) => {
      setProject({ ...updatedProject });
      setActiveFileId(updatedProject.activeFileId);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Engine, GPIO, and Display devices
  useEffect(() => {
    const unEngine = esp32Engine.onStateChange(st => setSimulationState(st));
    const unSerial = esp32Engine.onSerialMessage(msg => setSerialLogs(prev => [...prev.slice(-200), msg]));
    const unOled = ssd1306.onFrameUpdate(buf => setFrameBuffer(new Uint8Array(buf)));
    const unSt7789 = st7789.onFrameUpdate(buf => setColorFrameBuffer(new Uint8ClampedArray(buf)));
    
    const unGpio = gpioManager.onPinChange((pin, st) => {
      setGpioStates(prev => {
        const next = new Map(prev);
        next.set(pin, st);
        return next;
      });

      setLedStates(prev => ({
        ...prev,
        [pin]: { on: st.digitalValue === 1, pwm: st.pwmDuty }
      }));
    });

    // Bridge physical Web Serial incoming data to the Serial Monitor
    const unHwSerial = hardwareSerial.subscribe({
      onData: (text) => {
        setSerialLogs(prev => [
          ...prev.slice(-200),
          {
            id: 'hw_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            timestamp: Date.now(),
            type: 'RX',
            text: text.replace(/\r?\n$/, '')
          }
        ]);
      }
    });

    return () => {
      unEngine();
      unSerial();
      unOled();
      unSt7789();
      unGpio();
      unHwSerial();
    };
  }, []);

  // Sync peripheral pins with physical device wrappers
  useEffect(() => {
    const rotary = project.circuit.peripherals.find(p => p.type === 'KY040_ROTARY_ENCODER');
    if (rotary?.pins) {
      rotaryEncoder.configurePins(
        rotary.pins.clk ?? 19,
        rotary.pins.dt ?? 21,
        rotary.pins.sw ?? 22
      );
    }

    const hasBmp = project.circuit.peripherals.some(p => p.type === 'BMP280_BAROMETER');
    if (hasBmp) {
      if (!i2cBus.getDevice(0x76)) {
        i2cBus.registerDevice(bmp280);
      }
    } else {
      i2cBus.unregisterDevice(0x76);
    }
  }, [project]);

  // Handlers for Simulation Execution
  const handleStartSimulation = () => {
    const mainFile = project.files.find(f => f.name.endsWith('.ino')) || project.files.find(f => f.name.endsWith('.cpp')) || project.files[0];
    if (mainFile) {
      esp32Engine.start(mainFile.content, project.files);
    }
  };

  const handlePauseSimulation = () => {
    esp32Engine.pause();
  };

  const handleResetSimulation = () => {
    esp32Engine.reset();
    setRotaryPosition(0);
  };

  const handleStepSimulation = () => {
    esp32Engine.step();
  };

  const handleSpeedChange = (spd: number) => {
    setSpeedMultiplier(spd);
    esp32Engine.setSpeedMultiplier(spd);
  };

  // Hardware Controls
  const handleRotate = (direction: 'CW' | 'CCW') => {
    rotaryEncoder.rotate(direction);
    setRotaryPosition(rotaryEncoder.getPosition());
  };

  const handleRotaryButtonPress = () => {
    setIsRotaryPressed(true);
    rotaryEncoder.pressButton();
  };

  const handleRotaryButtonRelease = () => {
    setIsRotaryPressed(false);
    rotaryEncoder.releaseButton();
  };

  const handleTemperatureChange = (newTemp: number) => {
    setTemperature(newTemp);
    bmp280.setEnvironmentalData(newTemp, pressure);
  };

  const handlePressureChange = (newPress: number) => {
    setPressure(newPress);
    bmp280.setEnvironmentalData(temperature, newPress);
  };

  const handleButtonPress = (pin: number) => {
    setButtonStates(prev => ({ ...prev, [pin]: true }));
    gpioManager.writeDigital(pin, 0); // Active LOW with pullup
  };

  const handleButtonRelease = (pin: number) => {
    setButtonStates(prev => ({ ...prev, [pin]: false }));
    gpioManager.writeDigital(pin, 1);
  };

  const handleSendSerialCommand = (cmd: string) => {
    setSerialLogs(prev => [
      ...prev,
      { id: 'tx_' + Date.now(), timestamp: Date.now(), type: 'TX', text: cmd }
    ]);
    if (hardwareSerial.getState() === 'CONNECTED') {
      hardwareSerial.write(cmd + '\n');
    }
  };

  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    projectManager.setActiveFile(fileId);
  };

  const activeFile = project.files.find(f => f.id === activeFileId) || project.files[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Felső Vezérlősáv (TopBar) */}
      <TopBar
        project={project}
        simulationState={simulationState}
        speedMultiplier={speedMultiplier}
        viewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m)}
        onStartSimulation={handleStartSimulation}
        onPauseSimulation={handlePauseSimulation}
        onResetSimulation={handleResetSimulation}
        onStepSimulation={handleStepSimulation}
        onSpeedChange={handleSpeedChange}
        onOpenProjectManagerModal={() => setIsProjectManagerModalOpen(true)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onOpenCircuitModal={() => setIsCircuitModalOpen(true)}
        onOpenHardwareSerialModal={() => setIsHardwareSerialModalOpen(true)}
      />

      {/* 2. Középső Fő Munkaterület */}
      <div className="flex-1 flex overflow-hidden">
        {/* WORKBENCH (HARDVER LABOR) FÓKUSZ MÓD */}
        {viewMode === 'hardware' && (
          <HardwareWorkbench
            project={project}
            viewMode="workbench"
            onToggleViewMode={() => setViewMode('split')}
            frameBuffer={frameBuffer}
            colorFrameBuffer={colorFrameBuffer}
            rotaryPosition={rotaryPosition}
            isRotaryPressed={isRotaryPressed}
            onRotate={handleRotate}
            onRotaryButtonPress={handleRotaryButtonPress}
            onRotaryButtonRelease={handleRotaryButtonRelease}
            temperature={temperature}
            pressure={pressure}
            onTemperatureChange={handleTemperatureChange}
            onPressureChange={handlePressureChange}
            buttonStates={buttonStates}
            onButtonPress={handleButtonPress}
            onButtonRelease={handleButtonRelease}
            ledStates={ledStates}
            gpioStates={gpioStates}
          />
        )}

        {/* KÓD ÉS OSZTOTT NÉZET MÓD */}
        {viewMode !== 'hardware' && (
          <>
            {/* Bal oldali Project Explorer sáv */}
            <ProjectSidebar
              project={project}
              activeFileId={activeFileId}
              onSelectFile={handleSelectFile}
              onOpenCircuitModal={() => setIsCircuitModalOpen(true)}
              onOpenProjectManagerModal={() => setIsProjectManagerModalOpen(true)}
            />

            {/* Középső Monaco Multi-Tab Kódszerkesztő */}
            <EditorView
              project={project}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
            />

            {/* Jobb oldali Vizuális Periféria és Áramköri Műszerfal (Csak Split módban) */}
            {viewMode === 'split' && (
              <HardwareWorkbench
                project={project}
                viewMode="sidebar"
                onToggleViewMode={() => setViewMode('hardware')}
                frameBuffer={frameBuffer}
                colorFrameBuffer={colorFrameBuffer}
                rotaryPosition={rotaryPosition}
                isRotaryPressed={isRotaryPressed}
                onRotate={handleRotate}
                onRotaryButtonPress={handleRotaryButtonPress}
                onRotaryButtonRelease={handleRotaryButtonRelease}
                temperature={temperature}
                pressure={pressure}
                onTemperatureChange={handleTemperatureChange}
                onPressureChange={handlePressureChange}
                buttonStates={buttonStates}
                onButtonPress={handleButtonPress}
                onButtonRelease={handleButtonRelease}
                ledStates={ledStates}
                gpioStates={gpioStates}
              />
            )}
          </>
        )}
      </div>

      {/* 3. Alsó Dokkoló Panel (Soros Monitor, Waveform, Wireless, Pinout) */}
      <BottomDock
        serialLogs={serialLogs}
        onSendSerialCommand={handleSendSerialCommand}
        onClearSerialLogs={() => setSerialLogs([])}
        waveformSamples={waveformSamples}
        gpioStates={gpioStates}
      />

      {/* Modals */}
      <ProjectManagerModal
        isOpen={isProjectManagerModalOpen}
        onClose={() => setIsProjectManagerModalOpen(false)}
        currentProject={project}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <CircuitModal
        project={project}
        isOpen={isCircuitModalOpen}
        onClose={() => setIsCircuitModalOpen(false)}
      />

      <HardwareSerialModal
        project={project}
        isOpen={isHardwareSerialModalOpen}
        onClose={() => setIsHardwareSerialModalOpen(false)}
      />
    </div>
  );
};
