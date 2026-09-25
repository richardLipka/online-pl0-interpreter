import { ExplanationMessagePart } from './highlighting';

import {
    Allocate,
    EffectiveHeapAddress,
    Free,
    GetHeapCellRole,
    GetValueFromHeap,
    PutValueOnHeap,
    UpdateHeapBlocks,
} from './allocator';

import i18next from 'i18next';
import type { Directive, DirectiveResult } from './directives';

// ------------------------------------------- INTERFACES

export interface ExecutionStatistics {
    totalInstructionsExecuted: number;
    completedNormally: boolean;
    haltedOnError: boolean;
    lastHaltError?: string;

    instructionCounts: Record<string, number>;
    categoryCounts: {
        arithmeticLogic: number;
        memoryStack: number;
        controlFlow: number;
        procedureCalls: number;
        heapOperations: number;
        ioOperations: number;
    };

    jumpsExecuted: number;
    conditionalJumpsExecuted: number;
    conditionalJumpsTaken: number;
    conditionalJumpsNotTaken: number;
    branchTakenRatio: number;

    procedureCallsCount: number;
    procedureReturnsCount: number;
    peakCallStackDepth: number;
    currentCallStackDepth: number;

    currentStackSize: number;
    peakStackSize: number;

    currentHeapAllocatedCells: number;
    peakHeapAllocatedCells: number;
    totalHeapAllocations: number;
    totalHeapDeallocations: number;
    activeHeapBlocks: number;
    peakHeapBlocks: number;

    peakTotalMemoryOccupied: number;
    warningsCount: number;
}

export function CreateDefaultStatistics(): ExecutionStatistics {
    return {
        totalInstructionsExecuted: 0,
        completedNormally: false,
        haltedOnError: false,

        instructionCounts: {},
        categoryCounts: {
            arithmeticLogic: 0,
            memoryStack: 0,
            controlFlow: 0,
            procedureCalls: 0,
            heapOperations: 0,
            ioOperations: 0,
        },

        jumpsExecuted: 0,
        conditionalJumpsExecuted: 0,
        conditionalJumpsTaken: 0,
        conditionalJumpsNotTaken: 0,
        branchTakenRatio: 0,

        procedureCallsCount: 0,
        procedureReturnsCount: 0,
        peakCallStackDepth: 1,
        currentCallStackDepth: 1,

        currentStackSize: 0,
        peakStackSize: 0,

        currentHeapAllocatedCells: 0,
        peakHeapAllocatedCells: 0,
        totalHeapAllocations: 0,
        totalHeapDeallocations: 0,
        activeHeapBlocks: 0,
        peakHeapBlocks: 0,

        peakTotalMemoryOccupied: 0,
        warningsCount: 0,
    };
}

export interface DataModel {
    pc: number;
    base: number;
    sp: number;

    stack: Stack;
    heap: Heap;

    input: string;
    output: string;

    stats?: ExecutionStatistics;
}

export interface Stack {
    maxSize: number;

    stackItems: StackItem[];
    stackFrames: StackFrame[];
}
export interface StackItem {
    value: number | string;
}
export interface StackFrame {
    index: number;
    size: number;
}

export enum AllocatorType {
    SINGLE_LINKED = 0,
    DOUBLY_LINKED = 1,
}

export interface Heap {
    size: number;
    values: number[];
    allocatorType?: AllocatorType;

    heapBlocks: HeapBlock[];
}

export interface HeapBlock {
    // where the data starts (aka the index the Allocate method returns)
    dataAddress: number;
    // how big the data part of the block is (the part user is supposed to use)
    dataSize: number;

    // this is the index in heap.values where the whole block starts (including the allocator info)
    blockAddress: number;
    // how big the block is incl. the allocator info
    blockSize: number;

    // whether the block is free or not
    free: boolean;

    // indices of all the cells in the block, which are used by allocator (block size, empty/free, ...)
    allocatorInfoIndices: number[];
}

export enum HeapCellType {
    NOT_ALLOCATED,
    NOT_ALLOCATED_META,
    ALLOCATED_META,
    ALLOCATED_DATA,

    UNKNOWN,
}

export enum InstructionType {
    LIT,
    OPR,
    LOD,
    STO,
    CAL,
    INT,
    JMP,
    JMC,
    RET,
    REA,
    WRI,
    NEW,
    DEL,
    LDA,
    STA,
    PLD,
    PST,
    OPF,
    ITR,
    RTI
}

export enum OperationType {
    U_MINUS = 1,
    ADD = 2,
    SUB = 3,
    MULT = 4,
    DIV = 5,
    MOD = 6,
    IS_ODD = 7,
    EQ = 8,
    N_EQ = 9,
    LESS_THAN = 10,
    MORE_EQ_THAN = 11,
    MORE_THAN = 12,
    LESS_EQ_THAN = 13,
}

export interface Instruction {
    index: number;
    instruction: InstructionType;
    level: number;
    parameter: number;
    parameter_str: string;
    explanationParts: ExplanationMessagePart[] | null;
    preDirectives?: Directive[];
    postDirectives?: Directive[];
}

export interface InstructionStepParameters {
    model: DataModel;
    instructions: Instruction[];
    input: string;
    disableDirectives?: boolean;
}
export interface InstructionStepResult {
    isEnd: boolean;

    output: string;

    warnings: string[];
    inputNextStep: string;
    directiveResults?: DirectiveResult[];
}

export enum EmulationState {
    NOT_STARTED,
    PAUSED,
    FINISHED,
    ERROR,
}

// ------------------------------------------- INTERFACES

// ------------------------------------------- HEAP UTILITY FUNCTIONS

