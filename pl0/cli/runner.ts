import { ParseAndValidate, hasLineNumbers } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import { InstructionType, ExecutionStatistics } from '../core/model';
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

export interface CliOptions {
    input?: string;
    maxSteps?: number;
    enableDirectives?: boolean;
    trace?: boolean;
    includeStats?: boolean;
    format?: 'text' | 'json';
    language?: 'en' | 'cs';
    filePath?: string;
    ignoreLineNumbers?: boolean;
}

export interface AssertionSummary {
    total: number;
    passed: number;
    failed: number;
    failures: string[];
}

export interface CliRunResult {
    filePath?: string;
    success: boolean;
    exitCode: number;
    status: 'COMPLETED' | 'HALTED_ON_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR';
    errorMessage?: string;
    totalSteps: number;
    output: string;
    debugLogs: string[];
    traceLogs: string[];
    warnings: string[];
    assertions: AssertionSummary;
    stats?: ExecutionStatistics;
}

export function runHeadless(sourceCode: string, options: CliOptions = {}): CliRunResult {
    const lang = options.language || 'en';
    if (i18next.language !== lang) {
        i18next.changeLanguage(lang);
    }

    const maxSteps = options.maxSteps ?? 100000;
    const enableDirectives = options.enableDirectives ?? true;
    const enableTrace = options.trace ?? false;
    const initialInput = options.input ?? '';

    const parseResult = ParseAndValidate(sourceCode, {
        ignoreLineNumbers: options.ignoreLineNumbers,
    });
    if (!parseResult.parseOK || !parseResult.validationOK) {
        let errors = [...parseResult.parseErrors, ...parseResult.validationErrors]
            .map((e) => `Line ${e.rowIndex + 1}: ${e.error}`)
            .join('; ');

        if (!options.ignoreLineNumbers && hasLineNumbers(sourceCode)) {
            const hint =
                lang === 'cs'
                    ? ' (Tip: Byla detekována čísla řádek. Pro jejich ignorování můžete použít přepínač --ignore-line-numbers)'
                    : ' (Hint: Line numbers detected before instructions. You can use the --ignore-line-numbers flag)';
            errors += hint;
        }

        return {
            filePath: options.filePath,
            success: false,
            exitCode: 2,
            status: 'VALIDATION_ERROR',
            errorMessage: errors,
            totalSteps: 0,
            output: '',
            debugLogs: [],
            traceLogs: [],
            warnings: [],
            assertions: { total: 0, passed: 0, failed: 0, failures: [] },
        };
    }

    const instructions = parseResult.instructions;
    const model = InitModel(1024, 250);

    const debugLogs: string[] = [];
    const traceLogs: string[] = [];
    const allWarnings: string[] = [];
    const assertions: AssertionSummary = { total: 0, passed: 0, failed: 0, failures: [] };

    let currentInput = initialInput;
    let isEnd = false;
    let stepCount = 0;
    let runtimeError: string | undefined;

    try {
        while (!isEnd && stepCount < maxSteps && model.pc < instructions.length) {
            const currentPc = model.pc;
            const currentInstruction = instructions[currentPc];

            if (enableTrace) {
                const mnemonic = InstructionType[currentInstruction.instruction] || '???';
                const tosVal = model.sp >= 0 ? model.stack.stackItems[model.sp]?.value : '<empty>';
                traceLogs.push(
                    `#${stepCount + 1} | PC: ${currentPc} | ${mnemonic} ${currentInstruction.level}, ${currentInstruction.parameter_str || currentInstruction.parameter} | SP: ${model.sp} | TOS: ${tosVal}`
                );
            }

            const stepResult = NextStep({
                model,
                instructions,
                input: currentInput,
                disableDirectives: !enableDirectives,
            });
            currentInput = stepResult.inputNextStep;

            if (stepResult.directiveResults) {
                for (const res of stepResult.directiveResults) {
                    debugLogs.push(res.message);

                    if (res.type === 'ASSERT_TOS') {
                        assertions.total++;
                        if (res.passed) {
                            assertions.passed++;
                        } else {
                            assertions.failed++;
                            assertions.failures.push(res.message);
                        }
                    }
                }
            }

            if (stepResult.warnings && stepResult.warnings.length > 0) {
                allWarnings.push(...stepResult.warnings);
            }

            isEnd = stepResult.isEnd;
            stepCount++;
        }
    } catch (e) {
        runtimeError = (e as Error).message;
        if (model.stats) {
            model.stats.haltedOnError = true;
            model.stats.lastHaltError = runtimeError;
        }
    }

    let status: 'COMPLETED' | 'HALTED_ON_ERROR' | 'TIMEOUT' = 'COMPLETED';
    let exitCode = 0;

    if (runtimeError) {
        status = 'HALTED_ON_ERROR';
        exitCode = 1;
    } else if (!isEnd && stepCount >= maxSteps) {
        status = 'TIMEOUT';
        exitCode = 3;
    } else if (assertions.failed > 0) {
        exitCode = 1;
    }

    return {
        filePath: options.filePath,
        success: exitCode === 0,
        exitCode,
        status,
        errorMessage: runtimeError,
        totalSteps: stepCount,
        output: model.output,
        debugLogs,
        traceLogs,
        warnings: allWarnings,
        assertions,
        stats: model.stats,
    };
}

