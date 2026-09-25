import { describe, it } from 'node:test';
import assert from 'node:assert';
import './test_helpers';
import { ParseAndValidate } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import { DataModel, Instruction, InstructionType } from '../core/model';
import { ExplainInstruction } from '../core/explainer';
import { TransformStackFrames } from '../core/uitransformation';

// ---------------------------------------------------------------------------------------------
// Reference: procedure `interpret` of Wirth's PL/0 compiler (Algorithms + Data Structures =
// Programs, http://www.standardpascal.org/plzero.pas), translated literally. The only change is
// the index origin of the stack: Pascal's s[1..] is s[0..] here (t := 0, b := 1 become -1, 0),
// matching the simulator. Operations use Wirth's numbering (OPR 0 0 = return, OPR 0 6 = odd).
// ---------------------------------------------------------------------------------------------

type Fct = 'lit' | 'opr' | 'lod' | 'sto' | 'cal' | 'int' | 'jmp' | 'jpc';
interface WInstr {
    f: Fct;
    l: number;
    a: number;
}

class WirthMachine {
    // s: array [1..stacksize] of integer - preallocated (zeroed) like the simulator's fresh cells
    s: number[] = new Array(2000).fill(0);
    t = -1;
    b = 0;
    p = 0;
    halted = false;
    // Wirth's STO prints every stored value (writeln(s[t])) - the only output of the original
    printed: number[] = [];

    constructor(private code: WInstr[]) {}

    private base(l: number): number {
        let b1 = this.b;
        while (l > 0) {
            b1 = this.s[b1];
            l = l - 1;
        }
        return b1;
    }

    step() {
        const s = this.s;
        const i = this.code[this.p];
        this.p = this.p + 1;
        switch (i.f) {
            case 'lit':
                this.t++;
                s[this.t] = i.a;
                break;
            case 'opr':
                switch (i.a) {
                    case 0: // return
                        this.t = this.b - 1;
                        this.p = s[this.t + 3];
                        this.b = s[this.t + 2];
                        break;
                    case 1: s[this.t] = -s[this.t]; break;
                    case 2: this.t--; s[this.t] = s[this.t] + s[this.t + 1]; break;
                    case 3: this.t--; s[this.t] = s[this.t] - s[this.t + 1]; break;
                    case 4: this.t--; s[this.t] = s[this.t] * s[this.t + 1]; break;
                    case 5: this.t--; s[this.t] = Math.trunc(s[this.t] / s[this.t + 1]); break; // Pascal div
                    case 6: s[this.t] = Math.abs(s[this.t]) % 2; break; // ord(odd(...))
                    case 8: this.t--; s[this.t] = s[this.t] === s[this.t + 1] ? 1 : 0; break;
                    case 9: this.t--; s[this.t] = s[this.t] !== s[this.t + 1] ? 1 : 0; break;
                    case 10: this.t--; s[this.t] = s[this.t] < s[this.t + 1] ? 1 : 0; break;
                    case 11: this.t--; s[this.t] = s[this.t] >= s[this.t + 1] ? 1 : 0; break;
                    case 12: this.t--; s[this.t] = s[this.t] > s[this.t + 1] ? 1 : 0; break;
                    case 13: this.t--; s[this.t] = s[this.t] <= s[this.t + 1] ? 1 : 0; break;
                }
                break;
            case 'lod':
                this.t++;
                s[this.t] = s[this.base(i.l) + i.a];
                break;
            case 'sto':
                s[this.base(i.l) + i.a] = s[this.t];
                this.printed.push(s[this.t]);
                this.t--;
                break;
            case 'cal': // generate new block mark
                s[this.t + 1] = this.base(i.l);
                s[this.t + 2] = this.b;
                s[this.t + 3] = this.p;
                this.b = this.t + 1;
                this.p = i.a;
                break;
            case 'int':
                this.t = this.t + i.a;
                break;
            case 'jmp':
                this.p = i.a;
                break;
            case 'jpc':
                if (s[this.t] === 0) this.p = i.a;
                this.t--;
                break;
        }
        if (this.p === 0) this.halted = true; // repeat ... until p = 0
    }
}

// ---------------------------------------------------------------------------------------------
// Random PL/0 programs, compiled the way Wirth's compiler generates code: every block starts with
// JMP over its nested procedures, the body starts with INT 0 dx, variables are at offsets 3..,
// calls and variable accesses use the level difference `lev - level`, bodies end with OPR 0 0.
// Recursion is bounded by a global "fuel" variable decremented on every procedure entry.
// ---------------------------------------------------------------------------------------------

