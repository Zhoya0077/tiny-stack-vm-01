// Tiny stack VM for make.fun tiny-stack-vm-01 (ISA v1). For each
// $MAKEFUN_INPUT_DIR/<id>/{program,input}.bin it writes
// $MAKEFUN_OUTPUT_DIR/<id>/{stdout.bin,exit.txt}. 32-bit wrapping ints,
// 256-value stack, 64-deep call stack, 256 words of memory, ten traps.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ID = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OD = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// Per opcode: [immediate bytes, pops, pushes].
const T: Record<number, [number, number, number]> = {0:[0,0,0],1:[1,0,1],2:[4,0,1],3:[0,1,0],4:[0,1,2],5:[0,2,2],6:[0,2,3],7:[0,3,3],16:[0,2,1],17:[0,2,1],18:[0,2,1],19:[0,2,1],20:[0,2,1],21:[0,2,1],22:[0,2,1],23:[0,1,1],24:[0,2,1],25:[0,2,1],26:[0,2,1],27:[0,1,1],28:[0,2,1],29:[0,2,1],30:[0,2,1],31:[0,2,1],32:[0,2,1],33:[0,2,1],34:[0,2,1],48:[2,0,0],49:[2,1,0],50:[2,1,0],51:[2,0,0],52:[0,0,0],64:[0,1,1],65:[0,2,0],80:[0,1,0],81:[0,1,0],82:[0,0,1],83:[0,1,0]};

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; exit: number } {
  const s = new Int32Array(256);
  let sp = 0;
  const c = new Int32Array(64);
  let cp = 0;
  const m = new Int32Array(256);
  const b = new Uint8Array(65536);
  let bl = 0, ip = 0, pc = 0, steps = 0;
  const n = p.length;
  const done = (e: number) => ({ out: b.slice(0, bl), exit: e });
  for (;;) {
    // ISA.md "One step", in order: step limit, pc range, opcode, immediate.
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    const t = T[op];
    if (t === undefined) return done(5);
    if (pc + t[0] >= n) return done(9);
    steps++;
    const nx = pc + 1 + t[0];
    if (sp < t[1]) return done(2);
    if (sp - t[1] + t[2] > 256) return done(3);
    pc = nx;
    switch (op) {
      case 0: return done(0); // HALT
      case 1: s[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8 sign-extended
      case 2: s[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break; // PUSH32
      case 3: sp--; break; // POP
      case 4: s[sp] = s[sp - 1]; sp++; break; // DUP
      case 5: { const v = s[sp - 1]; s[sp - 1] = s[sp - 2]; s[sp - 2] = v; break; } // SWAP
      case 6: s[sp] = s[sp - 2]; sp++; break; // OVER
      case 7: { const a = s[sp - 3]; s[sp - 3] = s[sp - 2]; s[sp - 2] = s[sp - 1]; s[sp - 1] = a; break; } // ROT
      case 23: s[sp - 1] = -s[sp - 1] | 0; break; // NEG wraps
      case 27: s[sp - 1] = ~s[sp - 1]; break; // NOT
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24:
      case 25: case 26: case 28: case 29: case 30: case 31: case 32: case 33: case 34: {
        const y = s[sp - 1], x = s[sp - 2];
        let r: number;
        switch (op) {
          case 16: r = (x + y) | 0; break; // ADD
          case 17: r = (x - y) | 0; break; // SUB
          case 18: r = Math.imul(x, y); break; // MUL low 32 bits exactly
          case 19: // DIV signed toward zero; b = 0 traps 4
            if (y === 0) return done(4);
            r = x === -2147483648 && y === -1 ? x : (x / y) | 0;
            break;
          case 20: // MOD sign of a; b = 0 traps 4; x % -1 is 0
            if (y === 0) return done(4);
            r = y === -1 ? 0 : (x % y) | 0;
            break;
          case 21: // DIVU unsigned quotient, read back signed
            if (y === 0) return done(4);
            r = Math.floor((x >>> 0) / (y >>> 0)) | 0;
            break;
          case 22: // MODU unsigned remainder, read back signed
            if (y === 0) return done(4);
            r = ((x >>> 0) % (y >>> 0)) | 0;
            break;
          case 24: r = x & y; break; // AND
          case 25: r = x | y; break; // OR
          case 26: r = x ^ y; break; // XOR
          case 28: r = x << (y & 31); break; // SHL
          case 29: r = x >> (y & 31); break; // SHR arithmetic
          case 30: r = (x >>> (y & 31)) | 0; break; // SHRU logical
          case 32: r = x === y ? 1 : 0; break; // EQ
          case 33: r = x < y ? 1 : 0; break; // LT signed
          default: r = x >>> 0 < (y >>> 0) ? 1 : 0; break; // LTU unsigned
        }
        sp -= 2;
        s[sp++] = r;
        break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) {
          const v = s[--sp];
          take = op === 49 ? v === 0 : v !== 0;
        }
        if (take) pc = nx + rel;
        break;
      }
      case 51: // CALL: 64 held traps 7
        if (cp === 64) return done(7);
        c[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52: // RET: empty call stack traps 8
        if (cp === 0) return done(8);
        pc = c[--cp];
        break;
      case 64: { // LOAD
        const a = s[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        s[sp - 1] = m[a];
        break;
      }
      case 65: { // STORE: ( v addr -- )
        const a = s[sp - 1], v = s[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2;
        m[a] = v;
        break;
      }
      case 80: { // PRINT decimal ASCII; over the limit traps 11
        const d = String(s[sp - 1]);
        if (bl + d.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < d.length; i++) b[bl++] = d.charCodeAt(i);
        break;
      }
      case 81: // PUTC one byte, v AND 255; over the limit traps 11
        if (bl + 1 > 65536) return done(11);
        b[bl++] = s[--sp] & 255;
        break;
      case 82: // IN: next input byte, -1 once used up (and after)
        s[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      default: // 83 EXIT: exit code is v AND 255
        return done(s[--sp] & 255);
    }
  }
}

for (const id of readdirSync(ID).sort()) {
  const r = run(readFileSync(join(ID, id, 'program.bin')), readFileSync(join(ID, id, 'input.bin')));
  mkdirSync(join(OD, id), { recursive: true });
  writeFileSync(join(OD, id, 'stdout.bin'), r.out);
  writeFileSync(join(OD, id, 'exit.txt'), r.exit + '\n');
}
