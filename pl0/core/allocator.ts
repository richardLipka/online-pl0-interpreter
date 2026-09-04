import { AllocatorType, Heap, HeapBlock } from './model';

// -------------------------------------------------------------------------
//    FUNCTIONS THAT HAVE TO BE IMPLEMENTED
// -------------------------------------------------------------------------

export type HeapCellRole = 'outOfBounds' | 'meta' | 'unallocated' | 'allocated';

/**
 * Returns role of cell at address for checking memory access:
 * - 'outOfBounds' if outside [0, heap.size - 1]
 * - 'meta' if falling on header metadata cells of any block
 * - 'unallocated' if falling into free memory block or outside recognized blocks
 * - 'allocated' if falling into active data block
 */
export function GetHeapCellRole(heap: Heap, address: number): HeapCellRole {
    if (address < 0 || address >= heap.size) {
        return 'outOfBounds';
    }

    const isDoubly = heap.allocatorType === AllocatorType.DOUBLY_LINKED;
    const metaSize = isDoubly ? 3 : 2;

    let curr = 0;
    while (curr < heap.size - (metaSize - 1)) {
        let bSize = heap.values[curr] + metaSize;
        if (bSize <= 0 || !Number.isFinite(bSize)) break;
        if (address >= curr && address < curr + bSize) {
            if (address < curr + metaSize) {
                return 'meta';
            }
            return heap.values[curr + 1] === 0 ? 'unallocated' : 'allocated';
        }
        curr += bSize;
    }

    return 'unallocated';
}

function AllocateSingle(heap: Heap, count: number): number {
    let blockAddress = 0;

    // First block has to start at 0
    while (blockAddress < heap.size - 1) {
        // If the block is free and large enough
        if (heap.values[blockAddress + 1] === 0 && heap.values[blockAddress] >= count) {
            // the block info takes up two cells, if the block is exactly count large or one larger
            // we allocate it as is
            if (
                heap.values[blockAddress] === count ||
                heap.values[blockAddress] === count + 1
            ) {
                heap.values[blockAddress + 1] = 1;
                return blockAddress + 2;
            } else {
                // Otherwise we split the block - one count large and the following
                // count smaller and 2 more smaller for the block info
                heap.values[blockAddress + count + 2] =
                    heap.values[blockAddress] - count - 2;
                heap.values[blockAddress + count + 3] = 0;
                heap.values[blockAddress] = count;
                heap.values[blockAddress + 1] = 1;
                return blockAddress + 2;
            }
        } else {
            let bSize = heap.values[blockAddress] + 2;
            if (bSize <= 0 || !Number.isFinite(bSize)) break;
            blockAddress += bSize;
        }
    }

    // No empty space found
    return -1;
}

function AllocateDoubly(heap: Heap, count: number): number {
    let blockAddress = 0;

    while (blockAddress < heap.size - 2) {
        if (heap.values[blockAddress + 1] === 0 && heap.values[blockAddress] >= count) {
            // Header takes 3 cells [size, free, prev_address]
            // We need at least 3 cells for remainder header to split: count + 3
            if (
                heap.values[blockAddress] === count ||
                heap.values[blockAddress] === count + 1 ||
                heap.values[blockAddress] === count + 2
            ) {
                heap.values[blockAddress + 1] = 1;
                return blockAddress + 3;
            } else {
                const newBlock = blockAddress + count + 3;
                const remainderDataSize = heap.values[blockAddress] - count - 3;

                heap.values[newBlock] = remainderDataSize;
                heap.values[newBlock + 1] = 0; // free
                heap.values[newBlock + 2] = blockAddress; // prev points to blockAddress

                // If a successor block exists after newBlock, update its prev_address
                const afterNewBlock = newBlock + remainderDataSize + 3;
                if (afterNewBlock < heap.size - 2) {
                    heap.values[afterNewBlock + 2] = newBlock;
                }

                heap.values[blockAddress] = count;
                heap.values[blockAddress + 1] = 1;
                // heap.values[blockAddress + 2] (prev_address) remains unchanged
                return blockAddress + 3;
            }
        } else {
            let bSize = heap.values[blockAddress] + 3;
            if (bSize <= 0 || !Number.isFinite(bSize)) break;
            blockAddress += bSize;
        }
    }

    return -1;
}

