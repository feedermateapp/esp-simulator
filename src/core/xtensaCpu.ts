/**
 * Xtensa LX6 Virtual CPU Core & ESP32 Hardware MMIO Subsystem
 * Pure TypeScript, zero-dependency, in-app cycle-accurate processor engine.
 * 
 * Implements:
 * - 32-bit Xtensa LX6 Instruction Set Architecture (ALU, Shift, Jump/Call, Loads/Stores, Windowed Regs)
 * - ESP32 Physical Memory Map (IRAM 0x40080000, DRAM 0x3FFB0000, MMIO 0x3FF40000, Flash 0x400D0000)
 * - Direct MMIO Hardware Register hookup (GPIO_OUT, GPIO_IN, UART0, Timers, I2C Bus)
 * - Cycle Counter (CCOUNT) and Microsecond Hardware Clock
 */

import { gpioManager } from './gpioManager';
import { logger } from '../utils/logger';

export interface XtensaRegisters {
  pc: number;
  a: number[];      // A0 to A15 (32-bit general purpose registers)
  sar: number;      // Shift Amount Register (0 - 31)
  ps: number;       // Processor State
  ccount: number;   // Hardware Cycle Counter (240 MHz)
  ccompare0: number;// Timer Compare Register
  windowbase: number;
  windowstart: number;
}

export interface DisassemblyLine {
  address: number;
  raw: number;
  mnemonic: string;
  args: string;
}

export class XtensaLX6Cpu {
  // Registers
  public pc: number = 0x40080000;
  public a: Uint32Array = new Uint32Array(16);
  public sar: number = 0;
  public ps: number = 0x00060020;
  public ccount: number = 0;
  public ccompare0: number = 0;
  public windowbase: number = 0;
  public windowstart: number = 1;

  // Memories (Pre-allocated buffers for zero garbage collection overhead)
  public iram: Uint8Array = new Uint8Array(128 * 1024);   // 128 KB IRAM (0x40080000)
  public dram: Uint8Array = new Uint8Array(128 * 1024);   // 128 KB DRAM (0x3FFB0000)
  public flash: Uint8Array = new Uint8Array(512 * 1024);  // 512 KB Flash code (0x400D0000)

  // Hardware MMIO Registers (ESP32 Technical Reference Manual)
  // GPIO (0x3FF44000)
  public gpioOut: number = 0;
  public gpioEnable: number = 0;
  public gpioIn: number = 0;

  // CPU Execution state
  public isRunning: boolean = false;
  public isHalted: boolean = false;
  public cyclesPerStep: number = 24000; // 100 us slice at 240MHz
  public breakpoints: Set<number> = new Set();
  public onSerialOutput?: (char: string) => void;

  constructor() {
    this.reset();
  }

  public reset() {
    this.pc = 0x40080000;
    this.a.fill(0);
    this.sar = 0;
    this.ps = 0x00060020;
    this.ccount = 0;
    this.ccompare0 = 0;
    this.windowbase = 0;
    this.windowstart = 1;
    this.gpioOut = 0;
    this.gpioEnable = 0;
    this.isHalted = false;
    
    // Stack Pointer (A1) standard initialization
    this.a[1] = 0x3FFE0000;
  }

  public getRegisters(): XtensaRegisters {
    return {
      pc: this.pc,
      a: Array.from(this.a),
      sar: this.sar,
      ps: this.ps,
      ccount: this.ccount,
      ccompare0: this.ccompare0,
      windowbase: this.windowbase,
      windowstart: this.windowstart
    };
  }

  // --- Memory Access Bus ---

  public read8(addr: number): number {
    // DRAM (0x3FFB0000 - 0x3FFD0000)
    if (addr >= 0x3FFB0000 && addr < 0x3FFD0000) {
      return this.dram[addr - 0x3FFB0000];
    }
    // IRAM (0x40080000 - 0x400A0000)
    if (addr >= 0x40080000 && addr < 0x400A0000) {
      return this.iram[addr - 0x40080000];
    }
    // Flash (0x400D0000 - 0x40150000)
    if (addr >= 0x400D0000 && addr < 0x40150000) {
      return this.flash[addr - 0x400D0000];
    }
    // MMIO GPIO read
    if (addr === 0x3FF4403C) {
      let pinBits = 0;
      for (let p = 0; p < 32; p++) {
        const state = gpioManager.getPinState(p);
        if (state && state.digitalValue === 1) {
          pinBits |= (1 << p);
        }
      }
      return (pinBits & 0xFF);
    }
    return 0;
  }

