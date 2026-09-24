import {
    Instruction,
    InstructionType,
    InstructionStepParameters,
    Stack,
    StackItem,
    StackFrame,
    OperationType,
} from './model';

import {
    FreeDummy,
    AllocateDummy,
    GetValueFromHeapDummy,
    PutValueOnHeapDummy,
} from './allocator';

import i18next from 'i18next';

// ------------------------------------------- INTERFACES

export interface Explanation {
    message: string;
    placeholders: Placeholder[];
}

export interface Placeholder {
    // What placeholder in message to replace
    placeholder: string;
    // Value to replace it with
    value: any;

    // Which values to highlight in stack
    stack: number[];
    // Which values to highlight in heap
    heap: number[];
    // Which instructions to highlight
    instructions: number[];

    //base: boolean;

    // Whether or not to highlight the LEVEL in instruction GUI
    level: boolean;
    // Whether or not to highlight the PARAMETER in instruction GUI
    parameter: boolean;
    // Whether or not to highlight the input field
    output: boolean;
    // Whether or not to highlight the output field
    input: boolean;
    // How to highlight - BOLD or BACKGROUND
    highlightType: HighlightType;
}

export enum HighlightType {
    BOLD,
    BACKGROUND,
}

// ------------------------------------------- INTERFACES

// ------------------------------------------- STACK UTILITY FUNCTIONS

function GetValuesFromStack(
    stack: Stack,
    index: number,
    count: number,
    decrementCurrentFrame: boolean = false
) {
    if (index < count - 1 || index < 0) {
        const msg = String(i18next.t('core:modelStackNoOperands') || 'Not enough operands on stack to continue (required %1, found %2)');
        throw new Error(msg.replace('%1', count.toString()).replace('%2', Math.max(0, index + 1).toString()));
    }
    let retvals = [];
    for (let i = 0; i < count; i++) {
        if (!CheckSPInBounds(index - i)) {
            const msg = String(i18next.t('core:modelStackNoOperands') || 'Not enough operands on stack to continue (required %1, found %2)');
            throw new Error(msg.replace('%1', count.toString()).replace('%2', Math.max(0, index + 1).toString()));
        }
        retvals.push(stack.stackItems[index - i].value);
    }
    return retvals;
}

// Checks if SP is not pointing under the stack
function CheckSPInBounds(sp: number) {
    if (sp < 0) {
        return false;
    } else {
        return true;
    }
}

function InvalidLevelMessage(level: number | string): string {
    return String(i18next.t('core:modelInvalidLevel')).replace('%1', String(level));
}

// Placeholder that only shows a value in the message (nothing is highlighted in the GUI)
function TextPlaceholder(placeholder: string, value: any): Placeholder {
    return {
        placeholder: placeholder,
        value: value,
        heap: [],
        stack: [],
        instructions: [],
        level: false,
        parameter: false,
        output: false,
        input: false,
        highlightType: HighlightType.BOLD,
    };
}

// Quotes a character and makes control characters visible (e.g. '\n')
function DisplayCharacter(ch: string): string {
    const escapes: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
    const code = ch.charCodeAt(0);
    if (escapes[ch]) {
        return `'${escapes[ch]}'`;
    }
    if (code < 32 || code === 127) {
        return `'\\x${code.toString(16).padStart(2, '0')}'`;
    }
    return `'${ch}'`;
}

function FindBaseDummy(stack: Stack, base: number, level: number): number[] {
    let newBase = base;
    let retvals = [newBase];
    while (level > 0) {
        if (!Number.isInteger(newBase) || newBase < 0 || newBase >= stack.stackItems.length) {
            return [-1];
        }
        newBase = Number(stack.stackItems[newBase].value);
        level--;

        if (newBase == 0 && level != 0) {
            return [-1];
        }
        retvals.push(newBase);
    }
    return retvals;
}

// ------------------------------------------- STACK UTILITY FUNCTIONS

// ------------------------------------------- INSTRUCTION FUNCTIONS

