import { DataModel, Instruction } from './model';

export type DirectiveType =
    | 'REGS'
    | 'STK'
    | 'STKA'
    | 'STKN'
    | 'STKRG'
    | 'ECHO'
    | 'MEM'
    | 'HEAP'
    | 'ASSERT_TOS'
    | 'STATS';

export const KNOWN_DIRECTIVES = new Set<string>([
    'REGS',
    'STK',
    'STKA',
    'STKN',
    'STKRG',
    'ECHO',
    'MEM',
    'HEAP',
    'ASSERT_TOS',
    'STATS',
]);

export interface Directive {
    raw: string;
    type: DirectiveType;
    args: string[];
    lineIndex: number;          // 1-based line number in source file
    instructionIndex: number;    // Instruction index this directive is associated with
    position: 'before' | 'after';
}

export interface DirectiveResult {
    directive: Directive;
    type: DirectiveType;
    message: string;
    passed?: boolean;
    expected?: string | number;
    actual?: string | number;
}

/**
 * Strips comments (; // #) outside of string quotes.
 */
export function stripComment(line: string): { code: string; comment: string | null } {
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && !inSingleQuote && (i === 0 || line[i - 1] !== '\\')) {
            inDoubleQuote = !inDoubleQuote;
        } else if (ch === "'" && !inDoubleQuote && (i === 0 || line[i - 1] !== '\\')) {
            inSingleQuote = !inSingleQuote;
        } else if (!inSingleQuote && !inDoubleQuote) {
            if (ch === ';' || ch === '#') {
                return {
                    code: line.substring(0, i),
                    comment: line.substring(i + 1).trim(),
                };
            }
            if (ch === '/' && i + 1 < line.length && line[i + 1] === '/') {
                return {
                    code: line.substring(0, i),
                    comment: line.substring(i + 2).trim(),
                };
            }
        }
    }

    return { code: line, comment: null };
}

/**
 * Extracts directives and produces clean instruction code for ParseAndValidate.
 */
export function ExtractDirectives(rawSource: string): {
    cleanCode: string;
    directives: Directive[];
} {
    const lines = rawSource.split(/\r?\n/);
    const cleanLines: string[] = [];
    const directives: Directive[] = [];

    let currentInstructionIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const { code, comment } = stripComment(line);

        const trimmedCode = code.trim();

        // Check if the code itself is a directive line (e.g. &REGS ...)
        if (trimmedCode.startsWith('&')) {
            const parsed = parseDirectiveText(trimmedCode, lineNum, currentInstructionIndex, 'before');
            if (parsed) {
                directives.push(parsed);
            }
            continue;
        }

        // Check if there is an instruction on this line
        const hasInstruction = trimmedCode.length > 0;
        if (hasInstruction) {
            cleanLines.push(trimmedCode);
            currentInstructionIndex++;
        }

        // Check if comment contains a directive (e.g. ; &REGS or ; &ECHO ...)
        if (comment && comment.startsWith('&')) {
            const parsed = parseDirectiveText(
                comment,
                lineNum,
                hasInstruction ? currentInstructionIndex - 1 : currentInstructionIndex,
                hasInstruction ? 'after' : 'before'
            );
            if (parsed) {
                directives.push(parsed);
            }
        }
    }

    // Directives after all instructions should be assigned 'after' position of the last instruction
    if (currentInstructionIndex > 0) {
        for (const d of directives) {
            if (d.instructionIndex >= currentInstructionIndex) {
                d.instructionIndex = currentInstructionIndex - 1;
                d.position = 'after';
            }
        }
    }

    return {
        cleanCode: cleanLines.join('\n'),
        directives,
    };
}

export function parseDirectiveText(
    text: string,
    lineIndex: number,
    instructionIndex: number,
    position: 'before' | 'after'
): Directive | null {
    // Matches &DIR_NAME optional_args
    const match = text.match(/^&([A-Za-z_]+)(?:\s+(.*))?$/);
    if (!match) return null;

    const rawType = match[1].toUpperCase();
    if (!KNOWN_DIRECTIVES.has(rawType)) {
        return null;
    }
    const type = rawType as DirectiveType;
    const rawArgs = match[2] ? match[2].trim() : '';

    // Tokenize args (handling quotes)
    const args: string[] = [];
    if (rawArgs.length > 0) {
        if (type === 'ECHO') {
            // ECHO treats the rest of line as string (stripping outer quotes if present)
            if (
                (rawArgs.startsWith('"') && rawArgs.endsWith('"')) ||
                (rawArgs.startsWith("'") && rawArgs.endsWith("'"))
            ) {
                args.push(rawArgs.slice(1, -1));
            } else {
                args.push(rawArgs);
            }
        } else {
            const argRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
            let m;
            while ((m = argRegex.exec(rawArgs)) !== null) {
                if (m[1] !== undefined) args.push(m[1]);
                else if (m[2] !== undefined) args.push(m[2]);
                else if (m[3] !== undefined) args.push(m[3]);
            }
        }
    }

    return {
        raw: text,
        type,
        args,
        lineIndex,
        instructionIndex,
        position,
    };
}

