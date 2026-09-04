import { danger, dark, primary, secondary } from '../constants/Colors';
import { Stack, StackFrame, StackItem } from './model';
export interface UIStackFrame {
    startIndex: number;
    isStackFrame: boolean;
    values: StackItem[];
    color: string;
}

function GetRealStackFrame(
    stackFrames: StackFrame[],
    valueIndex: number
): StackFrame | null {
    for (const sf of stackFrames) {
        if (sf.index <= valueIndex && sf.index + sf.size - 1 >= valueIndex) {
            return sf;
        }
    }
    return null;
}

const sfColors = [primary, secondary, danger, dark];
export function TransformStackFrames(stack: Stack) {
    const uiStackFrames: UIStackFrame[] = [];

    let lastRealSF: StackFrame | null = null;
    let first = true;
    let lastSFColor = -1;

    for (let i = 0; i < stack.stackItems.length; i++) {
        const si = stack.stackItems[i];

        const realsf = GetRealStackFrame(stack.stackFrames, i);

        // @ts-ignore
        if (first === true || realsf?.index !== lastRealSF?.index) {
            first = false;
            lastRealSF = realsf;

            uiStackFrames.push({
                isStackFrame: realsf != null,
                values: [],
                color: sfColors[++lastSFColor % sfColors.length],
                startIndex: i,
            });
        }

        uiStackFrames[uiStackFrames.length - 1].values.push(si);
    }

    return uiStackFrames;
}
