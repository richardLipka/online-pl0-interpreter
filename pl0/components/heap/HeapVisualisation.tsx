import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heap, HeapBlock, HeapCellType } from '../../core/model';
import { HeapCellVisualisation } from './HeapCellVisualisation';
import styles from '../../styles/heap.module.css';

type HeapVisualisationProps = {
    heap: Heap;
    heapToBeHighlighted: Map<number, string>;
};

export function HeapVisualisation(props: HeapVisualisationProps) {
    const { t } = useTranslation();

    const blocks: HeapBlock[] = props.heap.heapBlocks ?? [];

    let coveredUpTo = 0;

    return (
        <div className={styles.blocksContainer}>
            {blocks.map((block, blockIdx) => {
                const blockStart = block.blockAddress;
                const blockEnd = block.blockAddress + block.blockSize - 1;
                coveredUpTo = Math.max(coveredUpTo, blockEnd + 1);

                const cellIndices: number[] = [];
                for (let i = blockStart; i <= blockEnd && i < props.heap.size; i++) {
                    cellIndices.push(i);
                }

                return (
                    <div
                        key={blockIdx}
                        className={`${styles.blockCard} ${
                            block.free ? styles.blockCardFree : styles.blockCardAllocated
                        }`}
                    >
                        <div className={styles.blockHeader}>
                            <span
                                className={`${styles.blockBadge} ${
                                    block.free
                                        ? styles.blockBadgeFree
                                        : styles.blockBadgeAllocated
                                }`}
                            >
                                {block.free
                                    ? t('ui:blockHeaderFree')
                                    : t('ui:blockHeaderAllocated')}
                            </span>
                            <span
                                className={
                                    block.free
                                        ? styles.blockHeaderFree
                                        : styles.blockHeaderAllocated
                                }
                            >
                                @{blockStart}..@{blockEnd} (
                                {t('ui:blockDataCells').replace(
                                    '%1',
                                    block.dataSize.toString()
                                )}
                                )
                            </span>
                        </div>
                        <div className={styles.cellsGrid}>
                            {cellIndices.map((index) => {
                                const isMeta = block.allocatorInfoIndices.includes(index);
                                let type: HeapCellType;
                                let metaRole: 'size' | 'status' | 'prev' | undefined;

                                if (isMeta) {
                                    type = block.free
                                        ? HeapCellType.NOT_ALLOCATED_META
                                        : HeapCellType.ALLOCATED_META;
                                    if (index === block.blockAddress) {
                                        metaRole = 'size';
                                    } else if (index === block.blockAddress + 1) {
                                        metaRole = 'status';
                                    } else if (index === block.blockAddress + 2) {
                                        metaRole = 'prev';
                                    }
                                } else {
                                    type = block.free
                                        ? HeapCellType.NOT_ALLOCATED
                                        : HeapCellType.ALLOCATED_DATA;
                                }

                                return (
                                    <HeapCellVisualisation
                                        key={index}
                                        index={index}
                                        value={props.heap.values[index]}
                                        type={type}
                                        heapToBeHighlighted={props.heapToBeHighlighted}
                                        metaRole={metaRole}
                                        blockAddress={block.blockAddress}
                                        blockFree={block.free}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {coveredUpTo < props.heap.size && (
                <div className={`${styles.blockCard} ${styles.blockCardFree}`}>
                    <div className={styles.blockHeader}>
                        <span className={`${styles.blockBadge} ${styles.blockBadgeFree}`}>
                            {t('ui:notAllocated')}
                        </span>
                        <span className={styles.blockHeaderFree}>
                            @{coveredUpTo}..@{props.heap.size - 1}
                        </span>
                    </div>
                    <div className={styles.cellsGrid}>
                        {Array.from(
                            { length: props.heap.size - coveredUpTo },
                            (_, i) => coveredUpTo + i
                        ).map((index) => (
                            <HeapCellVisualisation
                                key={index}
                                index={index}
                                value={props.heap.values[index]}
                                type={HeapCellType.NOT_ALLOCATED}
                                heapToBeHighlighted={props.heapToBeHighlighted}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