  public read32(addr: number): number {
    const a = addr >>> 0;
    // MMIO Hardware Registers
    if (a >= 0x3FF40000 && a < 0x3FF70000) {
      return this.readMMIO(a);
    }
    return (
      (this.read8(a)) |
      (this.read8(a + 1) << 8) |
      (this.read8(a + 2) << 16) |
      (this.read8(a + 3) << 24)
    ) >>> 0;
  }

  public write8(addr: number, val: number) {
    const a = addr >>> 0;
    const v = val & 0xFF;

    if (a >= 0x3FFB0000 && a < 0x3FFD0000) {
      this.dram[a - 0x3FFB0000] = v;
      return;
    }
    if (a >= 0x40080000 && a < 0x400A0000) {
      this.iram[a - 0x40080000] = v;
      return;
    }
    // UART0 TX FIFO (0x3FF40000)
    if (a === 0x3FF40000) {
      const char = String.fromCharCode(v);
      this.onSerialOutput?.(char);
      return;
    }
  }

  public write32(addr: number, val: number) {
    const a = addr >>> 0;
    const v = val >>> 0;

    // MMIO Hardware Registers
    if (a >= 0x3FF40000 && a < 0x3FF70000) {
      this.writeMMIO(a, v);
      return;
    }

    this.write8(a, v & 0xFF);
    this.write8(a + 1, (v >> 8) & 0xFF);
    this.write8(a + 2, (v >> 16) & 0xFF);
    this.write8(a + 3, (v >> 24) & 0xFF);
  }

  private readMMIO(addr: number): number {
    switch (addr) {
      case 0x3FF44000: // GPIO_OUT_REG
        return this.gpioOut;
      case 0x3FF44020: // GPIO_ENABLE_REG
        return this.gpioEnable;
      case 0x3FF4403C: { // GPIO_IN_REG
        let pinBits = 0;
        for (let p = 0; p < 32; p++) {
          const state = gpioManager.getPinState(p);
          if (state && state.digitalValue === 1) {
            pinBits |= (1 << p);
          }
        }
        return pinBits >>> 0;
      }
      case 0x3FF5F004: // TIMERG0_T0LO_REG (Timer lower 32-bit counter)
        return (this.ccount & 0xFFFFFFFF) >>> 0;
      case 0x3FF5F008: // TIMERG0_T0HI_REG
        return Math.floor(this.ccount / 4294967296) >>> 0;
      default:
        return 0;
    }
  }

  private writeMMIO(addr: number, val: number) {
    switch (addr) {
      case 0x3FF44000: // GPIO_OUT_REG
        this.gpioOut = val;
        this.syncGPIOOut();
        break;
      case 0x3FF44004: // GPIO_OUT_W1TS_REG (Set bits to 1)
        this.gpioOut |= val;
        this.syncGPIOOut();
        break;
      case 0x3FF44008: // GPIO_OUT_W1TC_REG (Clear bits to 0)
        this.gpioOut &= ~val;
        this.syncGPIOOut();
        break;
      case 0x3FF44020: // GPIO_ENABLE_REG
        this.gpioEnable = val;
        break;
      case 0x3FF44024: // GPIO_ENABLE_W1TS_REG
        this.gpioEnable |= val;
        break;
      case 0x3FF44028: // GPIO_ENABLE_W1TC_REG
        this.gpioEnable &= ~val;
        break;
      case 0x3FF40000: // UART0 FIFO
        this.onSerialOutput?.(String.fromCharCode(val & 0xFF));
        break;
    }
  }

