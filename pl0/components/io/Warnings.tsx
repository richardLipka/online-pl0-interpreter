import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderWrapper } from '../general/HeaderWrapper';

type WarningsViewProps = {
    warnings: string[];
};

export function WarningsView(props: WarningsViewProps) {
    const { t, i18n } = useTranslation();
    return (
        <HeaderWrapper header={t('ui:headerWarnings')}>
            <>
                {props.warnings?.map((w, index) => (
                    <code key={index} style={{ display: 'block' }}>
                        {index + 1}: {w}
                    </code>
                ))}
            </>
        </HeaderWrapper>
    );
}
