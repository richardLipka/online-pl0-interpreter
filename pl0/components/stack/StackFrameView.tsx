import React from 'react';
import { UIStackFrame } from '../../core/uitransformation';
import styles from '../../styles/stack.module.css';
import { StackFrameValue } from './StackFrameValue';

type StackFrameViewProps = {
    stackFrame: UIStackFrame;
    firstIndex: number;
    sp: number;

    stackToBeHighlighed: Map<number, string>;
};

export function StackFrameView(props: StackFrameViewProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
            }}
            className={
                props.stackFrame.isStackFrame ? styles.stackFrame : styles.stackFrameOut
            }
        >
            {props.stackFrame.values.map((value, key) => (
                <StackFrameValue
                    orderInStackFrame={key}
                    value={value}
                    stackFrame={props.stackFrame}
                    sp={props.sp}
                    rowIndex={props.firstIndex + key}
                    key={key}
                    stackToBeHighlighed={props.stackToBeHighlighed}
                />
            ))}
        </div>
    );
}
