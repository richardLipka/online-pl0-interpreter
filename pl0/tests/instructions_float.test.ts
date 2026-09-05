import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, getTOS } from './test_helpers';

describe('Floating-Point Instructions (ITR, RTI, OPF)', () => {
    describe('ITR and RTI (Conversions)', () => {
        it('ITR converts integer parts to real (mantissa and exponent)', () => {
            // Push whole part 12, fractional part 50 (representing 12.5)
            const code = [
                'LIT 0, 12',  // whole
                'LIT 0, 5',   // fractional
                'ITR 0, 0',   // converts to [exponent, mantissa]
            ].join('\n');

            const res = runProgram(code);
            // 12.5 -> mantissa: 125, exponent: -1
            const mantissa = getTOS(res.model);
            const exponent = res.model.stack.stackItems[res.model.sp - 1].value;
            assert.strictEqual(mantissa, 125);
            assert.strictEqual(exponent, -1);
        });

        it('RTI 0, 1 converts real back to whole integer part', () => {
            const code = [
                'LIT 0, 42',
                'LIT 0, 75',  // 42.75
                'ITR 0, 0',   // real on stack: [exp, mantissa]
                'RTI 0, 1',   // real to integer whole part
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), '42');
            assert.strictEqual(res.model.sp, 0);
        });

        it('RTI 0, 0 converts real to whole and fractional parts', () => {
            const code = [
                'LIT 0, 7',
                'LIT 0, 25',  // 7.25
                'ITR 0, 0',
                'RTI 0, 0',   // pushes whole, then fractional
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.model.sp, 1);
            assert.strictEqual(res.model.stack.stackItems[0].value, '7');
            assert.strictEqual(res.model.stack.stackItems[1].value, '25');
        });
    });

    describe('OPF (Float Operations)', () => {
        it('OPF 0, 1: U_MINUS negates float', () => {
            const code = [
                'LIT 0, 5',
                'LIT 0, 5',   // 5.5
                'ITR 0, 0',   // [exp, mantissa = 55]
                'OPF 0, 1',   // negate mantissa
            ].join('\n');

            const res = runProgram(code);
            const mantissa = getTOS(res.model);
            assert.strictEqual(mantissa, '-55');
        });

        it('OPF 0, 2: ADD adds two floating point numbers', () => {
            // 1.5 + 2.5 = 4.0
            const code = [
                'LIT 0, 1',
                'LIT 0, 5',   // 1.5
                'ITR 0, 0',
                'LIT 0, 2',
                'LIT 0, 5',   // 2.5
                'ITR 0, 0',
                'OPF 0, 2',   // add floats
                'RTI 0, 1',   // whole part of result
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), '4');
        });

        it('OPF 0, 3: SUB subtracts two floating point numbers', () => {
            // 5.5 - 2.5 = 3.0
            const code = [
                'LIT 0, 5',
                'LIT 0, 5',   // 5.5
                'ITR 0, 0',
                'LIT 0, 2',
                'LIT 0, 5',   // 2.5
                'ITR 0, 0',
                'OPF 0, 3',   // subtract
                'RTI 0, 1',   // whole part
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), '3');
        });

        it('OPF 0, 4: MULT multiplies two floating point numbers', () => {
            // 2.5 * 4.0 = 10.0
            const code = [
                'LIT 0, 2',
                'LIT 0, 5',   // 2.5
                'ITR 0, 0',
                'LIT 0, 4',
                'LIT 0, 0',   // 4.0
                'ITR 0, 0',
                'OPF 0, 4',   // multiply
                'RTI 0, 1',   // whole part
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), '10');
        });

        it('OPF 0, 5: DIV divides two floating point numbers normally', () => {
            // 7.5 / 2.5 = 3.0
            const code = [
                'LIT 0, 7',
                'LIT 0, 5',   // 7.5
                'ITR 0, 0',
                'LIT 0, 2',
                'LIT 0, 5',   // 2.5
                'ITR 0, 0',
                'OPF 0, 5',   // divide
                'RTI 0, 1',   // whole part
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), '3');
        });

        it('OPF 0, 5: DIV on division by zero produces Infinity and logs soft warning without halting', () => {
            const code = [
                'LIT 0, 5',
                'LIT 0, 0',   // 5.0
                'ITR 0, 0',
                'LIT 0, 0',
                'LIT 0, 0',   // 0.0
                'ITR 0, 0',
                'OPF 0, 5',   // 5.0 / 0.0
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 'Infinity');
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /division by zero|Dělení nulou/i);
        });

        it('OPF 0, 6: MOD computes float modulo normally', () => {
            // 7.5 % 2.0 = 1.5
            const code = [
                'LIT 0, 7',
                'LIT 0, 5',   // 7.5
                'ITR 0, 0',
                'LIT 0, 2',
                'LIT 0, 0',   // 2.0
                'ITR 0, 0',
                'OPF 0, 6',   // modulo
                'RTI 0, 0',   // whole and fractional parts
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.model.stack.stackItems[0].value, '1');
            assert.strictEqual(res.model.stack.stackItems[1].value, '5');
        });

        it('OPF 0, 6: MOD by zero produces NaN and logs soft warning without halting', () => {
            const code = [
                'LIT 0, 7',
                'LIT 0, 5',   // 7.5
                'ITR 0, 0',
                'LIT 0, 0',
                'LIT 0, 0',   // 0.0
                'ITR 0, 0',
                'OPF 0, 6',   // 7.5 % 0.0
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 'NaN');
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /modulo by zero|Modulo nulou/i);
        });

        it('OPF comparisons: EQ, LESS_THAN, MORE_THAN', () => {
            // Compare 3.5 < 4.5 -> 1
            const codeLT = [
                'LIT 0, 3',
                'LIT 0, 5',
                'ITR 0, 0',
                'LIT 0, 4',
                'LIT 0, 5',
                'ITR 0, 0',
                'OPF 0, 10', // LESS_THAN
            ].join('\n');
            const resLT = runProgram(codeLT);
            assert.strictEqual(getTOS(resLT.model), 1);

            // Compare 4.5 > 3.5 -> 1
            const codeGT = [
                'LIT 0, 4',
                'LIT 0, 5',
                'ITR 0, 0',
                'LIT 0, 3',
                'LIT 0, 5',
                'ITR 0, 0',
                'OPF 0, 12', // MORE_THAN
            ].join('\n');
            const resGT = runProgram(codeGT);
            assert.strictEqual(getTOS(resGT.model), 1);

            // Compare 4.5 == 4.5 -> 1
            const codeEQ = [
                'LIT 0, 4',
                'LIT 0, 5',
                'ITR 0, 0',
                'LIT 0, 4',
                'LIT 0, 5',
                'ITR 0, 0',
                'OPF 0, 8', // EQ
            ].join('\n');
            const resEQ = runProgram(codeEQ);
            assert.strictEqual(getTOS(resEQ.model), 1);
        });
    });
});