function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Block {
    lev: number; // nesting level of the block body (main = 0)
    vars: number[]; // offsets of assignable variables
    loopVar: number; // offset of the while-loop counter (never assigned by random statements)
    procs: Block[]; // nested procedures
    parent: Block | null;
    entry: number; // address of the INT instruction of the body
}

interface GenOptions {
    pointers?: boolean; // emit LOD/STO as LIT, LIT, PLD / PST (simulator extension)
}

const FUEL = 3; // offset of the fuel variable in the main block

function generateProgram(seed: number, opts: GenOptions = {}): WInstr[] {
    const rnd = mulberry32(seed);
    const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
    const code: WInstr[] = [];
    const gen = (f: Fct, l: number, a: number) => code.push({ f, l, a }) - 1;

    function makeBlock(lev: number, parent: Block | null): Block {
        const firstVar = lev === 0 ? 4 : 3;
        const nVars = 1 + Math.floor(rnd() * 3);
        const block: Block = {
            lev,
            loopVar: firstVar,
            vars: Array.from({ length: nVars }, (_, k) => firstVar + 1 + k),
            procs: [],
            parent,
            entry: -1,
        };
        const nProcs = lev < 3 ? Math.floor(rnd() * 3) : 0;
        for (let k = 0; k < nProcs; k++) block.procs.push(makeBlock(lev + 1, block));
        return block;
    }

    // variables visible in `block`: its own and those of the enclosing blocks, as [levelDiff, offset]
    function visibleVars(block: Block): [number, number][] {
        const res: [number, number][] = [];
        for (let b: Block | null = block, d = 0; b; b = b.parent, d++) {
            for (const v of b.vars) res.push([d, v]);
        }
        return res;
    }

    // procedures callable from `block`: declared in it or in any enclosing block, as [levelDiff, proc]
    function callable(block: Block): [number, Block][] {
        const res: [number, Block][] = [];
        for (let b: Block | null = block, d = 0; b; b = b.parent, d++) {
            for (const p of b.procs) res.push([d, p]);
        }
        return res;
    }

    // In pointer mode the level and offset are pushed and LOD/STO with l = a = -1 mark PLD/PST
    function load(l: number, a: number) {
        if (opts.pointers) {
            gen('lit', 0, l);
            gen('lit', 0, a);
            gen('lod', -1, -1);
        } else {
            gen('lod', l, a);
        }
    }

    function store(l: number, a: number) {
        if (opts.pointers) {
            gen('lit', 0, l);
            gen('lit', 0, a);
            gen('sto', -1, -1);
        } else {
            gen('sto', l, a);
        }
    }

    function expression(block: Block, depth: number) {
        const r = rnd();
        if (depth <= 0 || r < 0.3) {
            if (rnd() < 0.5) gen('lit', 0, Math.floor(rnd() * 21) - 10);
            else load(...pick(visibleVars(block)));
            return;
        }
        if (r < 0.4) {
            expression(block, depth - 1);
            gen('opr', 0, 1); // unary minus
            return;
        }
        expression(block, depth - 1);
        const op = pick([2, 3, 4, 5]);
        if (op === 5) gen('lit', 0, pick([1, 2, 3, -2, 7])); // non-zero divisor
        else expression(block, depth - 1);
        gen('opr', 0, op);
    }

    function condition(block: Block) {
        if (rnd() < 0.2) {
            expression(block, 2);
            gen('opr', 0, 6); // odd
        } else {
            expression(block, 2);
            expression(block, 2);
            gen('opr', 0, pick([8, 9, 10, 11, 12, 13]));
        }
    }

    function statement(block: Block, depth: number, inLoop: boolean) {
        const r = rnd();
        const calls = callable(block);
        if (r < 0.35 || depth <= 0) {
            expression(block, 3);
            store(...pick(visibleVars(block)));
        } else if (r < 0.55 && calls.length > 0) {
            const [d, proc] = pick(calls);
            // the entry address is known only after the procedure is compiled
            pendingCalls.push({ at: gen('cal', d, 0), proc });
        } else if (r < 0.75) {
            condition(block);
            const jpc = gen('jpc', 0, 0);
            statement(block, depth - 1, inLoop);
            code[jpc].a = code.length;
        } else if (r < 0.85 && !inLoop) {
            // v := 3; while v > 0 do begin ...; v := v - 1 end
            gen('lit', 0, 1 + Math.floor(rnd() * 3));
            gen('sto', 0, block.loopVar);
            const top = gen('lod', 0, block.loopVar);
            gen('lit', 0, 0);
            gen('opr', 0, 12);
            const jpc = gen('jpc', 0, 0);
            statement(block, depth - 1, true);
            statement(block, depth - 1, true);
            gen('lod', 0, block.loopVar);
            gen('lit', 0, 1);
            gen('opr', 0, 3);
            gen('sto', 0, block.loopVar);
            gen('jmp', 0, top);
            code[jpc].a = code.length;
        } else {
            statement(block, depth - 1, inLoop);
            statement(block, depth - 1, inLoop);
        }
    }

    const pendingCalls: { at: number; proc: Block }[] = [];

    function compileBlock(block: Block) {
        const jmp = gen('jmp', 0, 0);
        for (const p of block.procs) compileBlock(p);
        code[jmp].a = code.length;
        block.entry = code.length;
        const dx = Math.max(block.loopVar, ...block.vars) + 1;
        gen('int', 0, dx);
        // INT does not clear memory (neither in the original), so variables are initialized -
        // otherwise they would hold leftovers of earlier frames, which differ in pointer mode
        for (const v of block.vars) {
            gen('lit', 0, Math.floor(rnd() * 10));
            store(0, v);
        }
        if (block.lev === 0) {
            gen('lit', 0, 3 + Math.floor(rnd() * 12));
            gen('sto', 0, FUEL);
        } else {
            // if fuel > 0 then begin fuel := fuel - 1; ... end
            gen('lod', block.lev, FUEL);
            const jpc = gen('jpc', 0, 0);
            gen('lod', block.lev, FUEL);
            gen('lit', 0, 1);
            gen('opr', 0, 3);
            gen('sto', block.lev, FUEL);
            const n = 1 + Math.floor(rnd() * 3);
            for (let k = 0; k < n; k++) statement(block, 3, false);
            code[jpc].a = code.length;
        }
        if (block.lev === 0) {
            const n = 2 + Math.floor(rnd() * 4);
            for (let k = 0; k < n; k++) statement(block, 3, false);
        }
        gen('opr', 0, 0);
    }

    compileBlock(makeBlock(0, null));
    for (const c of pendingCalls) code[c.at].a = c.proc.entry;
    return code;
}

