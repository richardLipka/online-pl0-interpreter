import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, runSteps, getTOS } from './test_helpers';

describe('Classic PL/0 Instructions', () => {
    describe('LIT (Literal)', () => {
        it('pushes positive integer onto the stack', () => {
            const res = runSteps('LIT 0, 42', 1);
            assert.strictEqual(res.model.sp, 0);
            assert.strictEqual(getTOS(res.model), 42);
        });

        it('pushes zero and negative integer', () => {
            const res = runSteps('LIT 0, 0\nLIT 0, -15', 2);
            assert.strictEqual(res.model.sp, 1);
            assert.strictEqual(getTOS(res.model), -15);
            assert.strictEqual(res.model.stack.stackItems[0].value, 0);
        });
    });

    describe('INT (Increment Stack Pointer)', () => {
        it('allocates space on stack for local variables', () => {
            const res = runSteps('INT 0, 4', 1);
            assert.strictEqual(res.model.sp, 3);
            assert.strictEqual(res.model.stack.stackFrames[0].size, 4);
        });
    });

    describe('OPR (Arithmetic & Logical Operations)', () => {
        it('OPR 0, 1: U_MINUS negates the top of stack', () => {
            const res = runSteps('LIT 0, 25\nOPR 0, 1', 2);
            assert.strictEqual(getTOS(res.model), -25);
        });

        it('OPR 0, 2: ADD adds two operands', () => {
            const res = runSteps('LIT 0, 17\nLIT 0, 25\nOPR 0, 2', 3);
            assert.strictEqual(getTOS(res.model), 42);
            assert.strictEqual(res.model.sp, 0);
        });

        it('OPR 0, 3: SUB subtracts top from next-to-top', () => {
            const res = runSteps('LIT 0, 50\nLIT 0, 8\nOPR 0, 3', 3);
            assert.strictEqual(getTOS(res.model), 42);
        });

        it('OPR 0, 4: MULT multiplies two operands', () => {
            const res = runSteps('LIT 0, 6\nLIT 0, 7\nOPR 0, 4', 3);
            assert.strictEqual(getTOS(res.model), 42);
        });

        it('OPR 0, 5: DIV performs integer division', () => {
            const res = runSteps('LIT 0, 85\nLIT 0, 2\nOPR 0, 5', 3);
            assert.strictEqual(getTOS(res.model), 42);
        });

        it('OPR 0, 5: DIV throws on division by zero', () => {
            assert.throws(() => {
                runSteps('LIT 0, 10\nLIT 0, 0\nOPR 0, 5', 3);
            });
        });

        it('OPR 0, 6: MOD calculates remainder', () => {
            const res = runSteps('LIT 0, 23\nLIT 0, 5\nOPR 0, 6', 3);
            assert.strictEqual(getTOS(res.model), 3);
        });

        it('OPR 0, 7: IS_ODD returns 1 for odd and 0 for even', () => {
            const odd = runSteps('LIT 0, 7\nOPR 0, 7', 2);
            assert.strictEqual(getTOS(odd.model), 1);

            const even = runSteps('LIT 0, 8\nOPR 0, 7', 2);
            assert.strictEqual(getTOS(even.model), 0);
        });

        it('OPR 0, 8: EQ compares equality', () => {
            const eqTrue = runSteps('LIT 0, 99\nLIT 0, 99\nOPR 0, 8', 3);
            assert.strictEqual(getTOS(eqTrue.model), 1);

            const eqFalse = runSteps('LIT 0, 99\nLIT 0, 100\nOPR 0, 8', 3);
            assert.strictEqual(getTOS(eqFalse.model), 0);
        });

        it('OPR 0, 9: N_EQ compares inequality', () => {
            const neqTrue = runSteps('LIT 0, 10\nLIT 0, 20\nOPR 0, 9', 3);
            assert.strictEqual(getTOS(neqTrue.model), 1);

            const neqFalse = runSteps('LIT 0, 10\nLIT 0, 10\nOPR 0, 9', 3);
            assert.strictEqual(getTOS(neqFalse.model), 0);
        });

        it('OPR 0, 10: LESS_THAN compares less than', () => {
            const ltTrue = runSteps('LIT 0, 5\nLIT 0, 10\nOPR 0, 10', 3);
            assert.strictEqual(getTOS(ltTrue.model), 1);

            const ltFalse = runSteps('LIT 0, 10\nLIT 0, 5\nOPR 0, 10', 3);
            assert.strictEqual(getTOS(ltFalse.model), 0);
        });

        it('OPR 0, 11: MORE_EQ_THAN compares greater or equal', () => {
            const geEq = runSteps('LIT 0, 10\nLIT 0, 10\nOPR 0, 11', 3);
            assert.strictEqual(getTOS(geEq.model), 1);

            const geMore = runSteps('LIT 0, 15\nLIT 0, 10\nOPR 0, 11', 3);
            assert.strictEqual(getTOS(geMore.model), 1);

            const geLess = runSteps('LIT 0, 5\nLIT 0, 10\nOPR 0, 11', 3);
            assert.strictEqual(getTOS(geLess.model), 0);
        });

        it('OPR 0, 12: MORE_THAN compares strictly greater than', () => {
            const gtTrue = runSteps('LIT 0, 15\nLIT 0, 10\nOPR 0, 12', 3);
            assert.strictEqual(getTOS(gtTrue.model), 1);

            const gtFalse = runSteps('LIT 0, 10\nLIT 0, 10\nOPR 0, 12', 3);
            assert.strictEqual(getTOS(gtFalse.model), 0);
        });

        it('OPR 0, 13: LESS_EQ_THAN compares less or equal', () => {
            const leEq = runSteps('LIT 0, 10\nLIT 0, 10\nOPR 0, 13', 3);
            assert.strictEqual(getTOS(leEq.model), 1);

            const leLess = runSteps('LIT 0, 5\nLIT 0, 10\nOPR 0, 13', 3);
            assert.strictEqual(getTOS(leLess.model), 1);

            const leMore = runSteps('LIT 0, 15\nLIT 0, 10\nOPR 0, 13', 3);
            assert.strictEqual(getTOS(leMore.model), 0);
        });
    });

    describe('STO and LOD (Store & Load Variables)', () => {
        it('stores value into local variable and loads it back', () => {
            const code = [
                'INT 0, 4',     // allocate 4 slots: 0,1,2 (links/pc) and 3 (var x)
                'LIT 0, 123',   // push 123
                'STO 0, 3',     // store into offset 3
                'LOD 0, 3',     // load back from offset 3
            ].join('\n');

            const res = runSteps(code, 4);
            assert.strictEqual(getTOS(res.model), 123);
        });

        it('supports multiple variables in activation record', () => {
            const code = [
                'INT 0, 5',     // offsets 3 (a) and 4 (b)
                'LIT 0, 20',
                'STO 0, 3',
                'LIT 0, 30',
                'STO 0, 4',
                'LOD 0, 3',
                'LOD 0, 4',
                'OPR 0, 2',     // 20 + 30
            ].join('\n');

            const res = runSteps(code, 8);
            assert.strictEqual(getTOS(res.model), 50);
        });
    });

    describe('JMP and JMC (Jumps)', () => {
        it('JMP jumps unconditionally to target address', () => {
            const code = [
                'JMP 0, 2',
                'LIT 0, 999', // skipped
                'LIT 0, 42',
            ].join('\n');

            const res = runSteps(code, 2);
            assert.strictEqual(getTOS(res.model), 42);
            assert.strictEqual(res.model.sp, 0);
        });

        it('JMC jumps when top of stack is 0 (false condition)', () => {
            const code = [
                'LIT 0, 0',     // false
                'JMC 0, 3',     // should jump to line 3
                'LIT 0, 111',   // skipped
                'LIT 0, 222',
            ].join('\n');

            const res = runSteps(code, 3);
            assert.strictEqual(getTOS(res.model), 222);
        });

        it('JMC does not jump when top of stack is non-zero (true condition)', () => {
            const code = [
                'LIT 0, 1',     // true
                'JMC 0, 3',     // should not jump
                'LIT 0, 111',   // executed
                'LIT 0, 222',
            ].join('\n');

            const res = runSteps(code, 3);
            assert.strictEqual(getTOS(res.model), 111);
        });
    });

    describe('CAL and RET (Procedure Call & Return)', () => {
        it('calls procedure, executes, and returns', () => {
            const code = [
                'INT 0, 3',     // 0: init main frame (0..2)
                'CAL 0, 3',     // 1: call proc at 3
                'RET 0, 0',     // 2: main return (halts)
                'INT 0, 4',     // 3: proc frame
                'LIT 0, 777',   // 4: proc body
                'STO 0, 3',     // 5: store into local var
                'RET 0, 0',     // 6: proc return
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
        });

        it('accesses outer scope variable with level difference L = 1', () => {
            const code = [
                'INT 0, 4',     // 0: main frame, offset 3 is var x
                'LIT 0, 55',    // 1: x = 55
                'STO 0, 3',     // 2
                'CAL 0, 5',     // 3: call proc
                'RET 0, 0',     // 4: exit
                'INT 0, 3',     // 5: proc frame
                'LOD 1, 3',     // 6: load x from outer scope (level 1)
                'LIT 0, 10',    // 7
                'OPR 0, 2',     // 8: 55 + 10 = 65
                'STO 1, 3',     // 9: store back into outer scope x
                'RET 0, 0',     // 10: return to main
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            // After returning to main, main's var x at offset 3 should be 65
            assert.strictEqual(res.model.stack.stackItems[3].value, 65);
        });
    });
});