// ------------------------------------------- HEAP UTILITY FUNCTIONS

// ------------------------------------------- STACK UTILITY FUNCTIONS

function GetValuesFromStack(
    stack: Stack,
    index: number,
    count: number,
    decrementCurrentFrame: boolean = true
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
        if (decrementCurrentFrame && stack.stackFrames.length > 0) {
            stack.stackFrames[stack.stackFrames.length - 1].size = Math.max(
                0,
                stack.stackFrames[stack.stackFrames.length - 1].size - 1
            );
        }
    }
    return retvals;
}

function StackOverflowError(stack: Stack): Error {
    const msg = String(i18next.t('core:modelMaxStackSizeError'));
    return new Error(msg.replace('%1', stack.maxSize.toString()));
}

// Throws a localized error when a computed stack address is negative or not an integer
function CheckStackAddress(address: number) {
    if (!Number.isInteger(address)) {
        const msg = String(i18next.t('core:modelStackInvalidAddress'));
        throw new Error(msg.replace('%1', String(address)));
    }
    if (address < 0) {
        const msg = String(i18next.t('core:modelStackNegativeAddress'));
        throw new Error(msg.replace('%1', address.toString()));
    }
}

// A negative address (offset) reaches below the base of the target frame, e.g. LOD 0 -1 reads
// a value the caller pushed before CAL. That is allowed, but easy to get wrong, so it is flagged.
function WarnNegativeOffset(
    warnings: string[],
    key: 'core:modelStackWarnNegativeRead' | 'core:modelStackWarnNegativeWrite',
    offset: number,
    address: number
) {
    if (offset < 0) {
        const msg = String(i18next.t(key));
        warnings.push(msg.replace('%1', offset.toString()).replace('%2', address.toString()));
    }
}

// A negative heap address wraps around to the end of the heap (-1 is the last cell).
// That is allowed, but it is usually a bug (e.g. using the -1 returned by a failed NEW), so it is flagged.
function ResolveHeapAddress(heap: Heap, address: number, warnings: string[]): number {
    const effective = EffectiveHeapAddress(heap, address);
    if (effective !== address) {
        const msg = String(i18next.t('core:modelHeapWarnNegative'));
        warnings.push(
            msg.replace('%1', address.toString()).replace('%2', effective.toString()).replace('%3', heap.size.toString())
        );
    }
    return effective;
}

// Throws a localized error when a jump target is not a valid instruction index.
// allowEnd permits jumping just past the last instruction (the program then ends).
function CheckJumpTarget(target: number, instructionCount: number, allowEnd: boolean = false) {
    if (target < 0) {
        const msg = String(i18next.t('core:modelJumpNegativeAddress'));
        throw new Error(msg.replace('%1', target.toString()));
    }
    const lastAllowed = allowEnd ? instructionCount : instructionCount - 1;
    if (!Number.isInteger(target) || target > lastAllowed) {
        const msg = String(i18next.t('core:modelJumpEmptyMemory'));
        throw new Error(msg.replace('%1', String(target)));
    }
}

function GetValueFromStack(stack: Stack, index: number) {
    CheckStackAddress(index);
    if (index >= stack.stackItems.length) {
        while (stack.stackItems.length - 1 != index) {
            stack.stackItems.push({ value: 0 });
            if (stack.stackItems.length > stack.maxSize) {
                throw StackOverflowError(stack);
            }
        }
        return 0;
    } else {
        return stack.stackItems[index].value;
    }
}

function PutOntoStack(stack: Stack, index: number, value: number | string) {
    CheckStackAddress(index);
    if (index >= stack.maxSize) {
        throw StackOverflowError(stack);
    }

    while (stack.stackItems.length - 1 < index) {
        stack.stackItems.push({ value: 0 });
    }

    stack.stackItems[index].value = value;
}

function ConvertToStackItems(...values: any[]): StackItem[] {
    let items: StackItem[] = [];
    for (let i = 0; i < values.length; i++) {
        items.push({ value: values[i] });
    }
    return items;
}

// Pushes StackItems onto stack
// Check if the stack if large enough and expands it if needed
// Returns new stack pointer
function PushOntoStack(
    stack: Stack,
    sp: number,
    values: StackItem[],
    increment: boolean = true
): number {
    let currentStackFrame: StackFrame | undefined = stack.stackFrames[stack.stackFrames.length - 1];
    for (let i = 0; i < values.length; i++) {
        if (increment) {
            sp++;
            if (currentStackFrame) {
                currentStackFrame.size++;
            }
        }

        if (sp > stack.stackItems.length - 1) {
            stack.stackItems.push({ value: 0 });
        }
        stack.stackItems[sp] = values[i];
    }

    if (!CheckStackSize(stack)) {
        throw StackOverflowError(stack);
    }

    return sp;
}

// Checks if stack size is larger than the maximum permissible value
function CheckStackSize(stack: Stack) {
    if (stack.stackItems.length > stack.maxSize) {
        return false;
    }
    return true;
}

// Checks if SP is not pointing under the stack
function CheckSPInBounds(sp: number) {
    if (sp < 0) {
        return false;
    } else {
        return true;
    }
}

function FindBase(stack: Stack, base: number, level: number): number {
    if (!Number.isInteger(level) || level < 0) {
        const msg = String(i18next.t('core:modelInvalidLevel'));
        throw new Error(msg.replace('%1', String(level)));
    }
    let newBase = base;
    while (level > 0) {
        if (!Number.isInteger(newBase) || newBase < 0 || newBase >= stack.stackItems.length) {
            throw new Error(i18next.t('core:modelBaseSearchError') + level + ')');
        }
        newBase = Number(stack.stackItems[newBase].value);
        level--;

        if (newBase == 0 && level != 0) {
            throw new Error(i18next.t('core:modelBaseSearchError') + level + ')');
        }
    }
    return newBase;
}