/**
 * Allocates continuous block of specified size on heap
 * @param heap heap
 * @param count size
 * @returns index of the first allocated cell or -1 if the allocation failed
 */
export function Allocate(heap: Heap, count: number): number {
    if (heap.allocatorType === AllocatorType.DOUBLY_LINKED) {
        return AllocateDoubly(heap, count);
    }
    return AllocateSingle(heap, count);
}

function FreeSingle(heap: Heap, address: number): number {
    if (address > heap.size - 1 || address < 2) {
        return -1;
    }

    // Verify address starts at a valid block boundary
    let curr = 0;
    let validBlock = false;
    while (curr < heap.size - 1) {
        if (curr + 2 === address) {
            validBlock = true;
            break;
        }
        let bSize = heap.values[curr] + 2;
        if (bSize <= 0 || !Number.isFinite(bSize)) break;
        curr += bSize;
    }

    if (!validBlock) {
        return -1;
    }

    // Check if the block is already free (double-free prevention)
    if (heap.values[address - 1] === 0) {
        return -1;
    }

    let blockSize = heap.values[address - 2];
    if (address + blockSize > heap.size) {
        blockSize = heap.size - address;
    }

    // Mark the block as free
    heap.values[address - 1] = 0;

    // Zero the memory
    for (let i = 0; i < blockSize; i++) {
        heap.values[address + i] = 0;
    }

    // Coalesce right
    const right = address + blockSize;
    if (right < heap.size - 1) {
        if (heap.values[right + 1] === 0) {
            heap.values[address - 2] += heap.values[right] + 2;
            heap.values[right] = 0;
            heap.values[right + 1] = 0;
        }
    }

    return 0;
}

function FreeDoubly(heap: Heap, address: number): number {
    if (address > heap.size - 1 || address < 3) {
        return -1;
    }

    // Verify address starts at a valid block boundary (curr + 3 === address)
    let curr = 0;
    let validBlock = false;
    while (curr < heap.size - 2) {
        if (curr + 3 === address) {
            validBlock = true;
            break;
        }
        let bSize = heap.values[curr] + 3;
        if (bSize <= 0 || !Number.isFinite(bSize)) break;
        curr += bSize;
    }

    if (!validBlock) {
        return -1;
    }

    const blockAddress = address - 3;
    if (heap.values[blockAddress + 1] === 0) {
        return -1;
    }

    let dataSize = heap.values[blockAddress];
    if (address + dataSize > heap.size) {
        dataSize = heap.size - address;
    }

    // Mark as free
    heap.values[blockAddress + 1] = 0;

    // Zero out data memory
    for (let i = 0; i < dataSize; i++) {
        heap.values[address + i] = 0;
    }

    // 1. Check right neighbor:
    let right = blockAddress + heap.values[blockAddress] + 3;
    if (right < heap.size - 2 && heap.values[right + 1] === 0) {
        const rightDataSize = heap.values[right];
        const afterRight = right + rightDataSize + 3;
        heap.values[blockAddress] += rightDataSize + 3;

        // If block exists after right, its prev_address now points to blockAddress
        if (afterRight < heap.size - 2) {
            heap.values[afterRight + 2] = blockAddress;
        }

        heap.values[right] = 0;
        heap.values[right + 1] = 0;
        heap.values[right + 2] = 0;
    }

    // 2. Check left neighbor using prev_address:
    let prev = heap.values[blockAddress + 2];
    if (prev >= 0 && prev < heap.size - 2 && heap.values[prev + 1] === 0) {
        const currDataSize = heap.values[blockAddress];
        const afterBlock = blockAddress + currDataSize + 3;
        heap.values[prev] += currDataSize + 3;

        // If block exists after blockAddress, its prev_address now points to prev
        if (afterBlock < heap.size - 2) {
            heap.values[afterBlock + 2] = prev;
        }

        heap.values[blockAddress] = 0;
        heap.values[blockAddress + 1] = 0;
        heap.values[blockAddress + 2] = 0;
    }

    return 0;
}

/**
 * Given address, free it
 * @param heap heap
 * @param address address
 * @returns 0 on success, -1 on failure
 */
