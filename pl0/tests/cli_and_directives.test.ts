import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExtractDirectives, ExecuteDirective, stripComment } from '../core/directives';
import { runHeadless, formatTextReport, formatJsonReport } from '../cli/runner';
import { InitModel, NextStep } from '../core/operations';
import { ParseAndValidate } from '../core/validator';

describe('Comment & Directive Extraction', () => {
    it('strips comments outside of quotes while preserving quotes containing semicolons', () => {
        const line1 = 'LIT 0, 42 ; this is a comment';
        const res1 = stripComment(line1);
        assert.strictEqual(res1.code.trim(), 'LIT 0, 42');
        assert.strictEqual(res1.comment, 'this is a comment');

        const line2 = 'LIT 0, "hello ; world" // slash comment';
        const res2 = stripComment(line2);
        assert.strictEqual(res2.code.trim(), 'LIT 0, "hello ; world"');
        assert.strictEqual(res2.comment, 'slash comment');

        const line3 = '# hash comment only';
        const res3 = stripComment(line3);
        assert.strictEqual(res3.code.trim(), '');
        assert.strictEqual(res3.comment, 'hash comment only');
    });

    it('extracts standalone and comment directives without shifting instruction indices', () => {
        const code = `
            ; Initial comment
            INT 0, 4
            &REGS
            LIT 0, 10 ; &STK
            STO 0, 3
            // &STKA
            LOD 0, 3
            &STKN 2
            &STKRG 0 3
            &ECHO "Calculation complete"
            &ASSERT_TOS 10
            RET 0, 0
        `;

        const { cleanCode, directives } = ExtractDirectives(code);

        // Verify ParseAndValidate succeeds on clean code
        const parsed = ParseAndValidate(cleanCode);
        assert.strictEqual(parsed.parseOK, true);
        assert.strictEqual(parsed.validationOK, true);

        // There are exactly 5 instructions: INT, LIT, STO, LOD, RET
        assert.strictEqual(parsed.instructions.length, 5);

        // Directives extracted
        assert.strictEqual(directives.length, 7);
        assert.strictEqual(directives[0].type, 'REGS');
        assert.strictEqual(directives[1].type, 'STK');
        assert.strictEqual(directives[2].type, 'STKA');
        assert.strictEqual(directives[3].type, 'STKN');
        assert.strictEqual(directives[4].type, 'STKRG');
        assert.strictEqual(directives[5].type, 'ECHO');
        assert.strictEqual(directives[6].type, 'ASSERT_TOS');
    });
});