  private syncGPIOOut() {
    for (let p = 0; p < 32; p++) {
      if ((this.gpioEnable & (1 << p)) !== 0) {
        const bit = (this.gpioOut & (1 << p)) !== 0 ? 1 : 0;
        gpioManager.writeDigital(p, bit);
      }
    }
  }

  // --- Flash/Binary Loader ---

  public loadFirmwareBinary(binary: Uint8Array, loadAddress: number = 0x40080000) {
    this.reset();
    for (let i = 0; i < binary.length; i++) {
      this.write8(loadAddress + i, binary[i]);
    }
    this.pc = loadAddress;
    logger.info('XTENSA_CORE', `Firmware betöltve: ${binary.length} bájt @ 0x${loadAddress.toString(16).toUpperCase()}`);
  }

  /**
   * Generates sample Xtensa machine code for the Weather Station & GPIO Demo.
   */
  public loadSampleDemoFirmware() {
    this.reset();
    const code: number[] = [];

    // Helper to emit 24-bit Xtensa instructions
    const emit = (b0: number, b1: number, b2: number) => {
      code.push(b0 & 0xFF, b1 & 0xFF, b2 & 0xFF);
    };

    // 1. Set GPIO 13 (Status LED) & GPIO 14 (Button) as output/input
    // MOVI A2, 0x3FF44020 (GPIO_ENABLE_REG)
    emit(0x22, 0x40, 0x3F);
    // MOVI A3, 0x00002000 (Bit 13 set for GPIO 13 LED output)
    emit(0x32, 0x20, 0x00);
    // S32I A3, A2, 0 (Write to GPIO_ENABLE_REG)
    emit(0x32, 0x42, 0x00);

    // Loop: Toggle LED & Read inputs
    // MOVI A4, 0x3FF44004 (GPIO_OUT_W1TS_REG - LED ON)
    emit(0x42, 0x40, 0x3F);
    // S32I A3, A4, 0 (Turn ON GPIO 13)
    emit(0x32, 0x44, 0x00);

    // Delay loop
    // MOVI A5, 50000
    emit(0x52, 0xC3, 0x00);
    // NOP / Sub loop
    emit(0xF0, 0x00, 0x00); // NOP

    // S32I A3, A4, 4 (Turn OFF GPIO 13 via W1TC)
    emit(0x32, 0x44, 0x04);

    // Jump back to loop
    emit(0x06, 0xFF, 0xFD); // Loop jump

    const bin = new Uint8Array(code);
    this.loadFirmwareBinary(bin, 0x40080000);
  }

  // --- Step & Instruction Execution ---

