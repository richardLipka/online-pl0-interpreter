import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExecutionStatistics } from '../../core/model';
import { HeaderWrapper } from './HeaderWrapper';
import { WarningsView } from '../io/Warnings';
import { StatisticsView } from '../statistics/StatisticsView';

interface BottomPanelProps {
    warnings: string[];
    onClearWarnings: () => void;
    stats?: ExecutionStatistics | null;
    emulationState?: number;
}

export function BottomPanel({
    warnings,
    onClearWarnings,
    stats,
    emulationState,
}: BottomPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'warnings' | 'statistics'>('warnings');

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
                onClick={() => setActiveTab('warnings')}
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
                onClick={() => setActiveTab('statistics')}
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
