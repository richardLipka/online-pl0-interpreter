import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    stripLineNumberFromLine,
    stripLineNumbers,
    hasLineNumbers,
    addLineNumbers,
    isInstructionLine,
    ParseAndValidate,
} from '../core/validator';
import { runHeadless } from '../cli/runner';

describe('Line Numbers Stripping & Detection', () => {
    describe('1. Single Line Stripping (stripLineNumberFromLine)', () => {
        it('strips plain line numbers before instruction mnemonics', () => {
            assert.strictEqual(stripLineNumberFromLine('0 LIT 0 5'), 'LIT 0 5');
            assert.strictEqual(stripLineNumberFromLine('1 INT 0 3'), 'INT 0 3');
            assert.strictEqual(stripLineNumberFromLine('10 STO 0 3'), 'STO 0 3');
            assert.strictEqual(stripLineNumberFromLine('100 LOD 0 3'), 'LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('001 CAL 0 4'), 'CAL 0 4');
        });

        it('strips delimited line numbers (colon, dot, parenthesis, brackets, hash)', () => {
            assert.strictEqual(stripLineNumberFromLine('1: LIT 0 5'), 'LIT 0 5');
            assert.strictEqual(stripLineNumberFromLine('01. INT 0 3'), 'INT 0 3');
            assert.strictEqual(stripLineNumberFromLine('1) STO 0 3'), 'STO 0 3');
            assert.strictEqual(stripLineNumberFromLine('[1] CAL 0 4'), 'CAL 0 4');
            assert.strictEqual(stripLineNumberFromLine('(1) RET 0 0'), 'RET 0 0');
            assert.strictEqual(stripLineNumberFromLine('#1 REA 0 0'), 'REA 0 0');
        });

        it('preserves leading indentation when stripping line numbers', () => {
            assert.strictEqual(stripLineNumberFromLine('  1: LIT 0 5'), '  LIT 0 5');
            assert.strictEqual(stripLineNumberFromLine('    2 INT 0 3'), '    INT 0 3');
            assert.strictEqual(stripLineNumberFromLine('\t10 STO 0 3'), '\tSTO 0 3');
        });

        it('strips line numbers before comments and directives', () => {
            assert.strictEqual(stripLineNumberFromLine('1: ; Initial comment'), '; Initial comment');
            assert.strictEqual(stripLineNumberFromLine('2 // Another comment'), '// Another comment');
            assert.strictEqual(stripLineNumberFromLine('3: &REGS'), '&REGS');
            assert.strictEqual(stripLineNumberFromLine('4 &STK'), '&STK');
        });

        it('strips line numbers before or after labels', () => {
            assert.strictEqual(stripLineNumberFromLine('1: @loop: LOD 0 3'), '@loop: LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('1 @loop LOD 0 3'), '@loop LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('1: loop: LOD 0 3'), 'loop: LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('@loop: 1 LOD 0 3'), '@loop: LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('@loop: 1: LOD 0 3'), '@loop: LOD 0 3');
        });

        it('converts standalone line numbers on empty lines to empty string', () => {
            assert.strictEqual(stripLineNumberFromLine('1:'), '');
            assert.strictEqual(stripLineNumberFromLine('1.'), '');
            assert.strictEqual(stripLineNumberFromLine('1'), '');
            assert.strictEqual(stripLineNumberFromLine('[1]'), '');
            assert.strictEqual(stripLineNumberFromLine('  1:  '), '');
        });

        it('does not alter lines without line numbers', () => {
            assert.strictEqual(stripLineNumberFromLine('LIT 0 5'), 'LIT 0 5');
            assert.strictEqual(stripLineNumberFromLine('INT 0 3'), 'INT 0 3');
            assert.strictEqual(stripLineNumberFromLine('OPR 0 2'), 'OPR 0 2');
            assert.strictEqual(stripLineNumberFromLine('@loop: LOD 0 3'), '@loop: LOD 0 3');
            assert.strictEqual(stripLineNumberFromLine('&REGS'), '&REGS');
            assert.strictEqual(stripLineNumberFromLine('; pure comment'), '; pure comment');
            assert.strictEqual(stripLineNumberFromLine(''), '');
            assert.strictEqual(stripLineNumberFromLine('   '), '   ');
        });

        it('does not touch numbers within operands or string literals', () => {
            assert.strictEqual(stripLineNumberFromLine('LIT 0 100'), 'LIT 0 100');
            assert.strictEqual(stripLineNumberFromLine('LIT 0 "123"'), 'LIT 0 "123"');
            assert.strictEqual(stripLineNumberFromLine('JMP 0 10'), 'JMP 0 10');
            assert.strictEqual(stripLineNumberFromLine('OPR 0 5'), 'OPR 0 5');
        });
    });

    describe('2. Multi-line Code Stripping & Detection', () => {
        const codeWithNumbers = [
            '1: ; Factorial test',
            '2: INT 0 4',
            '3: LIT 0 5',
            '4: STO 0 3',
            '5: &REGS',
        ].join('\n');

        const codeWithoutNumbers = [
            '; Factorial test',
            'INT 0 4',
            'LIT 0 5',
            'STO 0 3',
            '&REGS',
        ].join('\n');

        it('hasLineNumbers correctly detects line numbers in code', () => {
            assert.strictEqual(hasLineNumbers(codeWithNumbers), true);
            assert.strictEqual(hasLineNumbers(codeWithoutNumbers), false);
            assert.strictEqual(hasLineNumbers('1 INT 0 3\n2 LIT 0 5'), true);
            assert.strictEqual(hasLineNumbers('0 INT 0 3\n1 LIT 0 5'), true);
            assert.strictEqual(hasLineNumbers(''), false);
        });

        it('stripLineNumbers cleans entire program cleanly', () => {
            const stripped = stripLineNumbers(codeWithNumbers);
            assert.strictEqual(stripped, codeWithoutNumbers);
            assert.strictEqual(hasLineNumbers(stripped), false);
        });

        it('handles Windows CRLF line endings', () => {
            const crlfCode = '1 INT 0 3\r\n2 LIT 0 5\r\n';
            const stripped = stripLineNumbers(crlfCode);
            assert.strictEqual(stripped, 'INT 0 3\r\nLIT 0 5\r\n');
        });
    });

    describe('3. ParseAndValidate with ignoreLineNumbers Option', () => {
        const oneIndexedCode = [
            '1 INT 0 4',
            '2 LIT 0 5',
            '3 STO 0 3',
            '4 RET 0 0',
        ].join('\n');

        it('fails validation without ignoreLineNumbers due to 1-based indexing', () => {
            const res = ParseAndValidate(oneIndexedCode);
            assert.strictEqual(res.parseOK, true);
            assert.strictEqual(res.validationOK, false);
            assert.ok(res.validationErrors.length > 0);
            assert.ok(res.validationErrors[0].error.includes('0'));
        });

        it('succeeds validation with ignoreLineNumbers: true', () => {
            const res = ParseAndValidate(oneIndexedCode, { ignoreLineNumbers: true });
            assert.strictEqual(res.parseOK, true);
            assert.strictEqual(res.validationOK, true);
            assert.strictEqual(res.validationErrors.length, 0);
            assert.strictEqual(res.instructions.length, 4);
            assert.strictEqual(res.instructions[0].index, 0);
            assert.strictEqual(res.instructions[1].index, 1);
            assert.strictEqual(res.instructions[2].index, 2);
            assert.strictEqual(res.instructions[3].index, 3);
        });

        it('handles colon-delimited numbers with comments with ignoreLineNumbers: true', () => {
            const colonCode = [
                '1: ; Setup stack',
                '2: INT 0 3',
                '3: ; Push number',
                '4: LIT 0 42',
            ].join('\n');

            const res = ParseAndValidate(colonCode, { ignoreLineNumbers: true });
            assert.strictEqual(res.parseOK, true);
            assert.strictEqual(res.validationOK, true);
            assert.strictEqual(res.instructions.length, 2);
            assert.strictEqual(res.instructions[0].index, 0);
            assert.strictEqual(res.instructions[1].index, 1);
        });
    });

    describe('4. Headless CLI Runner with ignoreLineNumbers', () => {
        const numberedProg = [
            '1 INT 0 4',
            '2 LIT 0 7',
            '3 LIT 0 6',
            '4 OPR 0 4', // 7 * 6 = 42
            '5 STO 0 3',
            '6 &ASSERT_TOS 42',
        ].join('\n');

        it('fails with validation error when ignoreLineNumbers is omitted', () => {
            const result = runHeadless(numberedProg, { language: 'en' });
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.status, 'VALIDATION_ERROR');
            assert.strictEqual(result.exitCode, 2);
            assert.ok(result.errorMessage?.includes('--ignore-line-numbers'));
        });

        it('provides Czech hint when language is cs and line numbers detected', () => {
            const result = runHeadless(numberedProg, { language: 'cs' });
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.status, 'VALIDATION_ERROR');
            assert.ok(result.errorMessage?.includes('--ignore-line-numbers'));
            assert.ok(result.errorMessage?.includes('Byla detekována čísla řádek'));
        });

        it('executes successfully when ignoreLineNumbers: true is provided', () => {
            const result = runHeadless(numberedProg, {
                ignoreLineNumbers: true,
                language: 'en',
            });
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.status, 'COMPLETED');
            assert.strictEqual(result.exitCode, 0);
            assert.strictEqual(result.assertions.passed, 1);
            assert.strictEqual(result.assertions.failed, 0);
        });
    });

    describe('5. Line Numbering (addLineNumbers & isInstructionLine)', () => {
        it('isInstructionLine correctly identifies instruction lines', () => {
            assert.strictEqual(isInstructionLine('LIT 0 5'), true);
            assert.strictEqual(isInstructionLine('  INT 0 3 ; allocate'), true);
            assert.strictEqual(isInstructionLine('@loop: LOD 0 3'), true);
            assert.strictEqual(isInstructionLine('@loop LOD 0 3'), true);
            assert.strictEqual(isInstructionLine('loop: LOD 0 3'), true);

            assert.strictEqual(isInstructionLine(''), false);
            assert.strictEqual(isInstructionLine('   '), false);
            assert.strictEqual(isInstructionLine('; Just a comment'), false);
            assert.strictEqual(isInstructionLine('// Another comment'), false);
            assert.strictEqual(isInstructionLine('&REGS'), false);
            assert.strictEqual(isInstructionLine('@loop:'), false);
            assert.strictEqual(isInstructionLine('loop:'), false);
        });

        it('addLineNumbers numbers instructions sequentially starting from 0', () => {
            const unnumbered = [
                '; Setup',
                'INT 0 4',
                'LIT 0 10',
                'STO 0 3',
                '&REGS',
                'RET 0 0',
            ].join('\n');

            const expected = [
                '; Setup',
                '0 INT 0 4',
                '1 LIT 0 10',
                '2 STO 0 3',
                '&REGS',
                '3 RET 0 0',
            ].join('\n');

            const numbered = addLineNumbers(unnumbered);
            assert.strictEqual(numbered, expected);
        });

        it('numbered code parses and validates cleanly with ParseAndValidate', () => {
            const unnumbered = [
                'INT 0 3',
                'LIT 0 42',
                'STO 0 3',
            ].join('\n');

            const numbered = addLineNumbers(unnumbered);
            const pav = ParseAndValidate(numbered);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);
            assert.strictEqual(pav.instructions.length, 3);
            assert.strictEqual(pav.instructions[0].index, 0);
            assert.strictEqual(pav.instructions[1].index, 1);
            assert.strictEqual(pav.instructions[2].index, 2);
        });

        it('re-numbers code that had existing or 1-based line numbers cleanly from 0', () => {
            const badNumbered = [
                '1: INT 0 3',
                '2: LIT 0 5',
                '3: RET 0 0',
            ].join('\n');

            const cleanNumbered = addLineNumbers(badNumbered);
            assert.strictEqual(
                cleanNumbered,
                ['0 INT 0 3', '1 LIT 0 5', '2 RET 0 0'].join('\n')
            );

            const pav = ParseAndValidate(cleanNumbered);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);
        });

        it('round-trip test: stripLineNumbers(addLineNumbers(code)) preserves instructions', () => {
            const original = [
                '; Factorial program',
                'INT 0 4',
                'LIT 0 5',
                '@loop: LOD 0 3',
                'RET 0 0',
            ].join('\n');

            const numbered = addLineNumbers(original);
            assert.strictEqual(hasLineNumbers(numbered), true);
            const stripped = stripLineNumbers(numbered);
            assert.strictEqual(hasLineNumbers(stripped), false);
            assert.strictEqual(stripped, original);
        });
    });
});