export function Free(heap: Heap, address: number): number {
    if (heap.allocatorType === AllocatorType.DOUBLY_LINKED) {
        return FreeDoubly(heap, address);
    }
    return FreeSingle(heap, address);
}

/**
 * Simulate allocation of block given size
 * @param heap heap
 * @param count size
 * @returns first allocated cell index on success or -1 on failure
 */
export function AllocateDummy(heap: Heap, count: number): number {
    const isDoubly = heap.allocatorType === AllocatorType.DOUBLY_LINKED;
    const metaSize = isDoubly ? 3 : 2;
    let blockAddress = 0;

    while (blockAddress < heap.size - (metaSize - 1)) {
        if (heap.values[blockAddress + 1] === 0 && heap.values[blockAddress] >= count) {
            return blockAddress + metaSize;
        } else {
            let bSize = heap.values[blockAddress] + metaSize;
            if (bSize <= 0 || !Number.isFinite(bSize)) break;
            blockAddress += bSize;
        }
    }

    return -1;
}

/**
 * Simulate free of an address
 * @param heap heap
 * @param address address
 * @returns number of freed cells on success or -1 on failure
 */
export function FreeDummy(heap: Heap, address: number): number {
    const isDoubly = heap.allocatorType === AllocatorType.DOUBLY_LINKED;
    const metaSize = isDoubly ? 3 : 2;
    if (address > heap.size - 1 || address < metaSize) {
        return -1;
    }

    let blockSize = heap.values[address - metaSize];
    return blockSize;
}

/**
 * Given heap and address, return the value stored on heap
 * @param heap heap
 * @param address address
 * @returns value stored on success, null on out-of-bounds access
 */
export function GetValueFromHeap(heap: Heap, address: number): number | null {
    if (address < 0 || address > heap.size - 1) {
        return null;
    } else {
        return heap.values[address];
    }
}

/**
 * Given heap, address and value, store the value on the address.
 * Permitted to overwrite metadata and write into unallocated memory.
 * @param heap heap
 * @param address address
 * @param value value
 * @returns 0 on success, -1 on out-of-bounds access
 */
export function PutValueOnHeap(heap: Heap, address: number, value: number): number {
    if (address < 0 || address > heap.size - 1) {
        return -1;
    }
    heap.values[address] = value;
    return 0;
}

export function GetValueFromHeapDummy(heap: Heap, address: number): number | null {
    if (address < 0 || address > heap.size - 1) {
        return null;
    }
    const role = GetHeapCellRole(heap, address);
    if (role === 'unallocated') {
        return NaN;
    }
    return heap.values[address];
}

export function PutValueOnHeapDummy(heap: Heap, address: number): number {
    if (address < 0 || address > heap.size - 1) {
        return -1;
    }
    const role = GetHeapCellRole(heap, address);
    if (role === 'unallocated') {
        return -2;
    }
    return 0;
}

/**
 * For each block in memory a HeapBlock has to be created and added to the heap.heapBlocks array
 * @param heap heap
 */
export function UpdateHeapBlocks(heap: Heap) {
    let blockAddress = 0;
    heap.heapBlocks = [];
    const isDoubly = heap.allocatorType === AllocatorType.DOUBLY_LINKED;
    const metaSize = isDoubly ? 3 : 2;

    while (blockAddress < heap.size - (metaSize - 1)) {
        let dataSize = heap.values[blockAddress];
        let blockSize = dataSize + metaSize;
        if (blockSize <= 0 || !Number.isFinite(blockSize) || blockAddress + blockSize > heap.size + 1000) {
            break;
        }
        let free = heap.values[blockAddress + 1] === 0;
        let dataAddress = blockAddress + metaSize;
        let allocatorInfoIndices = isDoubly
            ? [blockAddress, blockAddress + 1, blockAddress + 2]
            : [blockAddress, blockAddress + 1];

        heap.heapBlocks.push({
            blockAddress: blockAddress,
            blockSize: blockSize,
            dataSize: dataSize,
            dataAddress: dataAddress,
            free: free,
            allocatorInfoIndices: allocatorInfoIndices,
        });

        blockAddress += blockSize;
    }
}
