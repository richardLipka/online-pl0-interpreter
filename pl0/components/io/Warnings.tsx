import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderWrapper } from '../general/HeaderWrapper';

type WarningsViewProps = {
    warnings: string[];
    onClear?: () => void;
    hideWrapper?: boolean;
};

export function WarningsView(props: WarningsViewProps) {
    const { t } = useTranslation();
    const listEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (props.warnings && props.warnings.length > 0) {
            listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [props.warnings]);

    const count = props.warnings?.length ?? 0;
    const headerTitle = `${t('ui:headerWarnings')}${count > 0 ? ` (${count})` : ''}`;

    const isError = (text: string) => {
        const lower = text.toLowerCase();
        return (
            lower.includes('error') ||
            lower.includes('chyba') ||
            lower.includes('division by zero') ||
            lower.includes('dělení nulou') ||
            lower.includes('jump to negative') ||
            lower.includes('skok na zápornou') ||
            lower.includes('empty part of memory') ||
            lower.includes('prázdné části paměti') ||
            lower.includes('not enough operands') ||
            lower.includes('nedostatek operandů')
        );
    };

    const content = (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
            }}
        >
                <div
                    style={{
                        overflowY: 'auto',
                        flexGrow: 1,
                        paddingRight: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    {(!props.warnings || props.warnings.length === 0) ? (
                        <div
                            style={{
                                color: '#8c8c8c',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                padding: '16px 8px',
                                fontSize: '0.9em',
                            }}
                        >
                            {t('ui:noWarnings')}
                        </div>
                    ) : (
                        props.warnings.map((w, index) => {
                            const error = isError(w);
                            return (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        backgroundColor: error ? '#fff5f5' : '#fffbe6',
                                        borderLeft: `4px solid ${error ? '#e53e3e' : '#d69e2e'}`,
                                        borderTop: '1px solid #eee',
                                        borderRight: '1px solid #eee',
                                        borderBottom: '1px solid #eee',
                                        borderRadius: '4px',
                                        padding: '6px 10px',
                                        fontSize: '0.85em',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 'bold',
                                            color: error ? '#c53030' : '#b7791f',
                                            minWidth: '22px',
                                            userSelect: 'none',
                                        }}
                                    >
                                        #{index + 1}
                                    </span>
                                    <code
                                        style={{
                                            color: error ? '#9b2c2c' : '#744210',
                                            backgroundColor: 'transparent',
                                            padding: 0,
                                            wordBreak: 'break-word',
                                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                        }}
                                    >
                                        {w}
                                    </code>
                                </div>
                            );
                        })
                    )}
                    <div ref={listEndRef} />
                </div>
                {props.onClear && count > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            paddingTop: '8px',
                            borderTop: '1px solid #e2e8f0',
                            marginTop: '8px',
                        }}
                    >
                        <button
                            onClick={props.onClear}
                            style={{
                                fontSize: '0.75em',
                                padding: '3px 8px',
                                backgroundColor: '#edf2f7',
                                color: '#4a5568',
                                border: '1px solid #cbd5e0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            {t('ui:clearWarnings')}
                        </button>
                    </div>
                )}
            </div>
    );

    if (props.hideWrapper) {
        return content;
    }

    return (
        <HeaderWrapper header={headerTitle}>
            {content}
        </HeaderWrapper>
    );
}
