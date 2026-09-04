import React from 'react';
import { HeapCellType } from '../../core/model';
import styles from '../../styles/heap.module.css';
import { useTranslation } from 'react-i18next';

type HeapCellVisualisationProps = {
    index: number;
    value: number;
    type: HeapCellType;
    heapToBeHighlighted: Map<number, string>;
    metaRole?: 'size' | 'status' | 'prev';
    blockAddress?: number;
    blockFree?: boolean;
};

export function HeapCellVisualisation(props: HeapCellVisualisationProps) {
    const { t } = useTranslation();

    const index = props.index;
    const highlightedColor: string | null = props.heapToBeHighlighted.has(index)
        ? props.heapToBeHighlighted.get(index) ?? null
        : null;

    function getCellStyle() {
        switch (props.type) {
            case HeapCellType.NOT_ALLOCATED:
                return styles.heapCellEmpty;
            case HeapCellType.NOT_ALLOCATED_META:
                return styles.heapCellEmptyMeta;
            case HeapCellType.ALLOCATED_META:
                return styles.heapCellFullMeta;
            case HeapCellType.ALLOCATED_DATA:
                return styles.heapCellFull;
            default:
                return styles.heapCellEmpty;
        }
    }

    function getCellTypeName(): string {
        switch (props.type) {
            case HeapCellType.NOT_ALLOCATED:
                return t('ui:notAllocated');
            case HeapCellType.NOT_ALLOCATED_META:
                return t('ui:notAllocatedMeta');
            case HeapCellType.ALLOCATED_META:
                return t('ui:allocatedMeta');
            case HeapCellType.ALLOCATED_DATA:
                return t('ui:allocated');
            default:
                return t('ui:notAllocated');
        }
    }

    function getMetaRoleLabel(): string | null {
        if (props.metaRole === 'size') {
            return t('ui:metaSize');
        } else if (props.metaRole === 'status') {
            return t('ui:metaStatus');
        } else if (props.metaRole === 'prev') {
            return t('ui:metaPrev');
        }
        return null;
    }

    function showValue(): boolean {
        return (
            props.type === HeapCellType.ALLOCATED_DATA ||
            props.type === HeapCellType.ALLOCATED_META ||
            props.type === HeapCellType.NOT_ALLOCATED_META
        );
    }

    const metaLabel = getMetaRoleLabel();
    const cellTypeName = getCellTypeName();

    return (
        <div
            className={`${styles.heapCell} ${getCellStyle()} ${
                highlightedColor ? styles.heapCellHighlighted : ''
            }`}
            style={
                highlightedColor
                    ? {
                          backgroundColor: highlightedColor,
                          color: '#000000',
                      }
                    : {}
            }
            title={`${t('ui:heapCellIndex')}: ${index}\n${cellTypeName}${
                metaLabel ? ` (${metaLabel})` : ''
            }${showValue() ? `\n${t('ui:heapCellValue')}: ${props.value}` : ''}`}
        >
            <span className={styles.cellAddressBadge}>#{index}</span>
            <span className={styles.cellValue}>{showValue() ? props.value : ''}</span>

            <div className={styles.cellTooltip}>
                <div className={styles.tooltipRow}>
                    <span className={styles.tooltipLabel}>{t('ui:heapCellAddress')}:</span>
                    <span className={styles.tooltipVal}>#{index}</span>
                </div>
                <div className={styles.tooltipRow}>
                    <span className={styles.tooltipLabel}>{t('ui:heapCellType')}:</span>
                    <span>{cellTypeName}</span>
                </div>
                {metaLabel && (
                    <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>{t('ui:heapCellRole')}:</span>
                        <span style={{ color: '#fbbf24' }}>{metaLabel}</span>
                    </div>
                )}
                {props.blockAddress !== undefined && (
                    <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>{t('ui:heapCellBlock')}:</span>
                        <span className={styles.tooltipVal}>#{props.blockAddress}</span>
                    </div>
                )}
                {showValue() && (
                    <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>{t('ui:heapCellValue')}:</span>
                        <span className={styles.tooltipVal}>{props.value}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
