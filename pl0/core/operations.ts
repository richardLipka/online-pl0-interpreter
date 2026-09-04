import {
    DataModel,
    InstructionStepParameters,
    InstructionStepResult,
    DoStep,
    AllocatorType,
} from './model';

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
    };

    return m;
}

export function NextStep(pars: InstructionStepParameters): InstructionStepResult {
    var res = DoStep(pars);
    return {
        isEnd: res.isEnd,
        inputNextStep: res.inputNextStep,
        output: res.output,
        warnings: res.warnings,
    };
}
