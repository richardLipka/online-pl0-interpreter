import type { Heap } from './model';
import type { HeapBlock } from './model';

// -------------------------------------------------------------------------
//    FUNCTIONS THAT HAVE TO BE IMPLEMENTED
// -------------------------------------------------------------------------

/**
 * Allocates continuous block of specified size on heap
 * @param heap heap
 * @param count size
 * @returns index of the first allocated cell or -1 if the allocation failed
 */
export function Allocate(heap: Heap, count: number): number {
    let blockAddress = 0;

    // First block has to start at 0
    while (blockAddress < heap.size - 1) {
        // If the block is free and large enough
        if (heap.values[blockAddress + 1] == 0 && heap.values[blockAddress] >= count) {
            // the block info takes up two cells, of the block is exactly count large or one larger
            // we allocate it as is
            if (
                heap.values[blockAddress] == count ||
                heap.values[blockAddress] == count + 1
            ) {
                heap.values[blockAddress + 1] = 1;
                return blockAddress + 2;
            } else {
                // Otherwise we split the block - one count large and the following
                // count smaller and 2 more smaller for the block info
                // worst case scenario, we will have empty block with size 0 taking up 2 cells
                heap.values[blockAddress + count + 2] =
                    heap.values[blockAddress] - count - 2;
                heap.values[blockAddress + count + 3] = 0;
                heap.values[blockAddress] = count;
                heap.values[blockAddress + 1] = 1;
                return blockAddress + 2;
            }
        } else {
            // if the block is not empty or large enough, we move onto another block
            // which is 2 memory info cells and block size more to the right
            let bSize = heap.values[blockAddress] + 2;
            if (bSize <= 0) break;
            blockAddress += bSize;
        }
    }

    // No empty space found
    return -1;
}

/**
 * Given address, free it
 * @param heap heap
 * @param address address
 * @returns 0 on success, -1 on failure
 */
export function Free(heap: Heap, address: number): number {
    if (address > heap.size - 1 || address < 2) {
        // Fail on out of bounds
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
        if (bSize <= 0) break;
        curr += bSize;
    }

    if (!validBlock) {
        return -1;
    }

    // Check if the block is already free (double-free prevention)
    if (heap.values[address - 1] === 0) {
        return -1;
    }

    // block size is two to the left of the address
    let blockSize = heap.values[address - 2];

    // To prevent errors while deallocating incorrectly
    if (address + blockSize > heap.size - 1) {
        blockSize = heap.size - 1 - address;
    }

    // mark the block as free
    heap.values[address - 1] = 0;

    // zero the memory
    for (let i = 0; i < blockSize; i++) {
        heap.values[address + i] = 0;
    }

    // check right
    if (address + blockSize < heap.size - 1) {
        // We have basically a singly linked list, so we can merge the block only with the
        // one to the right if it is empty
        if (heap.values[address + blockSize + 1] == 0) {
            // We set the freed block size to be following block size larger + 2
            // for the block info
            heap.values[address - 2] += heap.values[address + blockSize] + 2;
            // Then we zero the memory info of the block merged with the one freed
            heap.values[address + blockSize] = 0;
            heap.values[address + blockSize + 1] = 0;
        }
    }

    return 0;
}

/**
 * Simulate allocation of block given size
 * @param heap heap
 * @param count size
 * @returns first allocated cell index on success or -1 on failure
 */
export function AllocateDummy(heap: Heap, count: number): number {
    let blockAddress = 0;

    // First block has to start at 0
    while (blockAddress < heap.size - 1) {
        // If the block is free and large enough
        if (heap.values[blockAddress + 1] == 0 && heap.values[blockAddress] >= count) {
            // the block info takes up two cells, so if the block is exactly count large or one larger
            // we allocate it as is
            if (
                heap.values[blockAddress] == count ||
                heap.values[blockAddress] == count + 1
            ) {
                return blockAddress + 2;
            } else {
                // Otherwise we split the block - one count large and the following
                // count smaller and 2 more smaller for the block info
                // worst case scenation, we will have empty block with size 0 taking up 2 cells
                return blockAddress + 2;
            }
        } else {
            // if the block is not empty or large enough, we move onto another block
            // which is 2 memory info cells and block size more to the right
            blockAddress += heap.values[blockAddress] + 2;
        }
    }

    // No empty space found
    return -1;
}

