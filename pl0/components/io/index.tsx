import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderWrapperSemi } from '../general/HeaderWrapperSemi';
import { Wrapper } from '../general/Wrapper';
import { Input } from './Input';
import { Output } from './Output';

type IOProps = {
    inputTxt: string;
    setInputTXT: (newValue: string) => void;

    outputTxt: string;
};

export function IO(props: IOProps) {
    const { t } = useTranslation();
    return (
        <Wrapper>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    flexShrink: 1,
                    maxHeight: '100%',
                }}
            >
                <HeaderWrapperSemi header={t('ui:headerInput')}>
                    <Input inputTxt={props.inputTxt} setInputTXT={props.setInputTXT} />
                </HeaderWrapperSemi>
                <HeaderWrapperSemi header={t('ui:headerOutput')} style={{ flexGrow: 1 }}>
                    <Output outputTxt={props.outputTxt} />
                </HeaderWrapperSemi>
            </div>
        </Wrapper>
    );
}