describe('Directive Execution on Virtual Machine', () => {
    it('executes &REGS and &STK and formats registers and stack slots', () => {
        const model = InitModel(1024, 250);
        model.sp = 2;
        model.base = 0;
        model.pc = 1;
        model.stack.stackItems[0] = { value: 0 };
        model.stack.stackItems[1] = { value: 0 };
        model.stack.stackItems[2] = { value: 99 };

        const regsDir = {
            raw: '&REGS',
            type: 'REGS' as const,
            args: [],
            lineIndex: 1,
            instructionIndex: 1,
            position: 'after' as const,
        };
        const resRegs = ExecuteDirective(regsDir, model, []);
        assert.ok(resRegs.message.includes('PC: 1'));
        assert.ok(resRegs.message.includes('BASE: 0'));
        assert.ok(resRegs.message.includes('SP: 2'));

        const stkDir = {
            raw: '&STK',
            type: 'STK' as const,
            args: [],
            lineIndex: 2,
            instructionIndex: 1,
            position: 'after' as const,
        };
        const resStk = ExecuteDirective(stkDir, model, []);
        assert.ok(resStk.message.includes('[2] = 99'));
        assert.ok(resStk.message.includes('[SP/TOS]'));
    });

    it('executes &STKA for active frame slots', () => {
        const model = InitModel(1024, 250);
        model.base = 3;
        model.sp = 5;
        model.pc = 4;
        model.stack.stackItems[3] = { value: 0 };  // SB
        model.stack.stackItems[4] = { value: 0 };  // DB
        model.stack.stackItems[5] = { value: 42 }; // Local / TOS

        const stkaDir = {
            raw: '&STKA',
            type: 'STKA' as const,
            args: [],
            lineIndex: 3,
            instructionIndex: 4,
            position: 'after' as const,
        };
        const res = ExecuteDirective(stkaDir, model, []);
        assert.ok(res.message.includes('Active Frame (BASE: 3, SP: 5'));
        assert.ok(res.message.includes('+2 (abs 5) = 42'));
    });

    it('executes &STKN and &STKRG with range validation', () => {
        const model = InitModel(1024, 250);
        model.sp = 4;
        model.stack.stackItems[0] = { value: 10 };
        model.stack.stackItems[1] = { value: 20 };
        model.stack.stackItems[2] = { value: 30 };
        model.stack.stackItems[3] = { value: 40 };
        model.stack.stackItems[4] = { value: 50 };

        const stknDir = {
            raw: '&STKN 2',
            type: 'STKN' as const,
            args: ['2'],
            lineIndex: 1,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resN = ExecuteDirective(stknDir, model, []);
        assert.ok(resN.message.includes('Top 2 stack item(s)'));
        assert.ok(resN.message.includes('[3] = 40'));
        assert.ok(resN.message.includes('[4] = 50'));

        const stkrgDir = {
            raw: '&STKRG 1 3',
            type: 'STKRG' as const,
            args: ['1', '3'],
            lineIndex: 2,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resRg = ExecuteDirective(stkrgDir, model, []);
        assert.ok(resRg.message.includes('Stack range [1..3]'));
        assert.ok(resRg.message.includes('[1] = 20'));
        assert.ok(resRg.message.includes('[2] = 30'));
        assert.ok(resRg.message.includes('[3] = 40'));
    });

    it('executes &ECHO, &MEM, and &ASSERT_TOS correctly', () => {
        const model = InitModel(1024, 250);
        model.sp = 0;
        model.stack.stackItems[0] = { value: 42 };

        const echoDir = {
            raw: '&ECHO Hello Debugger',
            type: 'ECHO' as const,
            args: ['Hello Debugger'],
            lineIndex: 1,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resEcho = ExecuteDirective(echoDir, model, []);
        assert.strictEqual(resEcho.message, '[ECHO] Hello Debugger');

        const memDir = {
            raw: '&MEM',
            type: 'MEM' as const,
            args: [],
            lineIndex: 2,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resMem = ExecuteDirective(memDir, model, []);
        assert.ok(resMem.message.includes('Stack: 1 cells'));

        const assertPassDir = {
            raw: '&ASSERT_TOS 42',
            type: 'ASSERT_TOS' as const,
            args: ['42'],
            lineIndex: 3,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resPass = ExecuteDirective(assertPassDir, model, []);
        assert.strictEqual(resPass.passed, true);
        assert.ok(resPass.message.includes('PASS'));

        const assertFailDir = {
            raw: '&ASSERT_TOS 999',
            type: 'ASSERT_TOS' as const,
            args: ['999'],
            lineIndex: 4,
            instructionIndex: 0,
            position: 'after' as const,
        };
        const resFail = ExecuteDirective(assertFailDir, model, []);
        assert.strictEqual(resFail.passed, false);
        assert.ok(resFail.message.includes('FAIL'));
    });
});

describe('Headless Runner and Automated Testing', () => {
    it('runs program with directives headlessly and collects all debug outputs', () => {
        const code = `
            INT 0, 4
            LIT 0, 10
            STO 0, 3
            &REGS
            &STKA
            LOD 0, 3
            LIT 0, 20
            OPR 0, 2
            &STKN 1
            &ASSERT_TOS 30
            &ECHO "Sum calculation complete"
            RET 0, 0
        `;

        const result = runHeadless(code, { trace: true, includeStats: true });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.exitCode, 0);
        assert.strictEqual(result.status, 'COMPLETED');
        assert.strictEqual(result.assertions.total, 1);
        assert.strictEqual(result.assertions.passed, 1);
        assert.strictEqual(result.assertions.failed, 0);

        // Verify directive logs captured
        assert.ok(result.debugLogs.some((l) => l.includes('&REGS')));
        assert.ok(result.debugLogs.some((l) => l.includes('&STKA')));
        assert.ok(result.debugLogs.some((l) => l.includes('&STKN 1')));
        assert.ok(result.debugLogs.some((l) => l.includes('[ASSERTION PASS') && l.includes('TOS == 30')));
        assert.ok(result.debugLogs.some((l) => l.includes('[ECHO] Sum calculation complete')));

        // Verify trace logs captured
        assert.ok(result.traceLogs.length >= 7);

        // Verify statistics captured
        assert.ok(result.stats);
        assert.strictEqual(result.stats?.totalInstructionsExecuted, 7);
    });

    it('flags assertion failure and sets exit code 1', () => {
        const code = `
            INT 0, 3
            LIT 0, 10
            &ASSERT_TOS 999
            RET 0, 0
        `;

        const result = runHeadless(code);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.exitCode, 1);
        assert.strictEqual(result.assertions.failed, 1);
        assert.ok(result.assertions.failures[0].includes('FAIL'));
    });

    it('catches runtime division by zero and sets exit code 1 with error report', () => {
        const code = `
            INT 0, 3
            LIT 0, 10
            LIT 0, 0
            OPR 0, 5
            RET 0, 0
        `;

        const result = runHeadless(code);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.exitCode, 1);
        assert.strictEqual(result.status, 'HALTED_ON_ERROR');
        assert.ok(result.errorMessage && result.errorMessage.length > 0);
    });

    it('formats human-readable text report and JSON report properly', () => {
        const code = `
            INT 0, 3
            LIT 0, 72
            WRI 0, 0
            RET 0, 0
        `;

        const result = runHeadless(code, { includeStats: true, filePath: 'test.pl0' });
        const textReport = formatTextReport(result, { includeStats: true });
        assert.ok(textReport.includes('=== [SUCCESS] PL/0 Program Execution ==='));
        assert.ok(textReport.includes('File: test.pl0'));
        assert.ok(textReport.includes('Standard Output'));
        assert.ok(textReport.includes('H')); // ASCII 72

        const jsonReport = formatJsonReport(result);
        const parsed = JSON.parse(jsonReport);
        assert.strictEqual(parsed.success, true);
        assert.strictEqual(parsed.output, 'H');
        assert.strictEqual(parsed.status, 'COMPLETED');
    });
});

describe('Directives in Standard Run & State Preservation', () => {
    it('prints directive outputs directly to model.output during standard run (NextStep)', () => {
        const code = `
            &ECHO "Starting Calculation"
            &REGS
            INT 0, 4
            LIT 0, 42 ; &STK
            STO 0, 3
            &MEM
            LOD 0, 3
            &ASSERT_TOS 42
            RET 0, 0
            &STATS
        `;

        const parsed = ParseAndValidate(code);
        assert.strictEqual(parsed.parseOK, true);
        assert.strictEqual(parsed.validationOK, true);

        const model = InitModel(1024, 250);
        let isEnd = false;
        let steps = 0;

        while (!isEnd && steps < 50 && model.pc < parsed.instructions.length) {
            const stepResult = NextStep({ model, instructions: parsed.instructions, input: '' });
            isEnd = stepResult.isEnd;
            steps++;
        }

        assert.strictEqual(isEnd, true);

        // Verify model.output contains directive prints
        assert.ok(model.output.includes('[ECHO] Starting Calculation'), 'Contains ECHO message');
        assert.ok(model.output.includes('[DIRECTIVE &REGS at PC 0]'), 'Contains REGS directive');
        assert.ok(model.output.includes('[DIRECTIVE &STK at PC 1]'), 'Contains STK directive');
        assert.ok(model.output.includes('[DIRECTIVE &MEM at PC 3]'), 'Contains MEM directive');
        assert.ok(model.output.includes('[ASSERTION PASS at PC 4] TOS == 42'), 'Contains ASSERTION PASS');
        assert.ok(model.output.includes('[DIRECTIVE &STATS at PC 4]'), 'Contains STATS directive');
    });

    it('guarantees directives NEVER change state of calculation (sp, base, pc, stack, heap)', () => {
        const codePure = `
            INT 0, 5
            LIT 0, 15
            STO 0, 3
            LIT 0, 27
            STO 0, 4
            LOD 0, 3
            LOD 0, 4
            OPR 0, 2
            RET 0, 0
        `;

        const codeWithDirectives = `
            &REGS
            &MEM
            INT 0, 5
            &STK
            LIT 0, 15 ; &STKA
            STO 0, 3
            &STKN 2
            LIT 0, 27
            &STKRG 0 4
            STO 0, 4
            &ASSERT_TOS 27
            LOD 0, 3
            &ECHO "Loaded first operand"
            LOD 0, 4
            &ASSERT_TOS 27
            OPR 0, 2
            &ASSERT_TOS 42
            RET 0, 0
            &STATS
            &HEAP
        `;

        const parsedPure = ParseAndValidate(codePure);
        const parsedWithDirectives = ParseAndValidate(codeWithDirectives);

        assert.strictEqual(parsedPure.instructions.length, parsedWithDirectives.instructions.length);

        const modelPure = InitModel(1024, 250);
        const modelDir = InitModel(1024, 250);

        for (let i = 0; i < parsedPure.instructions.length; i++) {
            NextStep({ model: modelPure, instructions: parsedPure.instructions, input: '' });
            NextStep({ model: modelDir, instructions: parsedWithDirectives.instructions, input: '' });

            // After each instruction, calculation states MUST be strictly identical
            assert.strictEqual(modelDir.sp, modelPure.sp, `SP mismatch at instruction ${i}`);
            assert.strictEqual(modelDir.base, modelPure.base, `BASE mismatch at instruction ${i}`);
            assert.strictEqual(modelDir.pc, modelPure.pc, `PC mismatch at instruction ${i}`);
            assert.deepStrictEqual(
                modelDir.stack.stackItems.slice(0, modelPure.sp + 1),
                modelPure.stack.stackItems.slice(0, modelPure.sp + 1),
                `Stack items mismatch at instruction ${i}`
            );
            assert.deepStrictEqual(
                modelDir.heap.values,
                modelPure.heap.values,
                `Heap values mismatch at instruction ${i}`
            );
        }

        // Final result on TOS should be 42 for both
        assert.strictEqual(modelPure.stack.stackItems[modelPure.sp]?.value, 42);
        assert.strictEqual(modelDir.stack.stackItems[modelDir.sp]?.value, 42);
    });

    it('ensures comments with ampersands and special characters do not interfere', () => {
        const code = `
            ; AT&T syntax vs Intel style
            // Q&A session notes
            # R&D department test
            0 INT 0, 4 ; allocate slots for x & y
            ; &not_a_recognized_directive
            // John & Jane's algorithm
            1 LIT 0, 100 ; set initial balance & save
            2 STO 0, 3
            ; && double ampersand comment
            3 RET 0, 0 ; & remember to cleanup
        `;

        const parsed = ParseAndValidate(code);
        assert.strictEqual(parsed.parseOK, true);
        assert.strictEqual(parsed.validationOK, true);
        assert.strictEqual(parsed.instructions.length, 4);

        const model = InitModel(1024, 250);
        while (model.pc < parsed.instructions.length) {
            const res = NextStep({ model, instructions: parsed.instructions, input: '' });
            if (res.isEnd) break;
        }

        // None of the non-directive ampersand comments should have generated directive output
        assert.strictEqual(model.output, '');
        assert.strictEqual(model.stack.stackItems[3].value, 100);
    });

    it('preserves strings containing semicolons, slashes, and ampersands', () => {
        const code = `
            0 INT 0, 3
            1 LIT 0, "Hello; World & Universe // test" ; &STK
            2 RET 0, 0
        `;

        const parsed = ParseAndValidate(code);
        assert.strictEqual(parsed.parseOK, true);
        assert.strictEqual(parsed.validationOK, true);
        assert.strictEqual(parsed.instructions.length, 3);

        const model = InitModel(1024, 250);
        NextStep({ model, instructions: parsed.instructions, input: '' }); // INT
        NextStep({ model, instructions: parsed.instructions, input: '' }); // LIT

        const val = model.stack.stackItems[model.sp]?.value;
        assert.strictEqual(val, 'Hello; World & Universe // test');
        assert.ok(model.output.includes('[DIRECTIVE &STK'));
        assert.ok(model.output.includes('Hello; World & Universe // test'));
    });

    it('CLI runner outputs directive results in standard output and respects --no-debug', () => {
        const code = `
            INT 0, 3
            &ECHO "CLI Test Running"
            LIT 0, 65 ; ASCII 'A'
            &ASSERT_TOS 65
            WRI 0, 0
            RET 0, 0
        `;

        // 1. With directives enabled (default)
        const resWithDebug = runHeadless(code, { enableDirectives: true });
        assert.strictEqual(resWithDebug.success, true);
        // Standard output contains both WRI output and directive messages
        assert.ok(resWithDebug.output.includes('A'), 'Contains WRI character A');
        assert.ok(resWithDebug.output.includes('[ECHO] CLI Test Running'), 'Contains ECHO in stdout');
        assert.ok(resWithDebug.output.includes('[ASSERTION PASS'), 'Contains ASSERTION in stdout');

        const report = formatTextReport(resWithDebug);
        assert.ok(report.includes('--- Standard Output ---'));
        assert.ok(report.includes('CLI Test Running'));

        // 2. With directives disabled (--no-debug)
        const resNoDebug = runHeadless(code, { enableDirectives: false });
        assert.strictEqual(resNoDebug.success, true);
        assert.strictEqual(resNoDebug.output, 'A');
        assert.strictEqual(resNoDebug.debugLogs.length, 0);
    });
});