// ------------------------------------------- STACK UTILITY FUNCTIONS

// ------------------------------------------- INSTRUCTION FUNCTIONS

export function DoStep(params: InstructionStepParameters): InstructionStepResult {
    if (
        !Number.isInteger(params.model.pc) ||
        params.model.pc < 0 ||
        params.model.pc >= params.instructions.length
    ) {
        throw new Error(i18next.t('core:modelNonExistentInstructionError'));
    }

    let instruction = params.instructions[params.model.pc];
    let op = instruction.instruction;
    let level = instruction.level;
    let parameter = instruction.parameter;
    let parameter_str = instruction.parameter_str;

    let heap = params.model.heap;
    let stack = params.model.stack;

    let inputString = params.input;
    let warnings: string[] = [];
    let isEnd = false;

    let whole_part;
    let fractional_part;
    let mantissa;
    let exponent;

    if (!params.model.stats) {
        params.model.stats = CreateDefaultStatistics();
    }
    const stats = params.model.stats;
    stats.totalInstructionsExecuted++;

    const mnemonic = InstructionType[op] || 'UNKNOWN';
    stats.instructionCounts[mnemonic] = (stats.instructionCounts[mnemonic] || 0) + 1;

    switch (op) {
        case InstructionType.OPR:
        case InstructionType.OPF:
        case InstructionType.ITR:
        case InstructionType.RTI:
            stats.categoryCounts.arithmeticLogic++;
            break;
        case InstructionType.LIT:
        case InstructionType.LOD:
        case InstructionType.STO:
        case InstructionType.INT:
        case InstructionType.PLD:
        case InstructionType.PST:
            stats.categoryCounts.memoryStack++;
            break;
        case InstructionType.JMP:
        case InstructionType.JMC:
            stats.categoryCounts.controlFlow++;
            break;
        case InstructionType.CAL:
        case InstructionType.RET:
            stats.categoryCounts.procedureCalls++;
            break;
        case InstructionType.NEW:
        case InstructionType.DEL:
        case InstructionType.LDA:
        case InstructionType.STA:
            stats.categoryCounts.heapOperations++;
            break;
        case InstructionType.REA:
        case InstructionType.WRI:
            stats.categoryCounts.ioOperations++;
            break;
    }

    if (op === InstructionType.JMP) {
        stats.jumpsExecuted++;
    } else if (op === InstructionType.CAL) {
        stats.procedureCallsCount++;
    } else if (op === InstructionType.RET) {
        stats.procedureReturnsCount++;
    } else if (op === InstructionType.NEW) {
        stats.totalHeapAllocations++;
    } else if (op === InstructionType.DEL) {
        stats.totalHeapDeallocations++;
    }

    switch (op) {
        case InstructionType.LIT:
            let litVal: number | string = parameter_str;
            // Numeric literals are pushed as numbers, except integers written with leading
            // zeros (e.g. "05"), which keep their text so that ITR can use them as the
            // fractional part of a real number (3 and 05 -> 3.05)
            if (
                !Number.isNaN(Number(parameter_str)) &&
                parameter_str.trim() !== '' &&
                !/^[+-]?0\d+$/.test(parameter_str.trim())
            ) {
                litVal = Number(parameter_str);
            }
            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(litVal)
            );
            params.model.pc++;
            break;
        case InstructionType.OPR:
            params.model.sp = PerformOPR(stack, parameter, params.model.sp);
            params.model.pc++;
            break;
        case InstructionType.INT:
            params.model.sp = PerformINT(stack, params.model.sp, parameter);
            params.model.pc++;
            break;
        case InstructionType.JMP:
            CheckJumpTarget(parameter, params.instructions.length);
            params.model.pc = parameter;
            break;
        case InstructionType.JMC:
            stats.conditionalJumpsExecuted++;
            var operands = GetValuesFromStack(stack, params.model.sp, 1);
            params.model.sp--;
            if (operands[0] == 0) {
                stats.conditionalJumpsTaken++;
                CheckJumpTarget(parameter, params.instructions.length);
                params.model.pc = parameter;
            } else {
                stats.conditionalJumpsNotTaken++;
                params.model.pc++;
            }
            break;
        case InstructionType.CAL:
            CheckJumpTarget(parameter, params.instructions.length);
            let newBase = FindBase(stack, params.model.base, level);
            PushOntoStack(
                stack,
                params.model.sp + 1,
                ConvertToStackItems(newBase),
                false
            );
            PushOntoStack(
                stack,
                params.model.sp + 2,
                ConvertToStackItems(params.model.base),
                false
            );
            PushOntoStack(
                stack,
                params.model.sp + 3,
                ConvertToStackItems(params.model.pc + 1),
                false
            );

            stack.stackFrames.push({ index: params.model.sp + 1, size: 0 });

            params.model.base = params.model.sp + 1;
            params.model.pc = parameter;
            break;
        case InstructionType.RET:
            if (params.model.base == 0) {
                isEnd = true;
                break;
            }

            var res = GetValuesFromStack(
                params.model.stack,
                params.model.base + 2,
                2,
                false
            );

            let retPc = Number(res[0]);
            let retBase = Number(res[1]);

            // Returning just past the last instruction is allowed - the program then ends
            CheckJumpTarget(retPc, params.instructions.length, true);
            CheckStackAddress(retBase);

            params.model.sp = params.model.base - 1;
            params.model.pc = retPc;
            params.model.base = retBase;
            params.model.stack.stackFrames.pop();
            break;
        case InstructionType.LOD:
            var base = FindBase(stack, params.model.base, level);
            var address = base + parameter;
            CheckStackAddress(address);
            WarnNegativeOffset(warnings, 'core:modelStackWarnNegativeRead', parameter, address);
            if (address > params.model.sp) {
                const msg = String(i18next.t('core:modelStackWarnReadUnallocated') || 'Warning: Reading from unallocated stack memory at index %1 (SP is %2)');
                warnings.push(msg.replace('%1', address.toString()).replace('%2', params.model.sp.toString()));
            }
            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(GetValueFromStack(stack, address))
            );
            params.model.pc++;
            break;
        case InstructionType.STO:
            var base = FindBase(stack, params.model.base, level);
            var address = base + parameter;
            var res = GetValuesFromStack(stack, params.model.sp, 1);
            let stoVal = res[0];
            if (typeof stoVal === 'string' && !Number.isNaN(Number(stoVal)) && stoVal.trim() !== '') {
                stoVal = Number(stoVal);
            }
            CheckStackAddress(address);
            WarnNegativeOffset(warnings, 'core:modelStackWarnNegativeWrite', parameter, address);
            if (parameter === 0) {
                const msg = String(i18next.t('core:modelStackWarnWriteSB') || 'Warning: Overwriting static base (SB) at stack index %1 with value %2');
                warnings.push(msg.replace('%1', address.toString()).replace('%2', stoVal.toString()));
            } else if (parameter === 1) {
                const msg = String(i18next.t('core:modelStackWarnWriteDB') || 'Warning: Overwriting dynamic base (DB) at stack index %1 with value %2');
                warnings.push(msg.replace('%1', address.toString()).replace('%2', stoVal.toString()));
            } else if (parameter === 2) {
                const msg = String(i18next.t('core:modelStackWarnWritePC') || 'Warning: Overwriting return PC at stack index %1 with value %2');
                warnings.push(msg.replace('%1', address.toString()).replace('%2', stoVal.toString()));
            } else if (address > params.model.sp) {
                const msg = String(i18next.t('core:modelStackWarnWriteUnallocated') || 'Warning: Write into unallocated stack memory at index %1');
                warnings.push(msg.replace('%1', address.toString()));
            }
            PutOntoStack(stack, address, stoVal);
            params.model.sp--;
            params.model.pc++;
            break;
        case InstructionType.WRI:
            var code = GetValuesFromStack(stack, params.model.sp, 1);
            let numCode: number;
            if (typeof code[0] === 'string' && code[0].length === 1 && Number.isNaN(Number(code[0]))) {
                numCode = code[0].charCodeAt(0);
            } else {
                numCode = Number(code[0]);
            }

            if (Number.isNaN(numCode) || numCode < 0 || numCode > 255) {
                throw new Error(i18next.t('core:modelReadInvalidInput'));
            }

            params.model.output += String.fromCharCode(numCode);

            // Writing the two characters '\' and 'n' produces a line break
            if (params.model.output.endsWith('\\n')) {
                params.model.output = params.model.output.slice(0, -2) + '\n';
            }

            params.model.sp--;
            params.model.pc++;
            break;
        case InstructionType.REA:
            if (inputString.length == 0) {
                throw new Error(i18next.t('core:modelReadInputEmpty'));
            }

            const readCode = inputString.charCodeAt(0);
            if (readCode > 255) {
                const msg = String(i18next.t('core:modelReadNonAscii'));
                throw new Error(msg.replace('%1', inputString.charAt(0)).replace('%2', readCode.toString()));
            }

            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(readCode)
            );
            inputString = inputString.slice(1);
            params.model.pc++;
            break;
        case InstructionType.NEW:
            var count = GetValuesFromStack(stack, params.model.sp, 1);
            params.model.sp--;
            let reqSize = Number(count[0]);

            if (!Number.isInteger(reqSize) || reqSize <= 0 || reqSize > params.model.heap.size) {
                const msg = String(i18next.t('core:modelHeapWarnAllocFailed') || 'Warning: Heap allocation failed for requested size %1 (returned -1)');
                warnings.push(msg.replace('%1', reqSize.toString()));
                params.model.sp = PushOntoStack(
                    stack,
                    params.model.sp,
                    ConvertToStackItems(-1)
                );
            } else {
                let allocatedAddr = Allocate(heap, reqSize);
                if (allocatedAddr === -1) {
                    const msg = String(i18next.t('core:modelHeapWarnAllocFailed') || 'Warning: Heap allocation failed for requested size %1 (returned -1)');
                    warnings.push(msg.replace('%1', reqSize.toString()));
                }
                params.model.sp = PushOntoStack(
                    stack,
                    params.model.sp,
                    ConvertToStackItems(allocatedAddr)
                );
            }
            params.model.pc++;
            break;
        case InstructionType.DEL:
            var addr = GetValuesFromStack(stack, params.model.sp, 1);
            params.model.sp--;
            var delAddr = ResolveHeapAddress(heap, Number(addr[0]), warnings);
            if (Free(heap, delAddr) != 0) {
                throw new Error(
                    i18next.t('core:modelFreeBlockNotAllocated1') +
                    (delAddr !== Number(addr[0]) ? `${delAddr} (${addr[0]})` : addr[0]) +
                    i18next.t('core:modelFreeBlockNotAllocated2')
                );
            }
            params.model.pc++;
            break;
        case InstructionType.LDA:
            var addr = GetValuesFromStack(stack, params.model.sp, 1);
            params.model.sp--;
            var targetAddr = ResolveHeapAddress(heap, Number(addr[0]), warnings);
            var ldaCellRole = GetHeapCellRole(heap, targetAddr);
            if (ldaCellRole === 'outOfBounds') {
                throw new Error(
                    i18next.t('core:modelHeapAccessUndefined1') +
                    targetAddr +
                    i18next.t('core:modelHeapAccessUndefined2') +
                    heap.size
                );
            }
            var val = GetValueFromHeap(heap, targetAddr) ?? 0;
            if (ldaCellRole === 'meta') {
                const msg = String(i18next.t('core:modelHeapWarnReadMeta') || 'Warning: Read from block metadata at address %1');
                warnings.push(
                    msg.replace('%1', targetAddr.toString())
                );
            } else if (ldaCellRole === 'unallocated') {
                const msg = String(i18next.t('core:modelHeapWarnReadUnallocated') || 'Warning: Read from unallocated heap memory at address %1');
                warnings.push(
                    msg.replace('%1', targetAddr.toString())
                );
            }
            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(val)
            );
            params.model.pc++;
            break;
        case InstructionType.STA:
            var addr = GetValuesFromStack(stack, params.model.sp, 2);
            params.model.sp -= 2;
            var targetAddr = ResolveHeapAddress(heap, Number(addr[1]), warnings);
            var valueToStore = Number(addr[0]);
            var staCellRole = GetHeapCellRole(heap, targetAddr);
            if (staCellRole === 'outOfBounds') {
                throw new Error(
                    i18next.t('core:modelHeapAccessUndefined1') +
                    targetAddr +
                    i18next.t('core:modelHeapAccessUndefined2') +
                    heap.size
                );
            }
            PutValueOnHeap(heap, targetAddr, valueToStore);
            if (staCellRole === 'meta') {
                const msg = String(i18next.t('core:modelHeapWarnWriteMeta') || 'Warning: Write into block metadata at address %1 (value %2, overwriting permitted)');
                warnings.push(
                    msg.replace('%1', targetAddr.toString())
                        .replace('%2', valueToStore.toString())
                );
            } else if (staCellRole === 'unallocated') {
                const msg = String(i18next.t('core:modelHeapWarnWriteUnallocated') || 'Warning: Write into unallocated heap memory at address %1 (value %2)');
                warnings.push(
                    msg.replace('%1', targetAddr.toString())
                        .replace('%2', valueToStore.toString())
                );
            }
            params.model.pc++;
            break;
        case InstructionType.PLD:
            var values = GetValuesFromStack(stack, params.model.sp, 2);
            params.model.sp -= 2;
            var base = FindBase(stack, params.model.base, Number(values[1]));
            let pldOffset = Number(values[0]);
            let pldAddress = base + pldOffset;
            CheckStackAddress(pldAddress);
            WarnNegativeOffset(warnings, 'core:modelStackWarnNegativeRead', pldOffset, pldAddress);
            if (pldAddress > params.model.sp) {
                const msg = String(i18next.t('core:modelStackWarnReadUnallocated') || 'Warning: Reading from unallocated stack memory at index %1 (SP is %2)');
                warnings.push(msg.replace('%1', pldAddress.toString()).replace('%2', params.model.sp.toString()));
            }
            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(GetValueFromStack(stack, pldAddress))
            );
            params.model.pc++;
            break;
        case InstructionType.PST:
            var values = GetValuesFromStack(stack, params.model.sp, 3);
            params.model.sp -= 3;
            var base = FindBase(stack, params.model.base, Number(values[1]));
            let pstOffset = Number(values[0]);
            let pstAddress = base + pstOffset;
            let pstVal = values[2];
            if (typeof pstVal === 'string' && !Number.isNaN(Number(pstVal)) && pstVal.trim() !== '') {
                pstVal = Number(pstVal);
            }
            CheckStackAddress(pstAddress);
            WarnNegativeOffset(warnings, 'core:modelStackWarnNegativeWrite', pstOffset, pstAddress);
            if (pstOffset === 0) {
                const msg = String(i18next.t('core:modelStackWarnWriteSB') || 'Warning: Overwriting static base (SB) at stack index %1 with value %2');
                warnings.push(msg.replace('%1', pstAddress.toString()).replace('%2', pstVal.toString()));
            } else if (pstOffset === 1) {
                const msg = String(i18next.t('core:modelStackWarnWriteDB') || 'Warning: Overwriting dynamic base (DB) at stack index %1 with value %2');
                warnings.push(msg.replace('%1', pstAddress.toString()).replace('%2', pstVal.toString()));
            } else if (pstOffset === 2) {
                const msg = String(i18next.t('core:modelStackWarnWritePC') || 'Warning: Overwriting return PC at stack index %1 with value %2');
                warnings.push(msg.replace('%1', pstAddress.toString()).replace('%2', pstVal.toString()));
            } else if (pstAddress > params.model.sp) {
                const msg = String(i18next.t('core:modelStackWarnWriteUnallocated') || 'Warning: Write into unallocated stack memory at index %1');
                warnings.push(msg.replace('%1', pstAddress.toString()));
            }
            PutOntoStack(stack, pstAddress, pstVal);
            params.model.pc++;
            break;
        case InstructionType.OPF:
            params.model.sp = PerformOPF(stack, parameter, params.model.sp, warnings, params.model.pc);
            params.model.pc++;
            break;
        case InstructionType.ITR: /* Integer to real */
            var values = GetValuesFromStack(stack, params.model.sp, 2);
            params.model.sp -= 2;

            /* Convert to mantissa and exponent in base 10 */
            [mantissa, exponent] = PartsToFloat(values[1], values[0]);

            params.model.sp = PushOntoStack(
                stack,
                params.model.sp,
                ConvertToStackItems(exponent, mantissa)
            );
            params.model.pc++;
            break;
        case InstructionType.RTI: /* Real to integer */
            var values = GetValuesFromStack(stack, params.model.sp, 2);
            params.model.sp -= 2;

            /* Convert to whole and fractional part */
            [whole_part, fractional_part] = FloatToParts(values[0], values[1]);

            if (parameter == 0) {
                params.model.sp = PushOntoStack(
                    stack,
                    params.model.sp,
                    ConvertToStackItems(whole_part, fractional_part)
                );
            }
            else if (parameter == 1) {
                // The integer conversion truncates towards zero, so -0.5 becomes 0
                params.model.sp = PushOntoStack(
                    stack,
                    params.model.sp,
                    ConvertToStackItems(whole_part === '-0' ? '0' : whole_part)
                );
            }

            params.model.pc++;
            break;
        default:
            throw new Error(i18next.t('core:modelNonExistentInstructionError'));
    }

    if (params.model.pc >= params.instructions.length) {
        isEnd = true;
    }

    UpdateHeapBlocks(heap);

    stats.currentStackSize = Math.max(0, params.model.sp + 1);
    stats.peakStackSize = Math.max(stats.peakStackSize, stats.currentStackSize);

    stats.currentCallStackDepth = stack.stackFrames.length;
    stats.peakCallStackDepth = Math.max(stats.peakCallStackDepth, stack.stackFrames.length);

    const allocatedBlocks = heap.heapBlocks.filter((b) => !b.free);
    stats.activeHeapBlocks = allocatedBlocks.length;
    stats.peakHeapBlocks = Math.max(stats.peakHeapBlocks, stats.activeHeapBlocks);

    stats.currentHeapAllocatedCells = allocatedBlocks.reduce((sum, b) => sum + b.dataSize, 0);
    stats.peakHeapAllocatedCells = Math.max(stats.peakHeapAllocatedCells, stats.currentHeapAllocatedCells);

    stats.peakTotalMemoryOccupied = Math.max(
        stats.peakTotalMemoryOccupied,
        stats.peakStackSize + stats.peakHeapAllocatedCells
    );

    if (stats.conditionalJumpsExecuted > 0) {
        stats.branchTakenRatio = Math.round((stats.conditionalJumpsTaken / stats.conditionalJumpsExecuted) * 100);
    }

    if (warnings && warnings.length > 0) {
        stats.warningsCount += warnings.length;
    }

    if (isEnd) {
        stats.completedNormally = true;
    }

    return {
        warnings: warnings,
        isEnd: isEnd,
        output: params.model.output,
        inputNextStep: inputString,
    };
}

