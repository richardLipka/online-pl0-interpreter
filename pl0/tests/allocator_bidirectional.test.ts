import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AllocatorType, InstructionType } from '../core/model';
import { InitModel, NextStep } from '../core/operations';
import { Allocate, Free, GetHeapCellRole, UpdateHeapBlocks } from '../core/allocator';
import i18next from 'i18next';
import csCore from '../localization/cs/core.json';
import enCore from '../localization/en/core.json';

if (!i18next.isInitialized) {
    i18next.init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            cs: { core: csCore },
            en: { core: enCore },
        },
    });
}

describe('Bidirectional Doubly-Linked Allocator & Soft Memory Checks', () => {
    describe('Doubly-Linked Allocator (AllocatorType.DOUBLY_LINKED)', () => {
        it('initializes heap with 3 metadata cells [size, free, prev_address]', () => {
            const model = InitModel(100, 50, AllocatorType.DOUBLY_LINKED);
            assert.strictEqual(model.heap.allocatorType, AllocatorType.DOUBLY_LINKED);
            assert.strictEqual(model.heap.values[0], 47); // 50 - 3
            assert.strictEqual(model.heap.values[1], 0);  // free
            assert.strictEqual(model.heap.values[2], -1); // prev_address = none
            assert.strictEqual(model.heap.heapBlocks[0].dataAddress, 3);
            assert.strictEqual(model.heap.heapBlocks[0].dataSize, 47);
            assert.deepStrictEqual(model.heap.heapBlocks[0].allocatorInfoIndices, [0, 1, 2]);
        });

        it('allocates blocks with 3-cell headers and correct prev_address links', () => {
            const heap = InitModel(100, 50, AllocatorType.DOUBLY_LINKED).heap;

            // Allocate 10 cells
            const addr1 = Allocate(heap, 10);
            assert.strictEqual(addr1, 3);
            assert.strictEqual(heap.values[0], 10);
            assert.strictEqual(heap.values[1], 1); // allocated
            assert.strictEqual(heap.values[2], -1); // first block

            // Remainder block at 13
            assert.strictEqual(heap.values[13], 34); // 47 - 10 - 3
            assert.strictEqual(heap.values[14], 0);  // free
            assert.strictEqual(heap.values[15], 0);  // prev points to 0

            // Allocate 15 cells from remainder
            const addr2 = Allocate(heap, 15);
            assert.strictEqual(addr2, 16);
            assert.strictEqual(heap.values[13], 15);
            assert.strictEqual(heap.values[14], 1);
            assert.strictEqual(heap.values[15], 0);

            // Second remainder block at 31
            assert.strictEqual(heap.values[31], 16); // 34 - 15 - 3
            assert.strictEqual(heap.values[32], 0);
            assert.strictEqual(heap.values[33], 13); // prev points to 13
        });

        it('performs bidirectional coalescing when freeing in reverse order (backward merge)', () => {
            const heap = InitModel(100, 60, AllocatorType.DOUBLY_LINKED).heap;

            const addr1 = Allocate(heap, 10); // at 3 (block at 0..12)
            const addr2 = Allocate(heap, 10); // at 16 (block at 13..25)
            const addr3 = Allocate(heap, 10); // at 29 (block at 26..38)

            UpdateHeapBlocks(heap);
            assert.strictEqual(heap.heapBlocks.length, 4); // 3 allocated + 1 trailing free

            // Free in reverse order: addr3, then addr2, then addr1
            assert.strictEqual(Free(heap, addr3), 0);
            assert.strictEqual(Free(heap, addr2), 0);
            assert.strictEqual(Free(heap, addr1), 0);

            UpdateHeapBlocks(heap);
            // All blocks should have coalesced into 1 free block spanning entire heap!
            assert.strictEqual(heap.heapBlocks.length, 1);
            assert.strictEqual(heap.heapBlocks[0].free, true);
            assert.strictEqual(heap.heapBlocks[0].blockAddress, 0);
            assert.strictEqual(heap.heapBlocks[0].dataSize, 57); // 60 - 3
            assert.strictEqual(heap.values[0], 57);
            assert.strictEqual(heap.values[1], 0);
            assert.strictEqual(heap.values[2], -1);
        });

        it('performs bidirectional coalescing when freeing middle block between two free blocks', () => {
            const heap = InitModel(100, 60, AllocatorType.DOUBLY_LINKED).heap;

            const addr1 = Allocate(heap, 10); // block 0 (cells 0..12)
            const addr2 = Allocate(heap, 10); // block 13 (cells 13..25)
            const addr3 = Allocate(heap, 10); // block 26 (cells 26..38)

            // Free block 3 (trailing remainder merges into block 26)
            assert.strictEqual(Free(heap, addr3), 0);
            // Free block 1 (block 0 is now free)
            assert.strictEqual(Free(heap, addr1), 0);

            // Now free middle block 2 (addr2 at 16) -> should merge both left (with 0) and right (with 26)
            assert.strictEqual(Free(heap, addr2), 0);

            UpdateHeapBlocks(heap);
            assert.strictEqual(heap.heapBlocks.length, 1);
            assert.strictEqual(heap.heapBlocks[0].free, true);
            assert.strictEqual(heap.heapBlocks[0].blockAddress, 0);
            assert.strictEqual(heap.heapBlocks[0].dataSize, 57);
        });
    });

    describe('Memory Access Soft Warnings & Metadata Overwrite Permission', () => {
        it('allows STA to overwrite metadata cells and emits soft warning without throwing', () => {
            const model = InitModel(100, 50, AllocatorType.SINGLE_LINKED);
            // Block 0 metadata is at index 0 (size) and 1 (free status)
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '99', explanationParts: null },
                { index: 2, instruction: InstructionType.STA, level: 0, parameter: 0, parameter_str: '', explanationParts: null },
            ];

            // Step 0: LIT 0
            NextStep({ model, instructions, input: '' });
            // Step 1: LIT 99
            NextStep({ model, instructions, input: '' });
            // Step 2: STA 0, 0 -> heap[0] = 99
            const res = NextStep({ model, instructions, input: '' });

            // Must have updated memory (metadata overwritten)
            assert.strictEqual(model.heap.values[0], 99);
            // Must have emitted soft warning
            assert.ok(res.warnings.length > 0, 'Should produce a warning');
            assert.match(res.warnings[0], /0/); // Mentions address 0
        });

        it('allows STA to write into unallocated memory and emits soft warning', () => {
            const model = InitModel(100, 50, AllocatorType.SINGLE_LINKED);
            // Cell 20 is in free memory
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '20', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '555', explanationParts: null },
                { index: 2, instruction: InstructionType.STA, level: 0, parameter: 0, parameter_str: '', explanationParts: null },
            ];

            NextStep({ model, instructions, input: '' });
            NextStep({ model, instructions, input: '' });
            const res = NextStep({ model, instructions, input: '' });

            assert.strictEqual(model.heap.values[20], 555);
            assert.ok(res.warnings.length > 0);
            assert.match(res.warnings[0], /20/);
        });

        it('allows LDA to read metadata with soft warning without throwing', () => {
            const model = InitModel(100, 50, AllocatorType.SINGLE_LINKED);
            // Read metadata cell 0 (data size = 48)
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 1, instruction: InstructionType.LDA, level: 0, parameter: 0, parameter_str: '', explanationParts: null },
            ];

            NextStep({ model, instructions, input: '' });
            const res = NextStep({ model, instructions, input: '' });

            assert.strictEqual(model.stack.stackItems[model.sp].value, 48);
            assert.ok(res.warnings.length > 0);
            assert.match(res.warnings[0], /0/);
        });

        it('allows LDA to read unallocated memory with soft warning without throwing', () => {
            const model = InitModel(100, 50, AllocatorType.SINGLE_LINKED);
            // Read unallocated cell 15
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '15', explanationParts: null },
                { index: 1, instruction: InstructionType.LDA, level: 0, parameter: 0, parameter_str: '', explanationParts: null },
            ];

            NextStep({ model, instructions, input: '' });
            const res = NextStep({ model, instructions, input: '' });

            assert.strictEqual(model.stack.stackItems[model.sp].value, 0);
            assert.ok(res.warnings.length > 0);
            assert.match(res.warnings[0], /15/);
        });

        it('still throws fatal exception on out-of-bounds access (< 0 or >= size)', () => {
            const model = InitModel(100, 50, AllocatorType.SINGLE_LINKED);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '100', explanationParts: null },
                { index: 1, instruction: InstructionType.LDA, level: 0, parameter: 0, parameter_str: '', explanationParts: null },
            ];

            NextStep({ model, instructions, input: '' });
            assert.throws(() => {
                NextStep({ model, instructions, input: '' });
            });
        });
    });
});
