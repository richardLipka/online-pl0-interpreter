import { Instruction, InstructionType } from './model';
import { stripComment, parseDirectiveText, Directive } from './directives';
import i18next from 'i18next';

export interface ValidationResult {
    emptyInput: boolean;
    parseOK: boolean;
    validationOK: boolean;
    instructions: Instruction[];
    parseErrors: PreprocessingError[];
    validationErrors: PreprocessingError[];
}

export interface PreprocessingError {
    rowIndex: number;
    error: string;
}

export let stringInstructionMap = new Map<string, InstructionType>([
    ['LIT', InstructionType.LIT],
    ['OPR', InstructionType.OPR],
    ['LOD', InstructionType.LOD],
    ['STO', InstructionType.STO],
    ['CAL', InstructionType.CAL],
    ['INT', InstructionType.INT],
    ['JMP', InstructionType.JMP],
    ['JMC', InstructionType.JMC],
    ['RET', InstructionType.RET],
    ['REA', InstructionType.REA],
    ['WRI', InstructionType.WRI],
    ['NEW', InstructionType.NEW],
    ['DEL', InstructionType.DEL],
    ['LDA', InstructionType.LDA],
    ['STA', InstructionType.STA],
    ['PLD', InstructionType.PLD],
    ['PST', InstructionType.PST],
    ["ITR", InstructionType.ITR],
    ["RTI", InstructionType.RTI],
    ["OPF", InstructionType.OPF],
]);

export let instructionStringMap = new Map<InstructionType, string>([
    [InstructionType.LIT, 'LIT'],
    [InstructionType.OPR, 'OPR'],
    [InstructionType.LOD, 'LOD'],
    [InstructionType.STO, 'STO'],
    [InstructionType.CAL, 'CAL'],
    [InstructionType.INT, 'INT'],
    [InstructionType.JMP, 'JMP'],
    [InstructionType.JMC, 'JMC'],
    [InstructionType.RET, 'RET'],
    [InstructionType.REA, 'REA'],
    [InstructionType.WRI, 'WRI'],
    [InstructionType.NEW, 'NEW'],
    [InstructionType.DEL, 'DEL'],
    [InstructionType.LDA, 'LDA'],
    [InstructionType.STA, 'STA'],
    [InstructionType.PLD, 'PLD'],
    [InstructionType.PST, 'PST'],
    [InstructionType.ITR, 'ITR'],
    [InstructionType.RTI, 'RTI'],
    [InstructionType.OPF, 'OPF'],
]);

// Splits a line into tokens; whitespace and commas outside quotes separate tokens,
// so "LIT 0 5", "LIT 0, 5" and "LIT 0,5" are equivalent
function tokenizeLine(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s,]+)/g;
    const tokens: string[] = [];
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
        if (match[1] !== undefined) {
            tokens.push(match[1]);
        } else if (match[2] !== undefined) {
            tokens.push(match[2]);
        } else if (match[3] !== undefined) {
            tokens.push(match[3]);
        }
    }
    return tokens;
}