function PerformINT(stack: Stack, sp: number, count: number) {
    let currentStackFrame: StackFrame | undefined = stack.stackFrames[stack.stackFrames.length - 1];
    if (count >= 0) {
        if (sp + count >= stack.maxSize) {
            throw StackOverflowError(stack);
        }
        sp += count;
        if (currentStackFrame) {
            currentStackFrame.size += count;
        }
        let toAdd = sp - stack.stackItems.length + 1;
        for (let i = 0; i < toAdd; i++) {
            stack.stackItems.push({ value: 0 });
        }
    } else {
        if (sp + count < -1) {
            const msg = String(i18next.t('core:modelINTStackLow'));
            throw new Error(msg.replace('%1', (sp + count).toString()));
        } else if (currentStackFrame && sp + count < currentStackFrame.index) {
            throw new Error(i18next.t('core:modelINTStackFrameLow'));
        } else {
            sp += count;
            if (currentStackFrame) {
                currentStackFrame.size += count;
            }
        }
    }

    return sp;
}

function PerformOPR(stack: Stack, operation: number, sp: number): number {
    let e_op = operation as OperationType;
    let operands;
    switch (e_op) {
        case OperationType.U_MINUS:
            operands = GetValuesFromStack(stack, sp, 1);
            sp -= 1;
            sp = PushOntoStack(stack, sp, ConvertToStackItems(-Number(operands[0])));
            break;
        case OperationType.ADD:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(stack, sp, ConvertToStackItems(Number(operands[0]) + Number(operands[1])));
            break;
        case OperationType.SUB:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(stack, sp, ConvertToStackItems(Number(operands[1]) - Number(operands[0])));
            break;
        case OperationType.MULT:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(stack, sp, ConvertToStackItems(Number(operands[0]) * Number(operands[1])));
            break;
        case OperationType.DIV:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            if (Number(operands[0]) == 0) {
                throw new Error(i18next.t('core:modelDivideByZero'));
            }
            // Integer division truncates towards zero (like C, Java and Pascal div),
            // so that a = (a / b) * b + (a mod b) holds together with MOD below
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Math.trunc(Number(operands[1]) / Number(operands[0])))
            );
            break;
        case OperationType.MOD:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            if (Number(operands[0]) == 0) {
                throw new Error(i18next.t('core:modelDivideByZero'));
            }
            // The remainder takes the sign of the dividend
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Math.trunc(Number(operands[1]) % Number(operands[0])))
            );
            break;
        case OperationType.IS_ODD:
            operands = GetValuesFromStack(stack, sp, 1);
            sp -= 1;
            sp = PushOntoStack(stack, sp, ConvertToStackItems(Math.abs(Number(operands[0])) % 2));
            break;
        case OperationType.EQ:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[0]) == Number(operands[1]) ? 1 : 0)
            );
            break;
        case OperationType.N_EQ:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[0]) == Number(operands[1]) ? 0 : 1)
            );
            break;
        case OperationType.LESS_THAN:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[1]) < Number(operands[0]) ? 1 : 0)
            );
            break;
        case OperationType.MORE_EQ_THAN:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[1]) >= Number(operands[0]) ? 1 : 0)
            );
            break;
        case OperationType.MORE_THAN:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[1]) > Number(operands[0]) ? 1 : 0)
            );
            break;
        case OperationType.LESS_EQ_THAN:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;
            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(Number(operands[1]) <= Number(operands[0]) ? 1 : 0)
            );
            break;
        default:
            throw new Error(i18next.t('core:modelUnknownOPR') + operation);
    }

    return sp;
}

