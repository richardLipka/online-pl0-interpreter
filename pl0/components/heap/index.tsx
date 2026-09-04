import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heap as HeapType } from '../../core/model';
import { HeaderWrapper } from '../general/HeaderWrapper';
import { HeapVisualisation } from './HeapVisualisation';

type HeapProps = {
    heap?: HeapType;
    heapToBeHighlighted: Map<number, string>;
};

export function Heap(props: HeapProps) {
    const { t } = useTranslation();
    if (!props.heap) {
        return null;
    }

    return (
        <HeaderWrapper header={t('ui:headerHeap')}>
            <HeapVisualisation
                heap={props.heap}
                heapToBeHighlighted={props.heapToBeHighlighted}
            />
        </HeaderWrapper>
    );
}
