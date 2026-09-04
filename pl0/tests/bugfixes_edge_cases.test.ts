import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, runSteps, getTOS } from './test_helpers';
import { ParseAndValidate } from '../core/validator';
import { InitModel } from '../core/operations';
import { GetValueFromHeapDummy, PutValueOnHeapDummy } from '../core/allocator';

describe('Bug Fixes and Edge Cases', () => {
    describe('Modulo by Zero Protection', () => {
        it('OPR 0, 6: throws on modulo by zero', () => {
            assert.throws(() => {
                runSteps('LIT 0, 10\nLIT 0, 0\nOPR 0, 6', 3);
            });
        });

        it('OPF 0, 6: throws on float modulo by zero', () => {
            const code = [
                'LIT 0, 10',
                'LIT 0, 0',
                'ITR 0, 0',
                'LIT 0, 0',
                'LIT 0, 0',
                'ITR 0, 0',
                'OPF 0, 6',
            ].join('\n');
            assert.throws(() => {
                runProgram(code);
            });
        });
    });

    describe('Odd Check with Negative Numbers', () => {
        it('OPR 0, 7: IS_ODD correctly handles negative numbers', () => {
            const oddRes = runSteps('LIT 0, -7\nOPR 0, 7', 2);
            assert.strictEqual(getTOS(oddRes.model), 1);

            const evenRes = runSteps('LIT 0, -8\nOPR 0, 7', 2);
            assert.strictEqual(getTOS(evenRes.model), 0);
        });

        it('OPF 0, 7: IS_ODD correctly handles negative float mantissa', () => {
            const codeOdd = [
                'LIT 0, -7',
                'LIT 0, 0',
                'ITR 0, 0',
                'OPF 0, 7',
            ].join('\n');
            const resOdd = runProgram(codeOdd);
            assert.strictEqual(getTOS(resOdd.model), 1);

            const codeEven = [
                'LIT 0, -8',
                'LIT 0, 0',
                'ITR 0, 0',
                'OPF 0, 7',
            ].join('\n');
            const resEven = runProgram(codeEven);
            assert.strictEqual(getTOS(resEven.model), 0);
        });
    });

    describe('Float Comparison with Different Exponent Alignments', () => {
        it('OPF 0, 8 (EQ) and OPF 0, 9 (N_EQ) compare floats with different exponents', () => {
            // Compare 1.2 * 10^1 (12.0) with 12 * 10^0 (12.0)
            // Float 1: whole 1, frac 2 -> mantissa 12, exp -1. Wait, 1.2 is 12*10^-1.
            // 12.0 is whole 12, frac 0 -> mantissa 12, exp 0.
            // In scientific notation: 12*10^0 vs 120*10^-1
            const codeEQ = [
                'LIT 0, 12',
                'LIT 0, 0',
                'ITR 0, 0',    // 12 * 10^0
                'LIT 0, 12',
                'LIT 0, 0',
                'ITR 0, 0',    // 12 * 10^0
                'OPF 0, 8',    // EQ
            ].join('\n');
            const resEQ = runProgram(codeEQ);
            assert.strictEqual(getTOS(resEQ.model), 1);

            // Compare 1.5 with 2.5
            const codeNEQ = [
                'LIT 0, 1',
                'LIT 0, 5',
                'ITR 0, 0',    // 1.5
                'LIT 0, 2',
                'LIT 0, 5',
                'ITR 0, 0',    // 2.5
                'OPF 0, 9',    // N_EQ
            ].join('\n');
            const resNEQ = runProgram(codeNEQ);
            assert.strictEqual(getTOS(resNEQ.model), 1);
        });
    });

    describe('Negative Jump Target Protection', () => {
        it('JMP with negative parameter throws out of bounds error', () => {
            assert.throws(() => {
                runSteps('JMP 0, -1', 1);
            });
        });

        it('JMC with negative parameter throws out of bounds error when condition is met', () => {
            assert.throws(() => {
                runSteps('LIT 0, 0\nJMC 0, -5', 2);
            });
        });
    });

    describe('String Storage Support in STO and PST', () => {
        it('STO stores a string and LOD retrieves it without converting to NaN', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, "hello world"',
                'STO 0, 3',
                'LOD 0, 3',
            ].join('\n');
            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), 'hello world');
        });

        it('PST stores a string indirectly and PLD retrieves it without converting to NaN', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, "pointer string"',
                'LIT 0, 0',
                'LIT 0, 3',
                'PST 0, 0',
                'LIT 0, 0',
                'LIT 0, 3',
                'PLD 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), 'pointer string');
        });
    });

    describe('WRI Character Literal Output and Non-Numeric String Validation', () => {
        it('WRI writes single-character string literals correctly', () => {
            const code = [
                'LIT 0, "X"',
                'WRI 0, 0',
                'LIT 0, "Y"',
                'WRI 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.strictEqual(res.output, 'XY');
        });

        it('WRI throws on invalid multi-character string that is not an ASCII number', () => {
            assert.throws(() => {
                runProgram('LIT 0, "invalid"\nWRI 0, 0');
            });
        });
    });

    describe('Validator Mixed Line Number Synchronization', () => {
        it('synchronizes line numbers when mixing explicit and unnumbered lines', () => {
            const input = [
                '0 LIT 0, 10',
                'LIT 0, 20',
                '2 OPR 0, 2',
                'OPR 0, 1',
            ].join('\n');
            const valRes = ParseAndValidate(input);
            assert.strictEqual(valRes.parseOK, true);
            assert.strictEqual(valRes.validationOK, true);
            assert.strictEqual(valRes.instructions.length, 4);
            assert.strictEqual(valRes.instructions[0].index, 0);
            assert.strictEqual(valRes.instructions[1].index, 1);
            assert.strictEqual(valRes.instructions[2].index, 2);
            assert.strictEqual(valRes.instructions[3].index, 3);
        });
    });

    describe('Allocator Dummy Methods for Unallocated Memory', () => {
        it('GetValueFromHeapDummy returns NaN on unallocated memory and PutValueOnHeapDummy returns -2', () => {
            const model = InitModel(1024, 250);
            // In newly initialized heap, cells starting from index 2 are unallocated (free block)
            const dummyVal = GetValueFromHeapDummy(model.heap, 10);
            assert.strictEqual(Number.isNaN(dummyVal), true);

            const putDummy = PutValueOnHeapDummy(model.heap, 10);
            assert.strictEqual(putDummy, -2);

            // Out of bounds checks
            assert.strictEqual(GetValueFromHeapDummy(model.heap, -1), null);
            assert.strictEqual(PutValueOnHeapDummy(model.heap, -1), -1);
            assert.strictEqual(GetValueFromHeapDummy(model.heap, 9999), null);
            assert.strictEqual(PutValueOnHeapDummy(model.heap, 9999), -1);
        });
    });
});