// ------------------------------------------- FLOATING POINT UTILITY FUNCTIONS

// Real numbers are stored as two stack cells: an integer mantissa and a base-10 exponent
// (value = mantissa * 10^exponent). Non-finite values are stored as the strings
// 'NaN', 'Infinity' and '-Infinity' in place of the mantissa.

// A finite number split into its decimal digits: value = +/- digits * 10^exponent
interface DecimalDigits {
    negative: boolean;
    digits: string;
    exponent: number;
}

// Largest decimal exponent a real number can meaningfully have (beyond it the value is not finite)
const MAX_DECIMAL_EXPONENT = 400;

function NumberToDecimalDigits(num: number): DecimalDigits {
    const [coefficient, exponentPart] = Math.abs(num).toExponential().split('e');
    const [intPart, fracPart = ''] = coefficient.split('.');
    let digits = intPart + fracPart;
    let exponent = Number(exponentPart) - fracPart.length;
    while (digits.length > 1 && digits.endsWith('0')) {
        digits = digits.slice(0, -1);
        exponent++;
    }
    return { negative: num < 0, digits, exponent };
}

// Normalizes mantissa * 10^exponent to an integer mantissa without trailing zeros,
// truncated to at most `decimals` significant digits
function RoundFloat(mantissa: number, exponent: number, decimals: number = 6): [number | string, number] {
    if (!Number.isFinite(mantissa)) {
        return [String(mantissa), exponent];
    }
    if (mantissa === 0) {
        return [0, 0];
    }
    const d = NumberToDecimalDigits(mantissa);
    let digits = d.digits;
    let newExponent = exponent + d.exponent;
    if (digits.length > decimals) {
        newExponent += digits.length - decimals;
        digits = digits.substring(0, decimals);
        while (digits.length > 1 && digits.endsWith('0')) {
            digits = digits.slice(0, -1);
            newExponent++;
        }
    }
    const value = Number(digits);
    return [d.negative ? -value : value, newExponent];
}