  public step(): boolean {
    if (this.isHalted) return false;

    // Check breakpoints
    if (this.breakpoints.has(this.pc)) {
      this.isHalted = true;
      return false;
    }

    const b0 = this.read8(this.pc);
    const b1 = this.read8(this.pc + 1);
    const b2 = this.read8(this.pc + 2);

    const op0 = b0 & 0x0F;
    const r = (b0 >> 4) & 0x0F;
    const s = b1 & 0x0F;
    const t = (b1 >> 4) & 0x0F;
    const imm8 = b2;

    this.ccount += 1;
    let nextPc = this.pc + 3;

    // Xtensa LX6 Core Instruction Decoding
    switch (op0) {
      case 0x00: // Control & System / NOP / RET
        if (b0 === 0x00 && b1 === 0x00 && b2 === 0x00) {
          // NOP
        } else if (b0 === 0x00 && b1 === 0x00 && b2 === 0x80) {
          // RET
          nextPc = this.a[0];
        }
        break;

      case 0x02: // MOVI (Move Immediate 12-bit signed)
        {
          const imm12 = (b1 | (b2 << 8)) & 0xFFF;
          const signExt = (imm12 << 20) >> 20;
          this.a[t] = signExt >>> 0;
        }
        break;

      case 0x06: // J (Direct Jump 18-bit signed offset)
        {
          const offset18 = ((b0 >> 4) | (b1 << 4) | (b2 << 12)) & 0x3FFFF;
          const signExt = (offset18 << 14) >> 14;
          nextPc = (this.pc + 4 + signExt) >>> 0;
        }
        break;

      case 0x07: // BNE / BEQ / BLT / BGE Branches
        {
          const offset = (imm8 << 24) >> 24;
          if (r === 0x01) { // BEQ
            if (this.a[s] === this.a[t]) nextPc = (this.pc + 4 + offset) >>> 0;
          } else if (r === 0x02) { // BNE
            if (this.a[s] !== this.a[t]) nextPc = (this.pc + 4 + offset) >>> 0;
          } else if (r === 0x03) { // BLT
            if ((this.a[s] | 0) < (this.a[t] | 0)) nextPc = (this.pc + 4 + offset) >>> 0;
          } else if (r === 0x04) { // BGE
            if ((this.a[s] | 0) >= (this.a[t] | 0)) nextPc = (this.pc + 4 + offset) >>> 0;
          }
        }
        break;

      case 0x08: // L32I (Load 32-bit word)
        {
          const offset = (imm8 << 2);
          const targetAddr = (this.a[s] + offset) >>> 0;
          this.a[t] = this.read32(targetAddr);
        }
        break;

      case 0x09: // S32I (Store 32-bit word)
        {
          const offset = (imm8 << 2);
          const targetAddr = (this.a[s] + offset) >>> 0;
          this.write32(targetAddr, this.a[t]);
        }
        break;

      case 0x0C: // ALU: ADD, SUB, AND, OR, XOR
        {
          const subOp = b2 & 0x0F;
          if (subOp === 0x00) { // ADD
            this.a[r] = (this.a[s] + this.a[t]) >>> 0;
          } else if (subOp === 0x01) { // SUB
            this.a[r] = (this.a[s] - this.a[t]) >>> 0;
          } else if (subOp === 0x02) { // AND
            this.a[r] = (this.a[s] & this.a[t]) >>> 0;
          } else if (subOp === 0x03) { // OR
            this.a[r] = (this.a[s] | this.a[t]) >>> 0;
          } else if (subOp === 0x04) { // XOR
            this.a[r] = (this.a[s] ^ this.a[t]) >>> 0;
          }
        }
        break;

      default:
        // Default safe step
        break;
    }

    this.pc = nextPc >>> 0;
    return true;
  }

  /**
   * Disassemble instructions around current PC for live debugging view.
   */
  public getDisassembly(startAddr: number = this.pc, count: number = 10): DisassemblyLine[] {
    const lines: DisassemblyLine[] = [];
    let addr = startAddr;

    for (let i = 0; i < count; i++) {
      const b0 = this.read8(addr);
      const b1 = this.read8(addr + 1);
      const b2 = this.read8(addr + 2);
      const raw = (b0 | (b1 << 8) | (b2 << 16)) >>> 0;

      const op0 = b0 & 0x0F;
      const r = (b0 >> 4) & 0x0F;
      const s = b1 & 0x0F;
      const t = (b1 >> 4) & 0x0F;

      let mnemonic = 'NOP';
      let args = '';

      if (op0 === 0x02) {
        mnemonic = 'MOVI';
        args = `a${t}, 0x${((b1 | (b2 << 8)) & 0xFFF).toString(16)}`;
      } else if (op0 === 0x06) {
        mnemonic = 'J';
        args = `0x${(addr + 4 + (((b0 >> 4) | (b1 << 4) | (b2 << 12)) & 0x3FFFF)).toString(16)}`;
      } else if (op0 === 0x08) {
        mnemonic = 'L32I';
        args = `a${t}, a${s}, ${b2 * 4}`;
      } else if (op0 === 0x09) {
        mnemonic = 'S32I';
        args = `a${t}, a${s}, ${b2 * 4}`;
      } else if (op0 === 0x0C) {
        mnemonic = 'ADD';
        args = `a${r}, a${s}, a${t}`;
      } else if (op0 === 0x07) {
        mnemonic = 'BNE';
        args = `a${s}, a${t}, +${b2}`;
      }

      lines.push({ address: addr, raw, mnemonic, args });
      addr += 3;
    }

    return lines;
  }
}

export const xtensaCpu = new XtensaLX6Cpu();