// Simulator source text. `dialect` 'wirth' keeps Wirth's JPC and OPR 0 0 (accepted as aliases),
// 'zcu' uses JMC and RET. OPR 0 6 (odd) always becomes OPR 0 7 - in the KIV/FJP instruction set
// operation 6 is modulo. Placeholders produced in pointer mode become PLD/PST.
function toSimulatorText(code: WInstr[], dialect: 'wirth' | 'zcu'): string {
    return code
        .map((i, idx) => {
            if (i.l === -1 && i.a === -1) return `${idx} ${i.f === 'lod' ? 'PLD' : 'PST'} 0 0`;
            switch (i.f) {
                case 'opr':
                    if (i.a === 0) return dialect === 'wirth' ? `${idx} OPR 0 0` : `${idx} RET 0 0`;
                    if (i.a === 6) return `${idx} OPR 0 7`;
                    return `${idx} OPR 0 ${i.a}`;
                case 'jpc':
                    return `${idx} ${dialect === 'wirth' ? 'JPC' : 'JMC'} 0 ${i.a}`;
                default:
                    return `${idx} ${i.f.toUpperCase()} ${i.l} ${i.a}`;
            }
        })
        .join('\n');
}

function parse(text: string): Instruction[] {
    const pav = ParseAndValidate(text);
    assert.ok(pav.parseOK && pav.validationOK, JSON.stringify(pav.parseErrors.concat(pav.validationErrors)).slice(0, 500));
    return pav.instructions;
}

function stackOf(model: DataModel): number[] {
    return model.stack.stackItems.slice(0, model.sp + 1).map((i) => Number(i.value));
}

// Frames on the dynamic chain (the bases of all active activation records), innermost first
function dynamicChain(model: DataModel): number[] {
    const chain = [model.base];
    for (let b = model.base; b !== 0; ) {
        b = Number(model.stack.stackItems[b + 1].value);
        chain.push(b);
    }
    return chain;
}

const MAX_STEPS = 20000;
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