// ITR: whole part and fractional part (e.g. 3 and "05" for 3.05) -> mantissa and exponent
function PartsToFloat(whole: number | string, fraction: number | string): [number | string, number] {
    const wholeStr = String(whole).trim();
    const fractionStr = String(fraction).trim();
    const negative = wholeStr.startsWith('-');
    const wholeDigits = wholeStr.replace(/^[+-]/, '');
    const fractionDigits = fractionStr.replace(/^\+/, '');

    if (!/^\d+$/.test(wholeDigits) || !/^\d+$/.test(fractionDigits)) {
        return ['NaN', 0];
    }

    const mantissa = Number(wholeDigits + fractionDigits);
    return RoundFloat(negative ? -mantissa : mantissa, -fractionDigits.length);
}

// RTI: mantissa and exponent -> whole part and fractional part as digit strings.
// The sign is carried by the whole part, so -0.5 becomes "-0" and "5".
function FloatToParts(mantissa: number | string, exponent: number | string): [string, string] {
    const m = Number(mantissa);
    const e = Number(exponent);
    if (!Number.isFinite(m) || !Number.isInteger(e)) {
        return [String(Number.isFinite(m) ? NaN : m), '0'];
    }
    if (m === 0) {
        return ['0', '0'];
    }

    const d = NumberToDecimalDigits(m);
    const exp = e + d.exponent;
    let whole: string;
    let fraction: string;
    if (exp > MAX_DECIMAL_EXPONENT) {
        return [d.negative ? '-Infinity' : 'Infinity', '0'];
    } else if (exp < -MAX_DECIMAL_EXPONENT) {
        return ['0', '0'];
    } else if (exp >= 0) {
        whole = d.digits + '0'.repeat(exp);
        fraction = '0';
    } else if (d.digits.length > -exp) {
        whole = d.digits.slice(0, d.digits.length + exp);
        fraction = d.digits.slice(d.digits.length + exp);
    } else {
        whole = '0';
        fraction = '0'.repeat(-exp - d.digits.length) + d.digits;
    }

    fraction = fraction.replace(/0+$/, '') || '0';
    if (d.negative) {
        whole = '-' + whole;
    }
    return [whole, fraction];
}