/**
 * Simulate free of an address
 * @param heap heap
 * @param address address
 * @returns number of freed cells on success or -1 on failure
 */
export function FreeDummy(heap: Heap, address: number): number {
    if (address > heap.size - 1 || address < 0) {
        // Fail on out of bounds
        return -1;
    }

    // block size is two to the left of the address
    let blockSize = heap.values[address - 2];

    return blockSize;
}

/**
 * Given heap and address, return the value stored on heap
 * @param heap heap
 * @param address address
 * @returns value stored on success, null on out-of-bounds access and NaN on unallocated memory access
 */
export function GetValueFromHeap(heap: Heap, address: number): number | null {
    if (address < 0 || address > heap.size - 1) {
        return null;
    } else {
        return heap.values[address];
    }
    // We dont care about unallocated memory with this approach
}

/**
 * Given heap, address and value, store the value on the address
 * @param heap heap
 * @param address address
 * @param value value
 * @returns 0 on success, -1 on undefined index (larger than heap max size), -2 on unallocated memory access
 */
export function PutValueOnHeap(heap: Heap, address: number, value: number): number {
    if (address < 0 || address > heap.size - 1) {
        return -1;
    }

    // Check if target address hits allocator metadata
    let curr = 0;
    while (curr < heap.size - 1) {
        let bSize = heap.values[curr] + 2;
        if (address === curr || address === curr + 1) {
            return -2;
        }
        if (bSize <= 0) break;
        curr += bSize;
    }

    heap.values[address] = value;
    return 0;
}

/**
 * Given heap and address, return the value stored on heap
 * @param heap heap
 * @param address address
 * @returns value stored on success, null on out-of-bounds and NaN on unallocated memory access
 */
export function GetValueFromHeapDummy(heap: Heap, address: number): number | null {
    if (address < 0 || address > heap.size - 1) {
        return null;
    } else {
        return heap.values[address];
    }
}

/**
 * Given heap, address and value, simulate storing the value on the address
 * @param heap heap
 * @param address address
 * @param value value
 * @returns 0 on success, -1 on undefined index (larger than heap max size), -2 on unallocated memory access
 */
export function PutValueOnHeapDummy(heap: Heap, address: number) {
    if (address < 0 || address > heap.size - 1) {
        return -1;
    } else {
        return 0;
    }
}

/**
 * Heap has attribute heapBlocks, which is info for the UI about how to
 * visualise the heap - it's an array of HeapBlock structures which contain
 *  - blockAddress - this is the index in heap.values where the whole block starts (including the allocator info)
 *  - blockSize - how big the block is incl. the allocator info
 *  - dataAddress - where the data starts (aka the index the Allocate method returns)
 *  - dataSize - how big the data part of the block is (the part user is supposed to use)
 *  - allocatorInfoIndices - indices of all the cells in the block, which are used by allocator (block size, empty/free, ...)
 *  - free - whether the block is free or not
 * For each block in memory a HeapBlock has to be created and added to the heap.heapBlocks array
 * @param heap heap
 */
export function UpdateHeapBlocks(heap: Heap) {
    let blockAddress = 0;
    heap.heapBlocks = [];
    while (blockAddress < heap.size - 1) {
        let blockSize = heap.values[blockAddress] + 2;
        if (blockSize <= 0) {
            break;
        }
        let dataSize = heap.values[blockAddress];
        let free = heap.values[blockAddress + 1] == 0;
        let dataAddress = blockAddress + 2;
        let allocatorInfoIndices = [blockAddress, blockAddress + 1];
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

// -------------------------------------------------------------------------
//  UTILITY
// -------------------------------------------------------------------------
