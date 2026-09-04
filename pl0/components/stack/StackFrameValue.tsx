import React from 'react';
import { useTranslation } from 'react-i18next';
import { StackItem } from '../../core/model';
import { UIStackFrame } from '../../core/uitransformation';
import styles from '../../styles/stack.module.css';

type StackFrameValueProps = {
    orderInStackFrame: number;
    rowIndex: number;
    stackFrame: UIStackFrame;
    sp: number;
    value: StackItem;

    stackToBeHighlighed: Map<number, string>;
};
function addAlpha(color: string, opacity: number): string {
    // coerce values so it is between 0 and 1.
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    return color + _opacity.toString(16).padStart(2, '0').toUpperCase();
}

export function StackFrameValue(props: StackFrameValueProps) {
    const { t } = useTranslation();
    const isSF = props.stackFrame.isStackFrame;
    const isSFHeader = isSF && props.orderInStackFrame < 3;

    const isHighlighted = props.stackToBeHighlighed.has(props.rowIndex);
    const hightlighColor =
        (isHighlighted
            ? props.stackToBeHighlighed.get(props.rowIndex)
            : props.stackFrame.color) ?? props.stackFrame.color;

    const valueBackground: string = isHighlighted
        ? addAlpha(hightlighColor, 0.6)
        : isSFHeader
        ? addAlpha(props.stackFrame.color, 0.8)
        : isSF
        ? addAlpha(props.stackFrame.color, 0.5)
        : 'gray';

    function getTextColor(bg: string) {
        if (isHighlighted) {
            return 'black';
        }
        if (bg.length > 7) {
            const alpha = parseInt(bg.substring(bg.length - 2), 16);
            if (alpha < 150) {
                return 'black';
            }
        }

        return 'white';
    }
    return (
        <div className={styles.stackFrameItem}>
            <div
                className={`${styles.stackItem} ${styles.stackRowIndex} ${
                    props.stackFrame.isStackFrame
                        ? styles.stackRowIndexSF
                        : styles.stackRowIndexOutSF
                }`}
                style={{
                    backgroundColor: isHighlighted
                        ? hightlighColor
                        : isSF
                        ? props.stackFrame.color
                        : 'red',
                    color: isHighlighted ? 'black' : 'white',
                }}
            >
                {props.rowIndex}
            </div>
            <div
                className={`${styles.stackItem} ${styles.stackValue}`}
                style={{
                    backgroundColor: valueBackground,
                    color: getTextColor(valueBackground),
                }}
            >
                {props.value.value}
                {isSFHeader && (
                    <div
                        title={
                            props.orderInStackFrame === 0
                                ? t('ui:stackSB')
                                : props.orderInStackFrame === 1
                                ? t('ui:stackDB')
                                : t('ui:stackPC')
                        }
                    >
                        {props.orderInStackFrame === 0
                            ? 'SB'
                            : props.orderInStackFrame === 1
                            ? 'DB'
                            : 'PC'}
                    </div>
                )}
            </div>
        </div>
    );
}
