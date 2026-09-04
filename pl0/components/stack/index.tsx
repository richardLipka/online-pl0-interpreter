import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Stack as StackType } from '../../core/model';
import { TransformStackFrames } from '../../core/uitransformation';
import { HeaderWrapper } from '../general/HeaderWrapper';
import { StackFrameView } from './StackFrameView';
import { StackSplitter } from './StackSplitter';

type StackProps = {
    stack?: StackType;
    sp?: number;
    base?: number;

    stackToBeHighlighed: Map<number, string>;
};

export function Stack(props: StackProps) {
    const { t } = useTranslation();

    if (!props.stack || props.sp === undefined || props.sp === null) {
        return null;
    }

    return (
        <HeaderWrapper header={t('ui:headerStack')}>
            <>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-evenly',
                    }}
                >
                    <div>
                        {t('ui:stackSP')}: <b>{props.sp}</b>
                    </div>
                    <div>
                        {t('ui:stackBase')}: <b>{props.base}</b>
                    </div>
                </div>
                <hr />
                {TransformStackFrames(props.stack).map((sf, index) => (
                    <div key={index}>
                        <StackFrameView
                            firstIndex={sf.startIndex}
                            stackFrame={sf}
                            sp={props.sp ?? 0}
                            key={index}
                            stackToBeHighlighed={props.stackToBeHighlighed}
                        />
                        {sf.startIndex + sf.values.length == (props.sp ?? -1) + 1 && (
                            <StackSplitter />
                        )}
                    </div>
                ))}
            </>
        </HeaderWrapper>
    );
}
