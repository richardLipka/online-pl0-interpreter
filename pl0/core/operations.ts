import {
    DataModel,
    InstructionStepParameters,
    InstructionStepResult,
    DoStep,
    AllocatorType,
    CreateDefaultStatistics,
} from './model';
import { ExecuteDirective, Directive, DirectiveResult } from './directives';

export function InitModel(
    stackMaxSize: number,
    heapSize: number,
    allocatorType: AllocatorType = AllocatorType.SINGLE_LINKED
): DataModel {
    let values: number[] = [];
    for (let i = 0; i < heapSize; i++) {
        values.push(0);
    }

    const isDoubly = allocatorType === AllocatorType.DOUBLY_LINKED;
    const metaSize = isDoubly ? 3 : 2;

    values[0] = heapSize - metaSize;
    values[1] = 0; // free
    if (isDoubly) {
        values[2] = -1; // prev_address = none
    }

    const m: DataModel = {
        pc: 0,
        base: 0,
        sp: -1,

        input: '',
        output: '',

        stack: {
            maxSize: stackMaxSize,
            stackItems: [{ value: 0 }, { value: 0 }, { value: 0 }],
            stackFrames: [{ index: 0, size: 0 }],
        },

        heap: {
            size: heapSize,
            values: values,
            allocatorType: allocatorType,
            heapBlocks: [
                {
                    blockAddress: 0,
                    blockSize: heapSize,
                    dataAddress: metaSize,
                    dataSize: heapSize - metaSize,
                    allocatorInfoIndices: isDoubly ? [0, 1, 2] : [0, 1],
                    free: true,
                },
            ],
        },
        stats: CreateDefaultStatistics(),
    };

    return m;
}

export function NextStep(pars: InstructionStepParameters): InstructionStepResult {
    const executedDirectiveResults: DirectiveResult[] = [];

    const instruction =
        pars.model.pc >= 0 && pars.model.pc < pars.instructions.length
            ? pars.instructions[pars.model.pc]
            : undefined;

    const runDirectives = (dirs?: Directive[]) => {
        if (!dirs || dirs.length === 0 || pars.disableDirectives) return;
        for (const dir of dirs) {
            const res = ExecuteDirective(dir, pars.model, pars.instructions);
            executedDirectiveResults.push(res);
            if (res.message) {
                if (pars.model.output.length > 0 && !pars.model.output.endsWith('\n')) {
                    pars.model.output += '\n';
                }
                pars.model.output += res.message + '\n';
            }
        }
    };

    // 1. Run pre-directives before instruction execution
    runDirectives(instruction?.preDirectives);

    // 2. Perform instruction step
    const res = DoStep(pars);

    // 3. Run post-directives after instruction execution
    runDirectives(instruction?.postDirectives);

    return {
        isEnd: res.isEnd,
        inputNextStep: res.inputNextStep,
        output: pars.model.output,
        warnings: res.warnings,
        directiveResults: executedDirectiveResults,
    };
}
