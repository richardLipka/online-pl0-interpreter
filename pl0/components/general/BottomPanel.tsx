import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExecutionStatistics } from '../../core/model';
import { HeaderWrapper } from './HeaderWrapper';
import { WarningsView } from '../io/Warnings';
import { StatisticsView } from '../statistics/StatisticsView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExchangeAlt,
    faExpandAlt,
    faCompressAlt,
    faColumns,
} from '@fortawesome/free-solid-svg-icons';

interface BottomPanelProps {
    warnings: string[];
    onClearWarnings: () => void;
    stats?: ExecutionStatistics | null;
    emulationState?: number;
    activeTab?: 'warnings' | 'statistics';
    onTabChange?: (tab: 'warnings' | 'statistics') => void;
    onSwapPanels?: () => void;
    onMaximizeStats?: () => void;
    onMaximizeMemory?: () => void;
    onSplitEvenly?: () => void;
}

export function BottomPanel(props: BottomPanelProps) {
    const {
        warnings,
        onClearWarnings,
        stats,
        emulationState,
    } = props;
    const { t } = useTranslation();
    const [internalTab, setInternalTab] = useState<'warnings' | 'statistics'>('warnings');
    const activeTab = props.activeTab ?? internalTab;

    const handleTabClick = (tab: 'warnings' | 'statistics') => {
        setInternalTab(tab);
        if (props.onTabChange) {
            props.onTabChange(tab);
        }
    };

    const warningCount = warnings.length;
    const hasStats = (stats?.totalInstructionsExecuted ?? 0) > 0;

    const header = (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                userSelect: 'none',
            }}
        >
            <button
                type="button"
                onClick={() => handleTabClick('warnings')}
                style={{
                    backgroundColor: activeTab === 'warnings' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontWeight: activeTab === 'warnings' ? 'bold' : 'normal',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '1em',
                    transition: 'background-color 0.15s ease',
                }}
            >
                <span>{t('ui:tabWarnings')}</span>
                {warningCount > 0 && (
                    <span
                        style={{
                            backgroundColor: '#e53e3e',
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '1px 6px',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                        }}
                    >
                        {warningCount}
                    </span>
                )}
            </button>

            <button
                type="button"
                onClick={() => handleTabClick('statistics')}
                style={{
                    backgroundColor: activeTab === 'statistics' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontWeight: activeTab === 'statistics' ? 'bold' : 'normal',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '1em',
                    transition: 'background-color 0.15s ease',
                }}
            >
                <span>{t('ui:tabStatistics')}</span>
                {hasStats && (
                    <span
                        style={{
                            backgroundColor: stats?.haltedOnError
                                ? '#e53e3e'
                                : stats?.completedNormally
                                ? '#38a169'
                                : '#3182ce',
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '1px 6px',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                        }}
                    >
                        {stats?.totalInstructionsExecuted}
                    </span>
                )}
            </button>

            {(props.onSwapPanels || props.onMaximizeStats || props.onMaximizeMemory || props.onSplitEvenly) && (
                <div
                    style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    {props.onSwapPanels && (
                        <button
                            type="button"
                            onClick={props.onSwapPanels}
                            title={t('ui:swapPanels')}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '4px',
                                color: '#ffffff',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '0.8em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FontAwesomeIcon icon={faExchangeAlt} />
                            <span>{t('ui:swapPanels')}</span>
                        </button>
                    )}
                    {props.onMaximizeStats && (
                        <button
                            type="button"
                            onClick={props.onMaximizeStats}
                            title={t('ui:maximizeStats')}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '4px',
                                color: '#ffffff',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '0.8em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FontAwesomeIcon icon={faExpandAlt} />
                            <span>{t('ui:maximizeStats')}</span>
                        </button>
                    )}
                    {props.onMaximizeMemory && (
                        <button
                            type="button"
                            onClick={props.onMaximizeMemory}
                            title={t('ui:maximizeMemory')}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '4px',
                                color: '#ffffff',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '0.8em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FontAwesomeIcon icon={faCompressAlt} />
                            <span>{t('ui:maximizeMemory')}</span>
                        </button>
                    )}
                    {props.onSplitEvenly && (
                        <button
                            type="button"
                            onClick={props.onSplitEvenly}
                            title={t('ui:splitEvenly')}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '4px',
                                color: '#ffffff',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '0.8em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FontAwesomeIcon icon={faColumns} />
                            <span>50/50</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <HeaderWrapper header={header}>
            {activeTab === 'warnings' ? (
                <WarningsView
                    warnings={warnings}
                    onClear={onClearWarnings}
                    hideWrapper
                />
            ) : (
                <StatisticsView
                    stats={stats}
                    emulationState={emulationState}
                    hideWrapper
                />
            )}
        </HeaderWrapper>
    );
}
