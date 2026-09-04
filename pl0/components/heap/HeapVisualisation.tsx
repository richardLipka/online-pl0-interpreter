import React from 'react';
import { Heap, HeapCellType } from '../../core/model';
import { HeapCellVisualisation } from './HeapCellVisualisation';

type HeapVisualisationProps = {
    heap: Heap;
    heapToBeHighlighted: Map<number, string>;
};

export function HeapVisualisation(props: HeapVisualisationProps) {
    function getCellType(index: number): HeapCellType {
        if (!props.heap.heapBlocks || props.heap.heapBlocks.length === 0) {
            return HeapCellType.UNKNOWN;
        }

        for (const block of props.heap.heapBlocks) {
            const first = block.blockAddress;
            const last = block.blockAddress + block.blockSize - 1;

            const firstData = block.dataAddress;
            const lastData = block.dataAddress + block.dataSize - 1;

            if (index >= first && index <= last) {
                if (index >= firstData && index <= lastData) {
                    // in data part
                    return block.free
                        ? HeapCellType.NOT_ALLOCATED
                        : HeapCellType.ALLOCATED_DATA;
                } else {
                    // in block metadata
                    return block.free
                        ? HeapCellType.NOT_ALLOCATED_META
                        : HeapCellType.ALLOCATED_META;
                }
            }
        }

        return HeapCellType.UNKNOWN;
    }

    return (
        <div
            style={{
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
            }}
        >
            {[...Array(props.heap.size)].map((e, index) => (
                <HeapCellVisualisation
                    heapToBeHighlighted={props.heapToBeHighlighted}
                    index={index}
                    key={index}
                    type={getCellType(index)}
                    value={props.heap.values[index]}
                />
            ))}
        </div>
    );
}