export function ExplainInstruction(params: InstructionStepParameters): Explanation {
    if (!params.instructions || params.model.pc >= params.instructions.length) {
        return { message: '', placeholders: [] };
    }

    let instruction = params.instructions[params.model.pc];
    let op = instruction.instruction;
    let level = instruction.level;
    let parameter = instruction.parameter;

    let heap = params.model.heap;
    let stack = params.model.stack;

    let explanation: Explanation = {
        message: '',
        placeholders: [],
    };

    const sp = params.model.sp;
    if (
        (op === InstructionType.JMC ||
            op === InstructionType.STO ||
            op === InstructionType.WRI ||
            op === InstructionType.NEW ||
            op === InstructionType.DEL ||
            op === InstructionType.LDA ||
            op === InstructionType.STA ||
            op === InstructionType.PLD ||
            op === InstructionType.PST ||
            op === InstructionType.ITR ||
            op === InstructionType.RTI) &&
        sp < 0
    ) {
        return {
            message: i18next.t('core:modelStackNegativeError'),
            placeholders: [],
        };
    }

    // Shared by several cases below, so they must be declared outside the switch
    // (a `let` inside one case is in the temporal dead zone for the other cases)
    let bases: number[];
    let tmp: number | string;

    try {
        switch (op) {
            case InstructionType.LIT:
                explanation.message = i18next.t('core:explainerLIT');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: instruction.parameter_str || parameter,
                    heap: [],
                    stack: [],
                    instructions: [],
                    level: false,
                    parameter: true,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
                break;
        case InstructionType.OPR:
            explanation = ExplainOPR(stack, parameter, params.model.sp);
            break;
        case InstructionType.INT:
            explanation.message = i18next.t('core:explainerINT');
            explanation.placeholders.push({
                placeholder: '1',
                value: parameter,
                heap: [],
                stack: [],
                instructions: [],
                level: false,
                parameter: true,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case InstructionType.JMP:
            explanation.placeholders.push({
                placeholder: '1',
                value: parameter,
                heap: [],
                stack: [],
                instructions: [],
                level: false,
                parameter: true,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            if (parameter >= params.instructions.length) {
                explanation.message = i18next.t('core:explainerJMPErr');
            } else {
                explanation.message = i18next.t('core:explainerJMP');
                explanation.placeholders[0].instructions.push(parameter);
            }
            break;
        case InstructionType.JMC:
            if (stack.stackItems[params.model.sp].value == 0) {
                if (parameter >= params.instructions.length) {
                    explanation.message = i18next.t('core:explainerJMCNonExistent');
                    explanation.placeholders.push({
                        placeholder: '1',
                        value: stack.stackItems[params.model.sp].value,
                        heap: [],
                        stack: [params.model.sp],
                        instructions: [],
                        level: false,
                        parameter: false,
                        output: false,
                        input: false,
                        highlightType: HighlightType.BOLD,
                    });
                    explanation.placeholders.push({
                        placeholder: '2',
                        value: parameter,
                        heap: [],
                        stack: [],
                        instructions: [],
                        level: false,
                        parameter: true,
                        output: false,
                        input: false,
                        highlightType: HighlightType.BOLD,
                    });
                } else {
                    explanation.message = i18next.t('core:explainerJMCJump');
                    explanation.placeholders.push({
                        placeholder: '1',
                        value: stack.stackItems[params.model.sp].value,
                        heap: [],
                        stack: [params.model.sp],
                        instructions: [],
                        level: false,
                        parameter: false,
                        output: false,
                        input: false,
                        highlightType: HighlightType.BOLD,
                    });
                    explanation.placeholders.push({
                        placeholder: '2',
                        value: parameter,
                        heap: [],
                        stack: [params.model.sp],
                        instructions: [parameter],
                        level: false,
                        parameter: false,
                        output: false,
                        input: false,
                        highlightType: HighlightType.BOLD,
                    });
                }
                explanation.message;
            } else {
                explanation.message = i18next.t('core:explainerJMCDontJump');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: stack.stackItems[params.model.sp].value,
                    heap: [],
                    stack: [params.model.sp],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
            }
            break;
        case InstructionType.CAL:
            if (parameter >= params.instructions.length) {
                explanation.message = i18next.t('core:explainerCALOutOfBoundsInstr');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: parameter,
                    heap: [],
                    stack: [],
                    instructions: [],
                    level: false,
                    parameter: true,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
                break;
            }

            let levels = FindBaseDummy(stack, params.model.base, level);
            if (levels[0] == -1) {
                explanation.message = i18next.t('core:explainerLevelTooHigh');
                break;
            }
            explanation.message =
                i18next.t('core:explainerCALOk1') +
                (params.model.pc + 1) +
                i18next.t('core:explainerCALOk2');
            explanation.placeholders.push({
                placeholder: '1',
                value: parameter,
                heap: [],
                stack: [],
                instructions: [parameter],
                level: false,
                parameter: true,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: params.model.base,
                heap: [],
                stack: [params.model.base],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: levels[levels.length - 1],
                heap: [],
                stack: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            for (let i = 0; i < levels.length; i++) {
                explanation.placeholders[2].stack.push(levels[i]);
            }
            break;
        case InstructionType.RET:
            if (params.model.base == 0) {
                explanation.message = i18next.t('core:explainerRETEnd');
                break;
            }

            explanation.message = i18next.t('core:explainerRET');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[params.model.base + 2].value,
                heap: [],
                stack: [params.model.base + 2],
                instructions: [Number(stack.stackItems[params.model.base + 2].value)],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[params.model.base + 1].value,
                heap: [],
                stack: [params.model.base + 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: params.model.base - 1,
                heap: [],
                stack: [params.model.base - 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case InstructionType.LOD:
            bases = FindBaseDummy(stack, params.model.base, level);
            if (bases[0] == -1) {
                explanation.message = i18next.t('core:explainerLevelTooHigh');
                break;
            }

            var address = bases[bases.length - 1] + parameter;

            if (address < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                break;
            }

            if (address > stack.stackItems.length - 1) {
                tmp = 0;
            } else {
                tmp = stack.stackItems[address].value;
            }

            explanation.message =
                i18next.t('core:explainerLOD1') +
                address +
                i18next.t('core:explainerLOD2') +
                tmp +
                i18next.t('core:explainerLOD3');
            explanation.placeholders.push({
                placeholder: '1',
                value: level,
                heap: [],
                stack: [],
                instructions: [],
                level: true,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            for (let i = 0; i < bases.length; i++) {
                explanation.placeholders[0].stack.push(bases[i]);
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: parameter,
                heap: [],
                stack: [address],
                instructions: [],
                level: false,
                parameter: true,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            break;
        case InstructionType.STO:
            bases = FindBaseDummy(stack, params.model.base, level);
            if (bases[0] == -1) {
                explanation.message = i18next.t('core:explainerLevelTooHigh');
                break;
            }

            var address = bases[bases.length - 1] + parameter;

            if (address < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                break;
            }

            explanation.message = i18next.t('core:explainerSTO') + address + ')';
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[params.model.sp].value,
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: level,
                heap: [],
                stack: [],
                instructions: [],
                level: true,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            for (let i = 0; i < bases.length; i++) {
                explanation.placeholders[1].stack.push(bases[i]);
            }
            explanation.placeholders.push({
                placeholder: '3',
                value: parameter,
                heap: [],
                stack: [address],
                instructions: [],
                level: false,
                parameter: true,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case InstructionType.WRI:
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[params.model.sp].value,
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            let wriVal = stack.stackItems[params.model.sp].value;
            let wriCode: number;
            if (typeof wriVal === 'string' && wriVal.length === 1 && Number.isNaN(Number(wriVal))) {
                wriCode = wriVal.charCodeAt(0);
            } else {
                wriCode = Number(wriVal);
            }

            if (Number.isNaN(wriCode) || wriCode < 0 || wriCode > 255) {
                explanation.message = i18next.t('core:explainerWRIAsciiErr');
            } else {
                explanation.message = i18next.t('core:explainerWRI');
                explanation.placeholders.push(
                    TextPlaceholder('2', DisplayCharacter(String.fromCharCode(wriCode)))
                );
            }
            break;
        case InstructionType.REA:
            if (params.input.length == 0) {
                explanation.message = i18next.t('core:explainerREAInputEmpty');
            } else if (params.input.charCodeAt(0) > 255) {
                explanation.message = String(i18next.t('core:modelReadNonAscii'))
                    .replace('%1', params.input.charAt(0))
                    .replace('%2', params.input.charCodeAt(0).toString());
            } else {
                explanation.message = i18next.t('core:explainerREA');
                explanation.placeholders.push(
                    TextPlaceholder('1', DisplayCharacter(params.input.charAt(0)))
                );
                explanation.placeholders.push(
                    TextPlaceholder('2', params.input.charCodeAt(0))
                );
            }
            break;
        case InstructionType.NEW:
            var count = Number(stack.stackItems[params.model.sp].value);
            explanation.placeholders.push({
                placeholder: '1',
                value: count,
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (!Number.isInteger(count) || count <= 0 || count > params.model.heap.size) {
                explanation.message = i18next.t('core:explainerNEWInvalidArg');
            } else {
                let res = AllocateDummy(heap, count);
                if (res == -1) {
                    explanation.message = i18next.t('core:explainerNEWNoFreeSpace');
                } else {
                    explanation.message = i18next.t('core:explainerNEW');
                    explanation.placeholders.push({
                        placeholder: '2',
                        value: res,
                        heap: [],
                        stack: [],
                        instructions: [],
                        level: false,
                        parameter: false,
                        output: false,
                        input: false,
                        highlightType: HighlightType.BACKGROUND,
                    });
                    for (let i = 0; i < count; i++) {
                        explanation.placeholders[1].heap.push(res + i);
                    }
                }
            }
            break;
        case InstructionType.DEL:
            var addr = Number(stack.stackItems[params.model.sp].value);
            let res = FreeDummy(heap, addr);

            if (res == -1) {
                explanation.message = i18next.t('core:explainerDELError');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: addr,
                    heap: [],
                    stack: [params.model.sp],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
            } else {
                explanation.message = i18next.t('core:explainerDEL');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: res,
                    heap: [],
                    stack: [],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
                explanation.placeholders.push({
                    placeholder: '2',
                    value: addr,
                    heap: [],
                    stack: [],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BACKGROUND,
                });
                for (let i = 0; i < res; i++) {
                    explanation.placeholders[1].heap.push(addr + i);
                }
            }

            break;
        case InstructionType.LDA:
            var addr = Number(stack.stackItems[params.model.sp].value);
            explanation.placeholders.push({
                placeholder: '1',
                value: addr,
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            if (addr < 0 || addr >= heap.size) {
                explanation.message = i18next.t('core:explainerLDAOutOfBounds');
            } else {
                let res = GetValueFromHeapDummy(heap, addr);
                if (res === null) {
                    explanation.message = i18next.t('core:explainerLDAOutOfBounds');
                } else if (Number.isNaN(res)) {
                    explanation.message = i18next.t('core:explainerLDAUnallocated');
                    explanation.placeholders[0].highlightType = HighlightType.BACKGROUND;
                    explanation.placeholders[0].heap.push(addr);
                } else {
                    explanation.message = i18next.t('core:explainerLDA');
                    explanation.placeholders[0].highlightType = HighlightType.BACKGROUND;
                    explanation.placeholders[0].heap.push(addr);
                }
            }
            break;
        case InstructionType.STA:
            if (params.model.sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                return explanation;
            }

            var addr = Number(stack.stackItems[params.model.sp - 1].value);
            var val = Number(stack.stackItems[params.model.sp].value);
            var temp = PutValueOnHeapDummy(heap, addr);

            if (temp == -2) {
                explanation.message = i18next.t('core:explainerSTAUnallocated');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: addr,
                    heap: [addr],
                    stack: [params.model.sp - 1],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BACKGROUND,
                });
            } else if (temp == -1) {
                explanation.message = i18next.t('core:explainerSTAOutOfBounds');
            } else {
                explanation.message = i18next.t('core:explainerSTA');
                explanation.placeholders.push({
                    placeholder: '1',
                    value: val,
                    heap: [],
                    stack: [params.model.sp],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BOLD,
                });
                explanation.placeholders.push({
                    placeholder: '2',
                    value: addr,
                    heap: [addr],
                    stack: [params.model.sp - 1],
                    instructions: [],
                    level: false,
                    parameter: false,
                    output: false,
                    input: false,
                    highlightType: HighlightType.BACKGROUND,
                });
            }
            break;
        case InstructionType.PLD:
            var values = GetValuesFromStack(stack, params.model.sp, 2);
            if (!Number.isInteger(Number(values[1])) || Number(values[1]) < 0) {
                explanation.message = InvalidLevelMessage(values[1]);
                break;
            }
            bases = FindBaseDummy(stack, params.model.base, Number(values[1]));
            if (bases[0] == -1) {
                explanation.message = i18next.t('core:explainerLevelTooHigh');
                break;
            }

            var address = bases[bases.length - 1] + Number(values[0]);
            if (!Number.isInteger(address) || address < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                break;
            }

            if (address > stack.stackItems.length - 1) {
                tmp = 0;
            } else {
                tmp = stack.stackItems[address].value;
            }

            explanation.message =
                i18next.t('core:explainerLOD1') +
                address +
                i18next.t('core:explainerLOD2') +
                tmp +
                i18next.t('core:explainerLOD3');

            explanation.placeholders.push({
                placeholder: '1',
                value: values[1],
                heap: [],
                stack: [params.model.sp - 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            for (let i = 0; i < bases.length; i++) {
                explanation.placeholders[0].stack.push(bases[i]);
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: values[0],
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: bases[bases.length - 1] + Number(values[0]),
                heap: [],
                stack: [bases[bases.length - 1] + Number(values[0])],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case InstructionType.PST:
            var values = GetValuesFromStack(stack, params.model.sp, 3);
            if (!Number.isInteger(Number(values[1])) || Number(values[1]) < 0) {
                explanation.message = InvalidLevelMessage(values[1]);
                break;
            }
            bases = FindBaseDummy(stack, params.model.base, Number(values[1]));
            if (bases[0] == -1) {
                explanation.message = i18next.t('core:explainerLevelTooHigh');
                break;
            }

            var address = bases[bases.length - 1] + Number(values[0]);
            if (!Number.isInteger(address) || address < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                break;
            }

            explanation.message = i18next.t('core:explainerPST');

            explanation.placeholders.push({
                placeholder: '1',
                value: values[2],
                heap: [],
                stack: [params.model.sp - 2],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: values[1],
                heap: [],
                stack: [params.model.sp - 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            for (let i = 0; i < bases.length; i++) {
                explanation.placeholders[1].stack.push(bases[i]);
            }
            explanation.placeholders.push({
                placeholder: '3',
                value: values[0],
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: bases[bases.length - 1] + Number(values[0]),
                heap: [],
                stack: [bases[bases.length - 1] + Number(values[0])],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case InstructionType.ITR:
            var values = GetValuesFromStack(stack, params.model.sp, 2);

            explanation.message = i18next.t('core:explainerITR');

            explanation.placeholders.push({
                placeholder: '1',
                value: values[1],
                heap: [],
                stack: [params.model.sp - 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: values[0],
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case InstructionType.RTI:
            var values = GetValuesFromStack(stack, params.model.sp, 2);

            if (parameter == 0) {
                explanation.message = i18next.t('core:explainerRTI');
            }
            else if (parameter == 1) {
                explanation.message = i18next.t('core:explainerRTI2');
            }

            explanation.placeholders.push({
                placeholder: '1',
                value: values[1],
                heap: [],
                stack: [params.model.sp - 1],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '2',
                value: values[0],
                heap: [],
                stack: [params.model.sp],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case InstructionType.OPF:
            explanation = ExplainOPF(stack, parameter, params.model.sp);
            break;
        default:
            throw new Error(i18next.t('core:modelNonExistentInstructionError'));
    }

    return explanation;
    } catch (e) {
        return {
            message: (e as Error).message || '',
            placeholders: [],
        };
    }
}

function ExplainOPR(stack: Stack, operation: number, sp: number): Explanation {
    let e_op = operation as OperationType;
    let explanation: Explanation = { message: '', placeholders: [] };

    if (sp < 0) {
        explanation.message = i18next.t('core:modelStackNegativeError');
        return explanation;
    }

    switch (e_op) {
        case OperationType.U_MINUS:
            explanation.message = i18next.t('core:explainerOPR1');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.ADD:
            explanation.message = i18next.t('core:explainerOPR2');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.SUB:
            explanation.message = i18next.t('core:explainerOPR3');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.MULT:
            explanation.message = i18next.t('core:explainerOPR4');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.DIV:
            explanation.message = i18next.t('core:explainerOPR5');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.MOD:
            explanation.message = i18next.t('core:explainerOPR6');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
            break;
        case OperationType.IS_ODD:
            explanation.message = i18next.t('core:explainerOPR7');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.EQ:
            explanation.message = i18next.t('core:explainerOPR8');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.N_EQ:
            explanation.message = i18next.t('core:explainerOPR9');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.LESS_THAN:
            explanation.message = i18next.t('core:explainerOPR10');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.MORE_EQ_THAN:
            explanation.message = i18next.t('core:explainerOPR11');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.MORE_THAN:
            explanation.message = i18next.t('core:explainerOPR12');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        case OperationType.LESS_EQ_THAN:
            explanation.message = i18next.t('core:explainerOPR13');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }

            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            break;
        default:
            explanation.message = i18next.t('core:modelUnknownOPR');
    }

    return explanation;
}

function ExplainOPF(stack: Stack, operation: number, sp: number): Explanation {
    let e_op = operation as OperationType;
    let explanation: Explanation = { message: '', placeholders: [] };

    if (sp < 0) {
        explanation.message = i18next.t('core:modelStackNegativeError');
        return explanation;
    }

    switch (e_op) {
        case OperationType.U_MINUS:
            explanation.message = i18next.t('core:explainerOPF1');

            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.ADD:
            explanation.message = i18next.t('core:explainerOPF2');

            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.SUB:
            explanation.message = i18next.t('core:explainerOPF3');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.MULT:
            explanation.message = i18next.t('core:explainerOPF4');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.DIV:
            explanation.message = i18next.t('core:explainerOPF5');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.MOD:
            explanation.message = i18next.t('core:explainerOPF6');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
            break;
        case OperationType.IS_ODD:
            explanation.message = i18next.t('core:explainerOPF7');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            if (sp - 1 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.EQ:
            explanation.message = i18next.t('core:explainerOPF8');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.N_EQ:
            explanation.message = i18next.t('core:explainerOPF9');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.LESS_THAN:
            explanation.message = i18next.t('core:explainerOPF10');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.MORE_EQ_THAN:
            explanation.message = i18next.t('core:explainerOPF11');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.MORE_THAN:
            explanation.message = i18next.t('core:explainerOPF12');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        case OperationType.LESS_EQ_THAN:
            explanation.message = i18next.t('core:explainerOPF13');
            explanation.placeholders.push({
                placeholder: '1',
                value: stack.stackItems[sp].value,
                stack: [sp],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });

            if (sp - 3 < 0) {
                explanation.message = i18next.t('core:modelStackNegativeError');
                explanation.placeholders = [];
                return explanation;
            }
            explanation.placeholders.push({
                placeholder: '2',
                value: stack.stackItems[sp - 1].value,
                stack: [sp - 1],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BOLD,
            });
            explanation.placeholders.push({
                placeholder: '3',
                value: stack.stackItems[sp - 2].value,
                stack: [sp - 2],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            explanation.placeholders.push({
                placeholder: '4',
                value: stack.stackItems[sp - 3].value,
                stack: [sp - 3],
                heap: [],
                instructions: [],
                level: false,
                parameter: false,
                output: false,
                input: false,
                highlightType: HighlightType.BACKGROUND,
            });
            break;
        default:
            explanation.message = i18next.t('core:modelUnknownOPF');
    }

    return explanation;
}
