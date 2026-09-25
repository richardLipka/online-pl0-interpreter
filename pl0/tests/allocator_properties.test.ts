import { describe, it } from 'node:test';
import assert from 'node:assert';
import './test_helpers';
import { AllocatorType, Heap, HeapBlock } from '../core/model';
import { InitModel } from '../core/operations';
import {
    Allocate,
    AllocateDummy,
    Free,
    FreeDummy,
    GetHeapCellRole,
    UpdateHeapBlocks,
} from '../core/allocator';

function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Live {
    size: number; // requested size
    pattern: number[]; // values written into the block
}

const ALLOCATORS: [string, AllocatorType, number][] = [
    ['single-linked', AllocatorType.SINGLE_LINKED, 2],
    ['doubly-linked', AllocatorType.DOUBLY_LINKED, 3],
];

// Maximal runs of adjacent free blocks with their size after merging
function freeRuns(blocks: HeapBlock[], meta: number): { dataAddress: number; dataSize: number }[] {
    const runs: { dataAddress: number; dataSize: number }[] = [];
    let current: { dataAddress: number; dataSize: number } | null = null;
    for (const b of blocks) {
        if (!b.free) {
            current = null;
        } else if (current) {
            current.dataSize += b.dataSize + meta;
        } else {
            current = { dataAddress: b.dataAddress, dataSize: b.dataSize };
            runs.push(current);
        }
    }
    return runs;
}

function blocksOf(heap: Heap): HeapBlock[] {
    UpdateHeapBlocks(heap);
    return heap.heapBlocks;
}

// Invariants that must hold after every operation
function checkHeap(heap: Heap, live: Map<number, Live>, meta: number, where: string) {
    const blocks = blocksOf(heap);

    // the blocks tile the whole heap without gaps or overlaps (this is what the heap view draws)
    let next = 0;
    for (const b of blocks) {
        assert.strictEqual(b.blockAddress, next, `${where}: block starts at ${b.blockAddress}, expected ${next}`);
        assert.ok(b.dataSize >= 0, `${where}: negative data size`);
        assert.strictEqual(b.blockSize, b.dataSize + meta, `${where}: block size`);
        assert.strictEqual(b.dataAddress, b.blockAddress + meta, `${where}: data address`);
        next += b.blockSize;
    }
    assert.strictEqual(next, heap.size, `${where}: blocks cover ${next} of ${heap.size} cells`);

    // allocated blocks are exactly the live ones, big enough, with their data intact
    const allocated = blocks.filter((b) => !b.free);
    assert.deepStrictEqual(
        allocated.map((b) => b.dataAddress).sort((x, y) => x - y),
        Array.from(live.keys()).sort((x, y) => x - y),
        `${where}: allocated blocks`
    );
    for (const b of allocated) {
        const l = live.get(b.dataAddress)!;
        // a block is split only when the rest can hold a header, so it may be up to meta - 1 cells larger
        assert.ok(b.dataSize >= l.size && b.dataSize <= l.size + meta - 1, `${where}: block ${b.dataAddress} has ${b.dataSize} cells for ${l.size}`);
        assert.deepStrictEqual(heap.values.slice(b.dataAddress, b.dataAddress + l.size), l.pattern, `${where}: data of ${b.dataAddress}`);
    }

    // free data cells are zeroed
    for (const b of blocks.filter((b) => b.free)) {
        for (let i = b.dataAddress; i < b.dataAddress + b.dataSize; i++) {
            assert.strictEqual(heap.values[i], 0, `${where}: free cell ${i} is not zero`);
        }
    }

    // cell roles used for the warnings and the heap view agree with the blocks
    for (const b of blocks) {
        for (let i = b.blockAddress; i < b.blockAddress + b.blockSize; i++) {
            const expected = i < b.dataAddress ? 'meta' : b.free ? 'unallocated' : 'allocated';
            assert.strictEqual(GetHeapCellRole(heap, i), expected, `${where}: role of cell ${i}`);
        }
    }

    if (meta === 3) {
        // doubly-linked: correct back links and full coalescing (no two free neighbours)
        blocks.forEach((b, k) => {
            const prev = k === 0 ? -1 : blocks[k - 1].blockAddress;
            assert.strictEqual(heap.values[b.blockAddress + 2], prev, `${where}: prev link of ${b.blockAddress}`);
            if (k > 0) assert.ok(!(b.free && blocks[k - 1].free), `${where}: free blocks ${prev} and ${b.blockAddress} not merged`);
        });
    }
}