export function stripLineNumberFromLine(line: string): string {
    if (!line.trim()) {
        return line;
    }

    // 1. Line contains only a number with optional delimiter: e.g. "1" or "1:" or "1." or "[1]"
    if (/^\s*(?:\[\d+\]|\(\d+\)|#\d+|\d+[:.)]?)\s*$/.test(line)) {
        return '';
    }

    let result = line;

    // 2. Delimited line number at start: e.g. "1: LIT 0 5", "[1] LIT 0 5", "1. LIT 0 5", "(1) LIT 0 5", "#1 LIT 0 5"
    const delimitedMatch = result.match(/^(\s*)(?:\[\d+\]|\(\d+\)|#\d+|\d+[:.)])\s*(.*)$/);
    if (delimitedMatch) {
        result = `${delimitedMatch[1]}${delimitedMatch[2]}`;
    } else {
        // 3. Plain integer followed by instruction mnemonic / directive / label / comment:
        // e.g. "0 LIT 0 5", "1 INT 0 3", "1 @loop", "1 ; comment", "1 &REGS"
        const plainMatch = result.match(/^(\s*)\d+\s+(?=[a-zA-Z_@;&/])(.*)$/);
        if (plainMatch) {
            result = `${plainMatch[1]}${plainMatch[2]}`;
        }
    }

    // 4. Line number following a leading label: e.g. "@loop: 1 LOD 0 3" or "@loop: 1: LOD 0 3"
    const labelNumMatch = result.match(
        /^(\s*(?:@\w+:?|[a-zA-Z_]\w*:)\s+)(?:\[\d+\]|\(\d+\)|#\d+|\d+[:.)]\s*|\d+\s+(?=[a-zA-Z_@;&/]))(.*)$/
    );
    if (labelNumMatch) {
        result = `${labelNumMatch[1]}${labelNumMatch[2]}`;
    }

    return result;
}

export function stripLineNumbers(input: string): string {
    if (!input) return input;
    const lineEnding = input.includes('\r\n') ? '\r\n' : '\n';
    return input
        .split(/\r?\n/)
        .map((line) => stripLineNumberFromLine(line))
        .join(lineEnding);
}

export function hasLineNumbers(input: string): boolean {
    if (!input || !input.trim()) return false;
    const lines = input.split(/\r?\n/);
    return lines.some((line) => {
        if (!line.trim()) return false;
        return stripLineNumberFromLine(line) !== line;
    });
}

export function isInstructionLine(line: string): boolean {
    const { code } = stripComment(line);
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.startsWith('&')) {
        return false;
    }
    const tokens = tokenizeLine(cleanCode);
    if (tokens.length === 0) {
        return false;
    }
    if (tokens.length === 1 && (tokens[0].startsWith('@') || tokens[0].endsWith(':'))) {
        return false;
    }
    if (stringInstructionMap.has(tokens[0].toUpperCase())) {
        return true;
    }
    if (
        tokens.length >= 2 &&
        (tokens[0].startsWith('@') || tokens[0].endsWith(':')) &&
        stringInstructionMap.has(tokens[1].toUpperCase())
    ) {
        return true;
    }
    return false;
}

export function addLineNumbers(input: string): string {
    if (!input) return input;
    const lineEnding = input.includes('\r\n') ? '\r\n' : '\n';
    const lines = input.split(/\r?\n/);
    let instructionIndex = 0;

    const resultLines = lines.map((line) => {
        const stripped = stripLineNumberFromLine(line);
        if (!stripped.trim()) {
            return stripped;
        }

        if (isInstructionLine(stripped)) {
            const indentMatch = stripped.match(/^(\s*)(.*)$/);
            const indent = indentMatch ? indentMatch[1] : '';
            const content = indentMatch ? indentMatch[2] : stripped;
            return `${indent}${instructionIndex++} ${content}`;
        }

        return stripped;
    });

    return resultLines.join(lineEnding);
}

export interface ParseAndValidateOptions {
    ignoreLineNumbers?: boolean;
}

export function ParseAndValidate(
    input: string,
    options?: ParseAndValidateOptions
): ValidationResult {
    const rawInput = options?.ignoreLineNumbers ? stripLineNumbers(input) : input;
    let lines = rawInput.split(/\r?\n/);

    if (rawInput.trim() == '') {
        return {
            emptyInput: true,
            validationOK: false,
            parseOK: false,
            parseErrors: [],
            validationErrors: [],
            instructions: [],
        };
    }

    let parseOK = true;
    let validationOK = true;
    let instructions: Instruction[] = [];
    // Source line (0-based) of every instruction, so that validation errors point to the right line
    let instructionLines: number[] = [];
    let validationErrors: PreprocessingError[] = [];
    let parseErrors: PreprocessingError[] = [];
    let line_counter = 0;
    let pendingPreDirectives: Directive[] = [];
    let currentInstructionIdx = 0;
    let labels = new Map<string, number>();
    let deferredLabels: { instructionIdx: number; rowIndex: number; label: string }[] = [];

    function cleanLabel(raw: string): string {
        let s = raw.trim();
        if (s.endsWith(':')) s = s.slice(0, -1);
        return s.toLowerCase();
    }

    // "@loop", "loop:" and "@loop:" all define the same label
    function defineLabel(raw: string, target: number, rowIndex: number) {
        const lbl = cleanLabel(raw);
        const bare = lbl.replace(/^@/, '');
        if (labels.has(bare)) {
            parseOK = false;
            parseErrors.push({
                rowIndex: rowIndex,
                error: String(i18next.t('core:validatorDuplicateLabel')).replace('%1', raw),
            });
            return;
        }
        labels.set(lbl, target);
        labels.set('@' + bare, target);
        labels.set(bare, target);
    }

    for (let i = 0; i < lines.length; i++) {
        let trimmedLine = lines[i].trim();
        if (trimmedLine.length === 0) {
            continue;
        }

        const { code, comment } = stripComment(trimmedLine);
        const cleanCode = code.trim();

        // 1. Line is purely a comment (or empty code)
        if (cleanCode.length === 0) {
            if (comment && comment.startsWith('&')) {
                const dir = parseDirectiveText(comment, i + 1, currentInstructionIdx, 'before');
                if (dir) {
                    pendingPreDirectives.push(dir);
                }
            }
            continue;
        }

        // 2. Line is a standalone directive without comment prefix
        if (cleanCode.startsWith('&')) {
            const dir = parseDirectiveText(cleanCode, i + 1, currentInstructionIdx, 'before');
            if (dir) {
                pendingPreDirectives.push(dir);
            }
            continue;
        }

        // 3. Line contains instruction code (or label)!
        // Check if there is a trailing comment directive on this instruction line
        let trailingDir: Directive | null = null;
        if (comment && comment.startsWith('&')) {
            trailingDir = parseDirectiveText(comment, i + 1, currentInstructionIdx, 'after');
        }

        let tokens = tokenizeLine(cleanCode);
        if (tokens.length === 0) {
            continue;
        }

        // Case A: Standalone label line (e.g. "@loop" or "loop:" or "@loop:")
        if (tokens.length === 1 && (tokens[0].startsWith('@') || tokens[0].endsWith(':'))) {
            defineLabel(tokens[0], currentInstructionIdx, i);
            // A directive in the comment of a label line belongs before the labelled instruction
            if (trailingDir) {
                trailingDir.position = 'before';
                pendingPreDirectives.push(trailingDir);
            }
            continue;
        }

        // Case B: Instruction line with leading label (e.g. "@loop LOD 0 3" or "@loop: LOD 0 3" or "loop: LOD 0 3")
        if (tokens.length >= 2 && (tokens[0].startsWith('@') || tokens[0].endsWith(':'))) {
            defineLabel(tokens.shift()!, currentInstructionIdx, i);
        } else if (
            tokens.length >= 3 &&
            !Number.isNaN(Number(tokens[0])) &&
            (tokens[1].startsWith('@') || tokens[1].endsWith(':'))
        ) {
            // Line with explicit index and label: e.g. "3 @loop LOD 0 3"
            const explicitIndex = Number(tokens[0]);
            defineLabel(tokens.splice(1, 1)[0], explicitIndex, i);
        }

        let splitLine = tokens;

        if (splitLine.length == 3) {
            splitLine.unshift((line_counter++).toString());
        } else if (splitLine.length >= 4) {
            let explicitIdx = Number(splitLine[0]);
            if (!Number.isNaN(explicitIdx)) {
                line_counter = Math.max(line_counter, explicitIdx + 1);
            }
        }

        if (splitLine.length < 3) {
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorLessThan3'),
            });
            continue;
        } else if (splitLine.length > 4) {
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorMoreThan4'),
            });
            continue;
        }

        let index = Number(splitLine[0]);
        if (!Number.isInteger(index)) {
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorIndexInteger'),
            });
            continue;
        }
        let op: string = splitLine[1];
        if (!stringInstructionMap.has(op.toUpperCase())) {
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorUnkInstruction'),
            });
            continue;
        }
        let level = Number(splitLine[2]);
        if (!Number.isInteger(level)) {
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorLevelInteger'),
            });
            continue;
        }
        let parameter_str = splitLine[3];
        let parameter = Number(parameter_str);
        if (op.toUpperCase() !== 'LIT' && !Number.isNaN(parameter) && !Number.isInteger(parameter)) {
            // Addresses, levels and operation codes are integers (only LIT may push other values)
            parseOK = false;
            parseErrors.push({
                rowIndex: i,
                error: i18next.t('core:validatorParInteger'),
            });
            continue;
        }
        if (Number.isNaN(parameter)) {
            if (op.toUpperCase() === 'LIT') {
                parameter = 0;
            } else if (
                parameter_str.startsWith('@') ||
                /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parameter_str)
            ) {
                // Deferred label resolution (Pass 2)
                deferredLabels.push({
                    instructionIdx: instructions.length,
                    rowIndex: i,
                    label: parameter_str,
                });
                parameter = 0;
            } else {
                parseOK = false;
                parseErrors.push({
                    rowIndex: i,
                    error: i18next.t('core:validatorParInteger'),
                });
                continue;
            }
        }

        if (!parseOK) {
            continue;
        }

        let instruction: Instruction = {
            index: index,
            // @ts-ignore
            instruction: stringInstructionMap.get(op.toUpperCase()),
            level: level,
            parameter: parameter,
            parameter_str: parameter_str,
            explanationParts: null,
            preDirectives: [...pendingPreDirectives],
            postDirectives: trailingDir ? [trailingDir] : [],
        };
        pendingPreDirectives = [];
        currentInstructionIdx++;
        instructions.push(instruction);
        instructionLines.push(i);
    }

    // Resolve deferred label parameters (Pass 2)
    for (const deferred of deferredLabels) {
        const rawLabel = deferred.label;
        const normKey = cleanLabel(rawLabel);
        const target =
            labels.get(normKey) ??
            labels.get('@' + normKey.replace(/^@/, '')) ??
            labels.get(normKey.replace(/^@/, ''));
        if (target !== undefined) {
            instructions[deferred.instructionIdx].parameter = target;
            instructions[deferred.instructionIdx].parameter_str = target.toString();
        } else {
            parseOK = false;
            parseErrors.push({
                rowIndex: deferred.rowIndex,
                error: String(i18next.t('core:validatorUnresolvedLabel')).replace('%1', rawLabel),
            });
        }
    }

    // Directives after all instructions are attached as post-directives to the last instruction
    if (pendingPreDirectives.length > 0 && instructions.length > 0) {
        const lastIdx = instructions.length - 1;
        const lastInst = instructions[lastIdx];
        for (const dir of pendingPreDirectives) {
            dir.instructionIndex = lastIdx;
            dir.position = 'after';
        }
        lastInst.postDirectives = [
            ...(lastInst.postDirectives || []),
            ...pendingPreDirectives,
        ];
        pendingPreDirectives = [];
    }

    for (let i = 0; i < instructions.length; i++) {
        let instruction: Instruction = instructions[i];
        if (instruction.index != i) {
            validationOK = false;
            validationErrors.push({
                rowIndex: instructionLines[i],
                error: i18next.t('core:validatorBadIndex'),
            });
            continue;
        }

        if (instruction.level < 0) {
            validationOK = false;
            validationErrors.push({
                rowIndex: instructionLines[i],
                error: i18next.t('core:validatorNegLevel'),
            });
            continue;
        }

        if (instruction.instruction == InstructionType.LIT && instruction.level != 0) {
            validationOK = false;
            validationErrors.push({
                rowIndex: instructionLines[i],
                error: i18next.t('core:validatorLitLevel'),
            });
            continue;
        } else if (instruction.instruction == InstructionType.OPR) {
            if (instruction.level != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorOprLevel'),
                });
                continue;
            } else if (instruction.parameter < 1 || instruction.parameter > 13) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorOprParam'),
                });
                continue;
            }
        } else if (
            instruction.instruction == InstructionType.CAL &&
            instruction.parameter < 0
        ) {
            validationOK = false;
            validationErrors.push({
                rowIndex: instructionLines[i],
                error: i18next.t('core:validatorCalParam'),
            });
            continue;
        } else if (instruction.instruction == InstructionType.JMP) {
            if (instruction.level != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorJmpLevel'),
                });
                continue;
            } else if (instruction.parameter < 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorJmpParam'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.JMC) {
            if (instruction.level != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorJmcLevel'),
                });
                continue;
            } else if (instruction.parameter < 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorJmcParam'),
                });
                continue;
            }
        } else if (
            instruction.instruction == InstructionType.INT &&
            instruction.level != 0
        ) {
            validationOK = false;
            validationErrors.push({
                rowIndex: instructionLines[i],
                error: i18next.t('core:validatorIntLevel'),
            });
            continue;
        } else if (instruction.instruction == InstructionType.RET) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorRet'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.REA) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorRea'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.WRI) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorWri'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.NEW) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorNew'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.DEL) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorDel'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.LDA) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorLda'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.STA) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorSta'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.PLD) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorPld'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.PST) {
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorPst'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.ITR) { /* Integer to float */
            if (instruction.level != 0 || instruction.parameter != 0) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorItr'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.RTI) { /* Float to integer */
            if (instruction.level != 0 || instruction.parameter < 0 || instruction.parameter > 1) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorRti'),
                });
                continue;
            }
        } else if (instruction.instruction == InstructionType.OPF) { /* Float operation */
            if (instruction.level != 0 || instruction.parameter < 1 || instruction.parameter > 13) {
                validationOK = false;
                validationErrors.push({
                    rowIndex: instructionLines[i],
                    error: i18next.t('core:validatorOpfParam'),
                });
                continue;
            }
        }
    }

    if (!parseOK) {
        instructions = [];
    }

    return {
        emptyInput: false,
        parseOK: parseOK,
        validationOK: validationOK,
        validationErrors: validationErrors,
        parseErrors: parseErrors,
        instructions: instructions,
    };
}
