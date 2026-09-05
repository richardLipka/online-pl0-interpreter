import { ParseAndValidate } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import { DataModel } from '../core/model';
import i18next from 'i18next';
import csCore from '../localization/cs/core.json';
import enCore from '../localization/en/core.json';
import csUi from '../localization/cs/ui.json';
import enUi from '../localization/en/ui.json';

if (!i18next.isInitialized) {
    i18next.init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            cs: { core: csCore, ui: csUi },
            en: { core: enCore, ui: enUi },
        },
    });
}

export interface RunProgramResult {
    model: DataModel;
    output: string;
    warnings: string[];
    isEnd: boolean;
    stepCount: number;
}

export function runProgram(
    code: string,
    input: string = '',
    maxSteps: number = 10000
): RunProgramResult {
    const parseResult = ParseAndValidate(code);
    if (!parseResult.parseOK || !parseResult.validationOK) {
        throw new Error(
            `Parse/Validation error: ${JSON.stringify(
                parseResult.parseErrors.concat(parseResult.validationErrors)
            )}`
        );
    }

    const instructions = parseResult.instructions;
    const model = InitModel(1024, 250);
    let currentInput = input;
    let output = '';
    let allWarnings: string[] = [];
    let isEnd = false;
    let stepCount = 0;

    while (!isEnd && stepCount < maxSteps && model.pc < instructions.length) {
        const res = NextStep({ model, instructions, input: currentInput });
        currentInput = res.inputNextStep;
        if (res.warnings && res.warnings.length > 0) {
            allWarnings.push(...res.warnings);
        }
        isEnd = res.isEnd;
        stepCount++;
    }

    return {
        model,
        output: model.output,
        warnings: allWarnings,
        isEnd,
        stepCount,
    };
}

export function runSteps(
    code: string,
    steps: number,
    input: string = ''
): RunProgramResult {
    const parseResult = ParseAndValidate(code);
    if (!parseResult.parseOK || !parseResult.validationOK) {
        throw new Error(
            `Parse/Validation error: ${JSON.stringify(
                parseResult.parseErrors.concat(parseResult.validationErrors)
            )}`
        );
    }

    const instructions = parseResult.instructions;
    const model = InitModel(1024, 250);
    let currentInput = input;
    let allWarnings: string[] = [];
    let isEnd = false;

    for (let i = 0; i < steps; i++) {
        if (isEnd || model.pc >= instructions.length) break;
        const res = NextStep({ model, instructions, input: currentInput });
        currentInput = res.inputNextStep;
        if (res.warnings && res.warnings.length > 0) {
            allWarnings.push(...res.warnings);
        }
        isEnd = res.isEnd;
    }

    return {
        model,
        output: model.output,
        warnings: allWarnings,
        isEnd,
        stepCount: steps,
    };
}

export function getTOS(model: DataModel): number | string | undefined {
    if (model.sp < 0 || model.sp >= model.stack.stackItems.length) {
        return undefined;
    }
    return model.stack.stackItems[model.sp].value;
}