describe('Heap allocators (random NEW/DEL sequences)', () => {
    for (const [name, type, meta] of ALLOCATORS) {
        it(`${name}: first fit, splitting, coalescing and data integrity`, () => {
            let allocations = 0;
            let failures = 0;
            let merges = 0;
            for (let seed = 1; seed <= 200; seed++) {
                const rnd = mulberry32(seed);
                const heapSize = 20 + Math.floor(rnd() * 120);
                const heap = InitModel(1024, heapSize, type).heap;
                const live = new Map<number, Live>();
                checkHeap(heap, live, meta, `seed ${seed} init`);

                for (let op = 0; op < 80; op++) {
                    const where = `seed ${seed} op ${op}`;
                    const before = blocksOf(heap).map((b) => ({ ...b }));
                    if (live.size === 0 || rnd() < 0.55) {
                        const count = 1 + Math.floor(rnd() * 15);
                        // first fit: the first run of adjacent free blocks (merged while searching)
                        // that is large enough; the doubly-linked heap never has adjacent free blocks
                        const fit = freeRuns(before, meta).find((r) => r.dataSize >= count);
                        const predicted = AllocateDummy(heap, count);
                        const addr = Allocate(heap, count);
                        assert.strictEqual(addr, fit ? fit.dataAddress : -1, `${where}: NEW ${count}`);
                        assert.strictEqual(predicted, addr, `${where}: explanation predicts NEW ${count}`);
                        if (addr === -1) {
                            failures++;
                        } else {
                            allocations++;
                            const pattern = Array.from({ length: count }, () => 1 + Math.floor(rnd() * 999));
                            pattern.forEach((v, i) => (heap.values[addr + i] = v)); // STA
                            live.set(addr, { size: count, pattern });
                        }
                    } else if (rnd() < 0.9) {
                        const addrs = Array.from(live.keys());
                        const addr = addrs[Math.floor(rnd() * addrs.length)];
                        const block = before.find((b) => b.dataAddress === addr)!;
                        assert.strictEqual(FreeDummy(heap, addr), block.dataSize, `${where}: explanation of DEL ${addr}`);
                        const blockCount = before.length;
                        assert.strictEqual(Free(heap, addr), 0, `${where}: DEL ${addr}`);
                        live.delete(addr);
                        if (blocksOf(heap).length < blockCount) merges++;
                        if (meta === 2) {
                            // single-linked: the freed block absorbed a free right neighbour
                            const blocks = blocksOf(heap);
                            const k = blocks.findIndex((b) => b.blockAddress === block.blockAddress);
                            assert.ok(blocks[k].free, `${where}: freed block is free`);
                            assert.ok(!blocks[k + 1]?.free, `${where}: right neighbour of ${addr} not merged`);
                        }
                    } else {
                        // invalid DEL: an address that is not the start of an allocated block, or a double free
                        const addr = Math.floor(rnd() * heapSize);
                        if (live.has(addr)) continue;
                        const snapshot = [...heap.values];
                        assert.strictEqual(FreeDummy(heap, addr), -1, `${where}: explanation of invalid DEL ${addr}`);
                        assert.strictEqual(Free(heap, addr), -1, `${where}: invalid DEL ${addr}`);
                        assert.deepStrictEqual(heap.values, snapshot, `${where}: invalid DEL changed the heap`);
                    }
                    checkHeap(heap, live, meta, where);
                }

                // after freeing everything (in random order) the whole heap can be allocated again
                const addrs = Array.from(live.keys()).sort(() => rnd() - 0.5);
                for (const addr of addrs) {
                    assert.strictEqual(Free(heap, addr), 0);
                    live.delete(addr);
                    checkHeap(heap, live, meta, `seed ${seed} cleanup`);
                }
                if (meta === 3) {
                    assert.strictEqual(blocksOf(heap).length, 1, `seed ${seed}: doubly-linked heap not fully merged`);
                }
                assert.strictEqual(Allocate(heap, heapSize - meta), meta, `seed ${seed}: whole heap cannot be allocated`);
            }
            assert.ok(allocations > 3000 && failures > 100 && merges > 500, `${allocations} allocations, ${failures} failures, ${merges} merges`);
        });
    }
});