// Tests whether mantissa * 10^exponent is an odd integer
function IsOddFloat(mantissa: number, exponent: number): boolean {
    if (!Number.isFinite(mantissa) || !Number.isInteger(exponent)) {
        return false;
    }
    const value = exponent >= 0 ? mantissa * Math.pow(10, exponent) : mantissa / Math.pow(10, -exponent);
    return Number.isInteger(value) && Math.abs(value) % 2 === 1;
}

function PerformOPF(stack: Stack, operation: number, sp: number, warnings?: string[], pc?: number): number {
    let e_op = operation as OperationType;
    let operands;
    let mantissa;
    let mantissa_1;
    let mantissa_2;
    let exponent;
    let exponent_1;
    let exponent_2;
    let exponent_diff;
    let binary_result;
    switch (e_op) {
        case OperationType.U_MINUS:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;

            /* Get mantissa only and change sign */
            mantissa = operands[0].toString().trim();
            if (Number.isNaN(Number(mantissa)) || Number(mantissa) === 0) {
                mantissa = Number.isNaN(Number(mantissa)) ? 'NaN' : '0';
            } else if (mantissa[0] == '-') {
                mantissa = mantissa.substring(1);
            } else {
                mantissa = '-' + mantissa.replace(/^\+/, '');
            }

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(operands[1], mantissa)
            );
            break;
        case OperationType.ADD:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Add mantissas */
            mantissa = mantissa_1 + mantissa_2;
            /* Pick the "bigger" exponent in term of absolute value */
            exponent = Math.min(exponent_1, exponent_2);

            [mantissa, exponent] = RoundFloat(mantissa, exponent);

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(exponent, mantissa)
            );
            break;
        case OperationType.SUB:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Subtract mantissas */
            mantissa = mantissa_1 - mantissa_2;
            /* Pick the "bigger" exponent in term of absolute value */
            exponent = Math.min(exponent_1, exponent_2);

            [mantissa, exponent] = RoundFloat(mantissa, exponent);

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(exponent, mantissa)
            );
            break;
        case OperationType.MULT:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Multiply mantissas */
            mantissa = mantissa_1 * mantissa_2;
            /* Add exponents */
            exponent = exponent_1 + exponent_2;

            [mantissa, exponent] = RoundFloat(mantissa, exponent);

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(exponent, mantissa)
            );
            break;
        case OperationType.DIV:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            if (mantissa_2 == 0) {
                let divResult = mantissa_1 / mantissa_2;
                let resMantissa = divResult.toString();
                let resExponent = 0;

                if (warnings) {
                    const instrIdx = pc !== undefined ? pc.toString() : '?';
                    const msg = String(i18next.t('core:modelFloatWarnDivideByZero') || 'Warning: Floating-point division by zero at instruction %1 (result is %2)');
                    warnings.push(msg.replace('%1', instrIdx).replace('%2', resMantissa));
                }

                sp = PushOntoStack(
                    stack,
                    sp,
                    ConvertToStackItems(resExponent, resMantissa)
                );
                break;
            }

            if (!Number.isFinite(mantissa_1) || !Number.isFinite(mantissa_2)) {
                let divResult = mantissa_1 / mantissa_2;
                sp = PushOntoStack(
                    stack,
                    sp,
                    ConvertToStackItems(0, divResult.toString())
                );
                break;
            }

            /* Divide mantissas, subtract exponents and make the mantissa an integer again */
            [mantissa, exponent] = RoundFloat(mantissa_1 / mantissa_2, exponent_1 - exponent_2);

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(exponent, mantissa)
            );

            break;
        case OperationType.MOD:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            if (mantissa_2 == 0) {
                let resMantissa = 'NaN';
                let resExponent = 0;

                if (warnings) {
                    const instrIdx = pc !== undefined ? pc.toString() : '?';
                    const msg = String(i18next.t('core:modelFloatWarnModuloByZero') || 'Warning: Floating-point modulo by zero at instruction %1 (result is NaN)');
                    warnings.push(msg.replace('%1', instrIdx));
                }

                sp = PushOntoStack(
                    stack,
                    sp,
                    ConvertToStackItems(resExponent, resMantissa)
                );
                break;
            }

            if (!Number.isFinite(mantissa_1) || !Number.isFinite(mantissa_2)) {
                let modResult = mantissa_1 % mantissa_2;
                sp = PushOntoStack(
                    stack,
                    sp,
                    ConvertToStackItems(0, modResult.toString())
                );
                break;
            }

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Modulo mantissas */
            mantissa = mantissa_1 % mantissa_2;
            exponent = Math.min(exponent_1, exponent_2);

            [mantissa, exponent] = RoundFloat(mantissa, exponent);

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(exponent, mantissa)
            );
            break;
        case OperationType.IS_ODD:
            operands = GetValuesFromStack(stack, sp, 2);
            sp -= 2;

            /* Get mantissa and exponent */
            mantissa = Number(operands[0]);
            exponent = Number(operands[1]);

            /* Check if the number itself (not just its mantissa) is odd */
            binary_result = IsOddFloat(mantissa, exponent) ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );

            break;
        case OperationType.EQ:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = (mantissa_1 === 0 && mantissa_2 === 0) || (mantissa_1 === mantissa_2) ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        case OperationType.N_EQ:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = (mantissa_1 === 0 && mantissa_2 === 0) || (mantissa_1 === mantissa_2) ? 0 : 1;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        case OperationType.LESS_THAN:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = mantissa_1 < mantissa_2 ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        case OperationType.MORE_EQ_THAN:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = mantissa_1 >= mantissa_2 ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        case OperationType.MORE_THAN:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = mantissa_1 > mantissa_2 ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        case OperationType.LESS_EQ_THAN:
            operands = GetValuesFromStack(stack, sp, 4);
            sp -= 4;

            /* Get mantissa and exponent */
            mantissa_2 = Number(operands[0]);
            exponent_2 = Number(operands[1]);
            mantissa_1 = Number(operands[2]);
            exponent_1 = Number(operands[3]);

            /* Align exponents */
            exponent_diff = Math.abs(exponent_1 - exponent_2);
            if (exponent_1 > exponent_2) {
                mantissa_1 *= Math.pow(10, exponent_diff);
            } else {
                mantissa_2 *= Math.pow(10, exponent_diff);
            }

            /* Compare */
            binary_result = mantissa_1 <= mantissa_2 ? 1 : 0;

            sp = PushOntoStack(
                stack,
                sp,
                ConvertToStackItems(binary_result)
            );
            break;
        default:
            throw new Error(i18next.t('core:modelUnknownOPF') + operation);
    }

    return sp;
}

// ------------------------------------------- INSTRUCTION FUNCTIONS
