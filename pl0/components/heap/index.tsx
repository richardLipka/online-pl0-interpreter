import React from 'react';
import { useTranslation } from 'react-i18next';
import { AllocatorType, Heap as HeapType } from '../../core/model';
import { HeaderWrapper } from '../general/HeaderWrapper';
import { HeapVisualisation } from './HeapVisualisation';
import styles from '../../styles/heap.module.css';

type HeapProps = {
    heap?: HeapType;
    heapToBeHighlighted: Map<number, string>;
    allocatorType?: AllocatorType;
    onAllocatorChange?: (type: AllocatorType) => void;
};

export function Heap(props: HeapProps) {
    const { t } = useTranslation();
    if (!props.heap) {
        return null;
    }

    const totalCells = props.heap.size;
    const blocks = props.heap.heapBlocks ?? [];
    const activeBlocks = blocks.filter((b) => !b.free).length;
    const freeBlocks = blocks.filter((b) => b.free).length;
    const allocatedCells = blocks
        .filter((b) => !b.free)
        .reduce((acc, b) => acc + b.blockSize, 0);
    const usagePercent =
        totalCells > 0 ? Math.round((allocatedCells / totalCells) * 100) : 0;

    const currentAllocator =
        props.allocatorType ??
        props.heap.allocatorType ??
        AllocatorType.SINGLE_LINKED;

    return (
        <HeaderWrapper header={t('ui:headerHeap')}>
            <div className={styles.heapWrapper}>
                <div className={styles.topControls}>
                    <div className={styles.allocatorGroup}>
                        <label htmlFor="heap-allocator-select">
                            {t('ui:allocatorType')}:
                        </label>
                        <select
                            id="heap-allocator-select"
                            className={styles.allocatorSelect}
                            value={currentAllocator}
                            onChange={(e) => {
                                if (props.onAllocatorChange) {
                                    props.onAllocatorChange(
                                        Number(e.target.value) as AllocatorType
                                    );
                                }
                            }}
                        >
                            <option value={AllocatorType.SINGLE_LINKED}>
                                {t('ui:allocatorSingle')}
                            </option>
                            <option value={AllocatorType.DOUBLY_LINKED}>
                                {t('ui:allocatorDoubly')}
                            </option>
                        </select>
                    </div>

                    <div className={styles.heapStats}>
                        <span className={styles.statBadge}>
                            {t('ui:heapStatusUsage')}: {allocatedCells}/{totalCells} (
                            {usagePercent}%)
                        </span>
                        <span className={styles.statBadge}>
                            {t('ui:heapActiveBlocks')}: {activeBlocks}
                        </span>
                        <span className={styles.statBadge}>
                            {t('ui:heapFreeBlocks')}: {freeBlocks}
                        </span>
                    </div>
                </div>

                <div className={styles.heapLegend}>
                    <div className={styles.legendItem}>
                        <span
                            className={styles.legendChip}
                            style={{ backgroundColor: '#6b0504' }}
                        />
                        <span>{t('ui:legendAllocatedData')}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span
                            className={styles.legendChip}
                            style={{
                                backgroundColor: '#991b1b',
                                border: '1px dashed rgba(255, 255, 255, 0.6)',
                            }}
                        />
                        <span>{t('ui:legendAllocatedMeta')}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span
                            className={styles.legendChip}
                            style={{ backgroundColor: '#4d8b31' }}
                        />
                        <span>{t('ui:legendFreeData')}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span
                            className={styles.legendChip}
                            style={{
                                backgroundColor: '#2e571c',
                                border: '1px dashed rgba(255, 255, 255, 0.6)',
                            }}
                        />
                        <span>{t('ui:legendFreeMeta')}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span
                            className={styles.legendChip}
                            style={{ backgroundColor: '#f59e0b' }}
                        />
                        <span>{t('ui:legendHighlighted')}</span>
                    </div>
                </div>

                <HeapVisualisation
                    heap={props.heap}
                    heapToBeHighlighted={props.heapToBeHighlighted}
                />
            </div>
        </HeaderWrapper>
    );
}
