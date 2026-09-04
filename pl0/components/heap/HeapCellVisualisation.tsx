import React from 'react';
import { HeapCellType } from '../../core/model';
import styles from '../../styles/heap.module.css';
import { useTranslation } from 'react-i18next';

type HeapCellVisualisationProps = {
    index: number;
    value: number;
    type: HeapCellType;
    heapToBeHighlighted: Map<number, string>;
};

export function HeapCellVisualisation(props: HeapCellVisualisationProps) {
    const { t, i18n } = useTranslation();

    const index = props.index;
    const highlightedColor: string | null = props.heapToBeHighlighted.has(index)
        ? props.heapToBeHighlighted.get(index) ?? null
        : null;

    function isAllocated() {
        return (
            props.type === HeapCellType.ALLOCATED_DATA ||
            props.type === HeapCellType.ALLOCATED_META
        );
    }

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
        }
    }
    function getCellTypeName() {
        switch (props.type) {
            case HeapCellType.NOT_ALLOCATED:
                return t('ui:notAllocated');
            case HeapCellType.NOT_ALLOCATED_META:
                return t('ui:notAllocatedMeta');
            case HeapCellType.ALLOCATED_META:
                return t('ui:allocatedMeta');
            case HeapCellType.ALLOCATED_DATA:
                return t('ui:allocated');
        }
    }

    function showValue() {
        return (
            props.type === HeapCellType.ALLOCATED_DATA ||
            props.type === HeapCellType.ALLOCATED_META ||
            props.type === HeapCellType.NOT_ALLOCATED_META
        );
    }

    return (
        <div
            key={index}
            className={`${styles.heapCell} ${getCellStyle()}`}
            style={
                highlightedColor
                    ? {
                          backgroundColor: highlightedColor,
                          color: 'black',
                      }
                    : {}
            }
            title={
                t('ui:heapCellIndex') +
                ': ' +
                index.toString() +
                '\n' +
                getCellTypeName() +
                (showValue() == true
                    ? '\n' + t('ui:heapCellValue') + ':' + props.value
                    : '')
            }
        >
            {showValue() && props.value}
        </div>
    );
}
