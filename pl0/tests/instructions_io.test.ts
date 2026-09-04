import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, runSteps, getTOS } from './test_helpers';

describe('I/O and String Instructions', () => {
    describe('LIT with Strings', () => {
        it('pushes string literal onto the stack', () => {
            const res = runSteps('LIT 0, "Hello, PL/0!"', 1);
            assert.strictEqual(getTOS(res.model), 'Hello, PL/0!');
            assert.strictEqual(res.model.sp, 0);
        });

        it('supports single-quoted strings', () => {
            const res = runSteps("LIT 0, 'Test string'", 1);
            assert.strictEqual(getTOS(res.model), 'Test string');
        });
    });

    describe('REA (Read Character)', () => {
        it('reads a character from input and pushes ASCII code', () => {
            const res = runSteps('REA 0, 0', 1, 'A');
            assert.strictEqual(getTOS(res.model), 65); // ASCII of 'A'
            assert.strictEqual(res.model.sp, 0);
        });

        it('consumes characters sequentially across multiple REA calls', () => {
            const code = [
                'REA 0, 0', // reads 'O' (79)
                'REA 0, 0', // reads 'K' (75)
            ].join('\n');

            const res = runSteps(code, 2, 'OK');
            assert.strictEqual(res.model.stack.stackItems[0].value, 79);
            assert.strictEqual(res.model.stack.stackItems[1].value, 75);
            assert.strictEqual(res.model.sp, 1);
        });

        it('throws an error when reading from empty input', () => {
            assert.throws(() => {
                runSteps('REA 0, 0', 1, '');
            });
        });
    });

    describe('WRI (Write Character)', () => {
        it('pops ASCII code from stack and appends character to output', () => {
            const code = [
                'LIT 0, 72', // 'H'
                'WRI 0, 0',
                'LIT 0, 105', // 'i'
                'WRI 0, 0',
                'LIT 0, 33',  // '!'
                'WRI 0, 0',
            ].join('\n');

            const res = runSteps(code, 6);
            assert.strictEqual(res.output, 'Hi!');
            assert.strictEqual(res.model.sp, -1);
        });

        it('writes newline character correctly', () => {
            const code = [
                'LIT 0, 65', // 'A'
                'WRI 0, 0',
                'LIT 0, 10', // '\n'
                'WRI 0, 0',
                'LIT 0, 66', // 'B'
                'WRI 0, 0',
            ].join('\n');

            const res = runSteps(code, 6);
            assert.strictEqual(res.output, 'A\nB');
        });

        it('throws an error when ASCII code is out of bounds (0-255)', () => {
            assert.throws(() => {
                runSteps('LIT 0, 300\nWRI 0, 0', 2);
            });
        });
    });

    describe('Combined I/O Flow', () => {
        it('reads input characters, modifies them, and writes to output', () => {
            // Read lowercase letter 'a' (97), subtract 32 to get uppercase 'A' (65), and write
            const code = [
                'REA 0, 0',   // reads 'a' -> 97
                'LIT 0, 32',
                'OPR 0, 3',   // 97 - 32 = 65 ('A')
                'WRI 0, 0',   // outputs 'A'
            ].join('\n');

            const res = runProgram(code, 'a');
            assert.strictEqual(res.output, 'A');
        });
    });
});
