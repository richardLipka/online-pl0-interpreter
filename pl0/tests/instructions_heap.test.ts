import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, runSteps, getTOS } from './test_helpers';

describe('Extended Heap Instructions (NEW, DEL, LDA, STA)', () => {
    describe('NEW (Allocate Heap Block)', () => {
        it('allocates heap block of given size and returns data address', () => {
            const code = [
                'LIT 0, 5', // request 5 cells
                'NEW 0, 0', // allocate
            ].join('\n');

            const res = runSteps(code, 2);
            const addr = getTOS(res.model) as number;
            assert.strictEqual(typeof addr, 'number');
            assert.ok(addr >= 2, 'Allocated data address must be >= 2 (after header)');
            assert.strictEqual(res.model.sp, 0);
        });

        it('returns -1 when requesting zero or negative block size', () => {
            const code = [
                'LIT 0, 0',
                'NEW 0, 0',
                'LIT 0, -5',
                'NEW 0, 0',
            ].join('\n');

            const res = runSteps(code, 4);
            assert.strictEqual(res.model.stack.stackItems[0].value, -1);
            assert.strictEqual(res.model.stack.stackItems[1].value, -1);
        });

        it('returns -1 when requesting size exceeding total heap size', () => {
            const code = [
                'LIT 0, 99999',
                'NEW 0, 0',
            ].join('\n');

            const res = runSteps(code, 2);
            assert.strictEqual(getTOS(res.model), -1);
        });
    });

    describe('STA and LDA (Store & Load Heap Memory)', () => {
        it('stores value at heap address and reads it back', () => {
            const code = [
                'LIT 0, 3',     // allocate 3 cells
                'NEW 0, 0',     // returns addr (e.g. 2)
                // Stack: [addr]
                'LIT 0, 2',     // target addr
                'LIT 0, 888',   // value to store
                'STA 0, 0',     // heap[2] = 888
                'LIT 0, 2',     // target addr to read
                'LDA 0, 0',     // read heap[2]
            ].join('\n');

            const res = runSteps(code, 7);
            assert.strictEqual(getTOS(res.model), 888);
        });

        it('stores and reads multiple cells in allocated block', () => {
            const code = [
                'LIT 0, 3',
                'NEW 0, 0',     // returns dataAddress (e.g. 2)
                // store 10 at addr 2
                'LIT 0, 2',
                'LIT 0, 10',
                'STA 0, 0',
                // store 20 at addr 3
                'LIT 0, 3',
                'LIT 0, 20',
                'STA 0, 0',
                // load both and add
                'LIT 0, 2',
                'LDA 0, 0',
                'LIT 0, 3',
                'LDA 0, 0',
                'OPR 0, 2',     // 10 + 20
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(getTOS(res.model), 30);
        });

        it('throws an error when loading from unallocated or out-of-bounds address', () => {
            assert.throws(() => {
                runSteps('LIT 0, 999\nLDA 0, 0', 2);
            });
        });
    });

    describe('DEL (Deallocate Heap Block)', () => {
        it('frees an allocated block successfully', () => {
            const code = [
                'LIT 0, 4',
                'NEW 0, 0',     // alloc -> addr 2
                'LIT 0, 2',
                'DEL 0, 0',     // free
            ].join('\n');

            const res = runSteps(code, 4);
            assert.strictEqual(res.model.sp, 0); // initial returned addr still on stack, DEL popped target addr
        });

        it('throws an error when attempting to free an already-freed block (double-free)', () => {
            const code = [
                'LIT 0, 4',
                'NEW 0, 0',
                'LIT 0, 2',
                'DEL 0, 0',     // first free: succeeds
                'LIT 0, 2',
                'DEL 0, 0',     // second free: must throw
            ].join('\n');

            assert.throws(() => {
                runSteps(code, 6);
            });
        });

        it('throws an error when attempting to free an unallocated address', () => {
            assert.throws(() => {
                runSteps('LIT 0, 50\nDEL 0, 0', 2);
            });
        });
    });
});