describe("Compatibility with Wirth's original PL/0 interpreter", () => {
    it('executes generated programs exactly like the original, register by register (both dialects)', () => {
        let steps = 0;
        let calls = 0;
        let maxDepth = 0;
        for (const seed of SEEDS) {
            const code = generateProgram(seed);
            for (const dialect of ['wirth', 'zcu'] as const) {
                const instructions = parse(toSimulatorText(code, dialect));
                const ref = new WirthMachine(code);
                const model = InitModel(1024, 250);
                for (let n = 0; n < MAX_STEPS; n++) {
                    const isCall = code[ref.p].f === 'cal';
                    ref.step();
                    const res = NextStep({ model, instructions, input: '' });
                    assert.deepStrictEqual(res.warnings, [], `seed ${seed}: unexpected warnings`);
                    if (ref.halted) {
                        assert.strictEqual(res.isEnd, true, `seed ${seed}: the original ended at step ${n}`);
                        break;
                    }
                    assert.strictEqual(res.isEnd, false, `seed ${seed}: ended early at step ${n}`);
                    const where = `seed ${seed} (${dialect}) step ${n}`;
                    assert.strictEqual(model.pc, ref.p, `${where}: P`);
                    assert.strictEqual(model.base, ref.b, `${where}: B`);
                    assert.strictEqual(model.sp, ref.t, `${where}: T`);
                    assert.deepStrictEqual(stackOf(model), ref.s.slice(0, ref.t + 1), `${where}: stack`);
                    if (dialect === 'zcu') {
                        steps++;
                        if (isCall) calls++;
                        maxDepth = Math.max(maxDepth, model.stack.stackFrames.length);
                    }
                }
                assert.ok(ref.halted, `seed ${seed}: did not finish in ${MAX_STEPS} steps`);
            }
        }
        // make sure the generator really exercises calls and deep nesting
        assert.ok(steps > 20000 && calls > 500 && maxDepth >= 8, `${steps} steps, ${calls} calls, depth ${maxDepth}`);
    });

    it('PLD/PST behave exactly like LOD/STO (the values stored match the output of the original)', () => {
        for (const seed of SEEDS) {
            const ref = new WirthMachine(generateProgram(seed));
            while (!ref.halted) ref.step();

            const instructions = parse(toSimulatorText(generateProgram(seed, { pointers: true }), 'zcu'));
            const model = InitModel(1024, 250);
            const stored: number[] = [];
            for (let n = 0; n < MAX_STEPS * 3; n++) {
                const instr = instructions[model.pc].instruction;
                if (instr === InstructionType.STO || instr === InstructionType.PST) {
                    stored.push(Number(model.stack.stackItems[model.sp - (instr === InstructionType.PST ? 2 : 0)].value));
                }
                if (NextStep({ model, instructions, input: '' }).isEnd) break;
            }
            assert.deepStrictEqual(stored, ref.printed, `seed ${seed}`);
        }
    });

    it('builds static and dynamic chains like the original and shows every frame in the stack view', () => {
        for (const seed of SEEDS.slice(0, 60)) {
            const code = generateProgram(seed);
            const instructions = parse(toSimulatorText(code, 'zcu'));
            const model = InitModel(1024, 250);
            for (let n = 0; n < MAX_STEPS; n++) {
                const before = instructions[model.pc];
                const explanation = before.instruction === InstructionType.CAL || before.instruction === InstructionType.RET
                    ? ExplainInstruction({ model, instructions, input: '' })
                    : null;
                const res = NextStep({ model, instructions, input: '' });
                if (res.isEnd) break;
                const where = `seed ${seed} step ${n}`;

                if (before.instruction === InstructionType.CAL) {
                    // the explanation announces the static base that is actually stored
                    const sb = Number(model.stack.stackItems[model.base].value);
                    assert.strictEqual(explanation!.placeholders[2].value, sb, `${where}: explained static base`);
                    // the static link points to a frame on the dynamic chain (the callee's lexical parent)
                    const chain = dynamicChain(model);
                    assert.ok(chain.slice(1).includes(sb), `${where}: static base ${sb} not in ${chain}`);
                }
                if (before.instruction === InstructionType.RET) {
                    assert.strictEqual(Number(explanation!.placeholders[0].value), model.pc, `${where}: explained return PC`);
                    assert.strictEqual(Number(explanation!.placeholders[1].value), model.base, `${where}: explained base`);
                    assert.strictEqual(explanation!.placeholders[2].value, model.sp, `${where}: explained SP`);
                }

                // the stack view has one frame per activation record, starting at the bases of the dynamic chain
                // (right after CAL the new frame has no allocated cells yet - INT follows)
                if (model.sp < model.base) continue;
                const frames = TransformStackFrames(model.stack).filter((f) => f.isStackFrame);
                const starts = frames.map((f) => f.startIndex);
                assert.deepStrictEqual(starts, dynamicChain(model).reverse(), `${where}: frames in the stack view`);
                const top = frames[frames.length - 1];
                assert.strictEqual(top.startIndex + top.values.length - 1, model.sp, `${where}: top frame ends at SP`);
            }
        }
    });

    it('keeps separate static and dynamic chains in recursion (hand-compiled PL/0 program)', () => {
        // var x;
        // procedure p;
        //   var y;
        //   procedure r; begin y := y * 10 end;
        //   procedure q;
        //   begin
        //     if x > 0 then begin x := x - 1; y := y + 1; call q end;
        //     if x = 0 then begin x := -1; call r end
        //   end;
        // begin y := 0; call q; x := y end;
        // begin x := 3; call p end.
        const src = [
            'JMP 0 40', //  0 main
            'JMP 0 33', //  1 p: jump over r and q
            'JMP 0 3', //   2 r
            'INT 0 3', //   3 r body
            'LOD 1 3', //   4 y := y * 10
            'LIT 0 10',
            'OPR 0 4',
            'STO 1 3',
            'RET 0 0', //   8
            'JMP 0 10', //  9 q
            'INT 0 3', //  10 q body
            'LOD 2 3', //  11 if x > 0
            'LIT 0 0',
            'OPR 0 12',
            'JMC 0 24',
            'LOD 2 3', //  15 x := x - 1
            'LIT 0 1',
            'OPR 0 3',
            'STO 2 3',
            'LOD 1 3', //  19 y := y + 1
            'LIT 0 1',
            'OPR 0 2',
            'STO 1 3',
            'CAL 1 10', // 23 call q (recursion)
            'LOD 2 3', //  24 if x = 0
            'LIT 0 0',
            'OPR 0 8',
            'JMC 0 32',
            'LIT 0 1', //  28 x := -1
            'OPR 0 1',
            'STO 2 3',
            'CAL 1 3', //  31 call r (sibling of q)
            'RET 0 0', //  32
            'INT 0 4', //  33 p body
            'LIT 0 0', //     y := 0
            'STO 0 3',
            'CAL 0 10', // 36 call q
            'LOD 0 3', //  37 x := y
            'STO 1 3',
            'RET 0 0',
            'INT 0 4', //  40 main body
            'LIT 0 3', //     x := 3
            'STO 0 3',
            'CAL 0 33', // 43 call p
            'RET 0 0',
        ].join('\n');
        const instructions = parse(src);
        const model = InitModel(1024, 250);
        let insideR: { frames: number[]; staticLinks: number[]; dynamicLinks: number[] } | null = null;
        for (let n = 0; n < 500; n++) {
            if (NextStep({ model, instructions, input: '' }).isEnd) break;
            if (model.pc === 4 && !insideR) {
                const frames = dynamicChain(model); // innermost first
                insideR = {
                    frames,
                    staticLinks: frames.map((b) => Number(model.stack.stackItems[b].value)),
                    dynamicLinks: frames.map((b) => Number(model.stack.stackItems[b + 1].value)),
                };
            }
        }
        assert.ok(insideR, 'r was called');
        // active frames: r, q, q, q, q, p, main
        const [r, q4, q3, q2, q1, p, main] = insideR!.frames;
        assert.strictEqual(insideR!.frames.length, 7);
        assert.strictEqual(main, 0);
        assert.deepStrictEqual(insideR!.dynamicLinks.slice(0, 6), [q4, q3, q2, q1, p, main], 'dynamic links point to the caller');
        assert.deepStrictEqual(insideR!.staticLinks.slice(0, 6), [p, p, p, p, p, main], 'static links point to the lexical parent');
        void r;
        // y = 3 increments * 10, stored into x
        assert.strictEqual(model.stack.stackItems[3].value, 30);

        // the original computes the same
        const wirth = src.split('\n').map((line): WInstr => {
            const [op, l, a] = line.replace(/\s*\/\/.*$/, '').trim().split(/\s+/);
            if (op === 'RET') return { f: 'opr', l: 0, a: 0 };
            return { f: (op === 'JMC' ? 'jpc' : op.toLowerCase()) as Fct, l: Number(l), a: Number(a) };
        });
        const ref = new WirthMachine(wirth);
        while (!ref.halted) ref.step();
        assert.strictEqual(ref.s[3], 30);
    });
});