export function AttachDirectivesToInstructions(
    instructions: Instruction[],
    directives: Directive[]
): void {
    if (!instructions || instructions.length === 0) return;

    for (const inst of instructions) {
        if (!inst.preDirectives) inst.preDirectives = [];
        if (!inst.postDirectives) inst.postDirectives = [];
    }

    for (const dir of directives) {
        let idx = dir.instructionIndex;
        if (idx < 0) idx = 0;
        if (idx >= instructions.length) {
            idx = instructions.length - 1;
            instructions[idx].postDirectives!.push(dir);
            continue;
        }

        if (dir.position === 'before') {
            instructions[idx].preDirectives!.push(dir);
        } else {
            instructions[idx].postDirectives!.push(dir);
        }
    }
}

/**
 * Executes a directive against current CPU DataModel.
 */
export function ExecuteDirective(
    directive: Directive,
    model: DataModel,
    instructions: Instruction[]
): DirectiveResult {
    const pc = directive.instructionIndex !== undefined ? directive.instructionIndex : model.pc;
    const base = model.base;
    const sp = model.sp;
    const stack = model.stack;
    const heap = model.heap;

    switch (directive.type) {
        case 'REGS': {
            let msg = `[DIRECTIVE &REGS at PC ${pc}] PC: ${pc}, BASE: ${base}, SP: ${sp}, Frames: ${stack.stackFrames.length}`;
            if (base > 0 && base + 2 < stack.stackItems.length) {
                const sb = stack.stackItems[base]?.value;
                const db = stack.stackItems[base + 1]?.value;
                const retPc = stack.stackItems[base + 2]?.value;
                msg += `\n  Frame Control Links: SB=${sb}, DB=${db}, retPC=${retPc}`;
            }
            return { directive, type: 'REGS', message: msg };
        }

        case 'STK': {
            let msg = `[DIRECTIVE &STK at PC ${pc}] Stack (depth: ${sp + 1}, SP: ${sp}, BASE: ${base}):`;
            if (sp < 0) {
                msg += '\n  (stack is empty)';
            } else {
                for (let i = 0; i <= sp; i++) {
                    const val = stack.stackItems[i]?.value ?? 0;
                    const tags: string[] = [];
                    if (i === base) tags.push('BASE');
                    if (base > 0) {
                        if (i === base) tags.push('SB');
                        else if (i === base + 1) tags.push('DB');
                        else if (i === base + 2) tags.push('retPC');
                    }
                    if (i === sp) tags.push('SP/TOS');

                    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
                    msg += `\n  [${i}] = ${val}${tagStr}`;
                }
            }
            return { directive, type: 'STK', message: msg };
        }

        case 'STKA': {
            let msg = `[DIRECTIVE &STKA at PC ${pc}] Active Frame (BASE: ${base}, SP: ${sp}, Frame slots: ${Math.max(0, sp - base + 1)}):`;
            if (sp < base) {
                msg += '\n  (no variables allocated in active frame yet)';
            } else {
                for (let offset = 0; offset <= sp - base; offset++) {
                    const absIdx = base + offset;
                    const val = stack.stackItems[absIdx]?.value ?? 0;
                    const tags: string[] = [];
                    if (offset === 0) tags.push(base > 0 ? 'SB' : 'BASE');
                    else if (offset === 1 && base > 0) tags.push('DB');
                    else if (offset === 2 && base > 0) tags.push('retPC');
                    if (absIdx === sp) tags.push('SP/TOS');

                    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
                    msg += `\n  +${offset} (abs ${absIdx}) = ${val}${tagStr}`;
                }
            }
            return { directive, type: 'STKA', message: msg };
        }

        case 'STKN': {
            const countArg = directive.args[0];
            const n = parseInt(countArg, 10);
            if (isNaN(n) || n <= 0) {
                return {
                    directive,
                    type: 'STKN',
                    message: `[DIRECTIVE &STKN at PC ${pc}] Invalid argument: '${countArg}' (expected positive integer)`,
                };
            }

            let msg = `[DIRECTIVE &STKN ${n} at PC ${pc}] Top ${n} stack item(s):`;
            if (sp < 0) {
                msg += '\n  (stack is empty)';
            } else {
                const startIdx = Math.max(0, sp - n + 1);
                for (let i = startIdx; i <= sp; i++) {
                    const val = stack.stackItems[i]?.value ?? 0;
                    const isTOS = i === sp ? ' <- [SP/TOS]' : '';
                    msg += `\n  [${i}] = ${val}${isTOS}`;
                }
            }
            return { directive, type: 'STKN', message: msg };
        }

        case 'STKRG': {
            const aArg = directive.args[0];
            const bArg = directive.args[1];
            const a = parseInt(aArg, 10);
            const b = parseInt(bArg, 10);

            if (isNaN(a) || isNaN(b) || a < 0 || b < a) {
                return {
                    directive,
                    type: 'STKRG',
                    message: `[DIRECTIVE &STKRG at PC ${pc}] Invalid range arguments: '${aArg}' '${bArg}' (expected 0 <= a <= b)`,
                };
            }

            let msg = `[DIRECTIVE &STKRG ${a} ${b} at PC ${pc}] Stack range [${a}..${b}]:`;
            for (let i = a; i <= b; i++) {
                if (i <= sp) {
                    const val = stack.stackItems[i]?.value ?? 0;
                    const isTOS = i === sp ? ' <- [SP/TOS]' : '';
                    msg += `\n  [${i}] = ${val}${isTOS}`;
                } else {
                    msg += `\n  [${i}] = <unallocated stack slot>`;
                }
            }
            return { directive, type: 'STKRG', message: msg };
        }

        case 'ECHO': {
            const text = directive.args.join(' ');
            return {
                directive,
                type: 'ECHO',
                message: `[ECHO] ${text}`,
            };
        }

        case 'MEM': {
            const stackDepth = Math.max(0, sp + 1);
            const allocatedBlocks = heap.heapBlocks.filter((b) => !b.free);
            const heapCells = allocatedBlocks.reduce((sum, b) => sum + b.dataSize, 0);
            const peakMem = model.stats?.peakTotalMemoryOccupied ?? (stackDepth + heapCells);

            const msg = `[DIRECTIVE &MEM at PC ${pc}] Stack: ${stackDepth} cells (peak: ${model.stats?.peakStackSize ?? stackDepth}), Heap: ${heapCells} data cells in ${allocatedBlocks.length} active block(s) (peak: ${model.stats?.peakHeapAllocatedCells ?? heapCells}), Peak Memory: ${peakMem} cells`;
            return { directive, type: 'MEM', message: msg };
        }

        case 'HEAP': {
            const allocatedBlocks = heap.heapBlocks.filter((b) => !b.free);
            const heapCells = allocatedBlocks.reduce((sum, b) => sum + b.dataSize, 0);

            let msg = `[DIRECTIVE &HEAP at PC ${pc}] Heap size: ${heap.size}, Active blocks: ${allocatedBlocks.length}, Allocated data cells: ${heapCells}:`;
            if (allocatedBlocks.length === 0) {
                msg += '\n  (no active heap allocations)';
            } else {
                allocatedBlocks.forEach((block, idx) => {
                    const values: number[] = [];
                    for (let i = 0; i < block.dataSize; i++) {
                        values.push(heap.values[block.dataAddress + i] ?? 0);
                    }
                    msg += `\n  Block #${idx + 1}: dataAddress=${block.dataAddress}, dataSize=${block.dataSize}, values=[${values.join(', ')}]`;
                });
            }
            return { directive, type: 'HEAP', message: msg };
        }

        case 'ASSERT_TOS': {
            const expectedStr = directive.args[0] ?? '';
            const actualVal = sp >= 0 ? stack.stackItems[sp]?.value : undefined;
            const actualStr = actualVal !== undefined ? String(actualVal) : '<empty stack>';

            let passed = false;
            if (actualVal !== undefined) {
                if (!isNaN(Number(expectedStr)) && !isNaN(Number(actualVal))) {
                    passed = Number(actualVal) === Number(expectedStr);
                } else {
                    passed = actualStr === expectedStr;
                }
            }

            const msg = passed
                ? `[ASSERTION PASS at PC ${pc}] TOS == ${expectedStr}`
                : `[ASSERTION FAIL at PC ${pc}] Expected TOS == '${expectedStr}', but found '${actualStr}'`;

            return {
                directive,
                type: 'ASSERT_TOS',
                message: msg,
                passed,
                expected: expectedStr,
                actual: actualStr,
            };
        }

        case 'STATS': {
            const stats = model.stats;
            if (!stats) {
                return {
                    directive,
                    type: 'STATS',
                    message: `[DIRECTIVE &STATS at PC ${pc}] No statistics collected yet.`,
                };
            }

            const msg = `[DIRECTIVE &STATS at PC ${pc}] Instructions: ${stats.totalInstructionsExecuted}, Peak Stack: ${stats.peakStackSize}, Peak Heap: ${stats.peakHeapAllocatedCells}, Branches: ${stats.conditionalJumpsExecuted} (Taken: ${stats.branchTakenRatio}%), Procedures: ${stats.procedureCallsCount}`;
            return { directive, type: 'STATS', message: msg };
        }

        default:
            return {
                directive,
                type: directive.type,
                message: `[DIRECTIVE at PC ${pc}] Unknown directive: &${(directive as any).type}`,
            };
    }
}