export function formatTextReport(result: CliRunResult, options: CliOptions = {}): string {
    const lines: string[] = [];
    const banner = result.success ? '=== [SUCCESS] PL/0 Program Execution ===' : '=== [FAILURE] PL/0 Program Execution ===';
    lines.push(banner);

    if (result.filePath) {
        lines.push(`File: ${result.filePath}`);
    }
    lines.push(`Status: ${result.status} (Total steps: ${result.totalSteps})`);

    if (result.errorMessage) {
        lines.push(`\nError: ${result.errorMessage}`);
    }

    if (result.output && result.output.length > 0) {
        lines.push('\n--- Standard Output ---');
        lines.push(result.output);
    }

    if (result.debugLogs.length > 0 && (!result.output || options.trace)) {
        lines.push('\n--- Debug Directives Output ---');
        lines.push(result.debugLogs.join('\n'));
    }

    if (options.trace && result.traceLogs.length > 0) {
        lines.push('\n--- Execution Trace ---');
        lines.push(result.traceLogs.join('\n'));
    }

    if (result.assertions.total > 0) {
        lines.push('\n--- Assertions Summary ---');
        lines.push(
            `Total: ${result.assertions.total} | Passed: ${result.assertions.passed} | Failed: ${result.assertions.failed}`
        );
        if (result.assertions.failures.length > 0) {
            lines.push('Failures:');
            result.assertions.failures.forEach((f) => lines.push(`  - ${f}`));
        }
    }

    if (result.warnings.length > 0) {
        lines.push(`\n--- Warnings (${result.warnings.length}) ---`);
        result.warnings.forEach((w, idx) => lines.push(`  #${idx + 1}: ${w}`));
    }

    if (options.includeStats && result.stats) {
        const s = result.stats;
        lines.push('\n--- Execution Statistics & Profiling ---');
        lines.push(`Total Instructions: ${s.totalInstructionsExecuted}`);
        lines.push(`Peak Total Memory: ${s.peakTotalMemoryOccupied} cells (Stack: ${s.peakStackSize}, Heap: ${s.peakHeapAllocatedCells})`);
        lines.push(`Peak Call Stack Depth: ${s.peakCallStackDepth} frames`);
        lines.push(
            `Branch Taken Ratio: ${s.conditionalJumpsExecuted > 0 ? `${s.branchTakenRatio}% (${s.conditionalJumpsTaken}/${s.conditionalJumpsExecuted})` : 'N/A'}`
        );
        lines.push(`Procedure Calls: ${s.procedureCallsCount}, Returns: ${s.procedureReturnsCount}`);

        const instEntries = Object.entries(s.instructionCounts).sort((a, b) => b[1] - a[1]);
        if (instEntries.length > 0) {
            lines.push('Instruction Breakdown:');
            for (const [mnemonic, count] of instEntries) {
                const pct = Math.round((count / s.totalInstructionsExecuted) * 100);
                lines.push(`  ${mnemonic.padEnd(6)}: ${count.toString().padStart(5)} (${pct}%)`);
            }
        }
    }

    return lines.join('\n');
}

export function formatJsonReport(result: CliRunResult): string {
    return JSON.stringify(result, null, 2);
}
