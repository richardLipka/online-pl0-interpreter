import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExecutionStatistics } from '../../core/model';
import { HeaderWrapper } from '../general/HeaderWrapper';

interface StatisticsViewProps {
    stats?: ExecutionStatistics | null;
    emulationState?: number;
    hideWrapper?: boolean;
}

export function StatisticsView({ stats, hideWrapper }: StatisticsViewProps) {
    const { t } = useTranslation();

    if (!stats || stats.totalInstructionsExecuted === 0) {
        const noDataContent = (
            <div
                style={{
                    color: '#8c8c8c',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '32px 16px',
                    fontSize: '0.9em',
                }}
            >
                {t('ui:statsNoData')}
            </div>
        );

        if (hideWrapper) {
            return noDataContent;
        }

        return (
            <HeaderWrapper header={t('ui:headerStatistics')}>
                {noDataContent}
            </HeaderWrapper>
        );
    }

    const total = stats.totalInstructionsExecuted;

    // Status badge
    let statusText = t('ui:statsRunning');
    let statusBg = '#ebf8ff';
    let statusColor = '#2b6cb0';
    let statusBorder = '#bee3f8';

    if (stats.haltedOnError) {
        statusText = t('ui:statsHaltedOnError');
        statusBg = '#fff5f5';
        statusColor = '#c53030';
        statusBorder = '#feb2b2';
    } else if (stats.completedNormally) {
        statusText = t('ui:statsCompletedNormally');
        statusBg = '#f0fff4';
        statusColor = '#276749';
        statusBorder = '#9ae6b4';
    }

    const instructionEntries = Object.entries(stats.instructionCounts).sort(
        (a, b) => b[1] - a[1]
    );

    const getCategoryName = (mnemonic: string): string => {
        switch (mnemonic) {
            case 'OPR':
            case 'OPF':
            case 'ITR':
            case 'RTI':
                return t('ui:statsCategoryArithmetic');
            case 'LIT':
            case 'LOD':
            case 'STO':
            case 'INT':
            case 'PLD':
            case 'PST':
                return t('ui:statsCategoryMemory');
            case 'JMP':
            case 'JMC':
                return t('ui:statsCategoryControl');
            case 'CAL':
            case 'RET':
                return t('ui:statsCategoryProcedures');
            case 'NEW':
            case 'DEL':
            case 'LDA':
            case 'STA':
                return t('ui:statsCategoryHeap');
            case 'REA':
            case 'WRI':
                return t('ui:statsCategoryIO');
            default:
                return 'Other';
        }
    };

    const content = (
        <div
                style={{
                    overflowY: 'auto',
                    height: '100%',
                    paddingRight: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    fontSize: '0.85em',
                }}
            >
                {/* Status Bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        backgroundColor: statusBg,
                        border: `1px solid ${statusBorder}`,
                        borderRadius: '6px',
                    }}
                >
                    <span style={{ fontWeight: 600, color: '#4a5568' }}>
                        {t('ui:statsStatus')}:
                    </span>
                    <span
                        style={{
                            fontWeight: 'bold',
                            color: statusColor,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                        }}
                    >
                        {statusText}
                    </span>
                </div>

                {/* KPI Metrics Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '8px',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#f7fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ color: '#718096', fontSize: '0.8em' }}>
                            {t('ui:statsTotalSteps')}
                        </span>
                        <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2d3748' }}>
                            {stats.totalInstructionsExecuted}
                        </span>
                    </div>

                    <div
                        style={{
                            backgroundColor: '#f7fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ color: '#718096', fontSize: '0.8em' }}>
                            {t('ui:statsPeakTotalMemory')}
                        </span>
                        <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2d3748' }}>
                            {stats.peakTotalMemoryOccupied}{' '}
                            <span style={{ fontSize: '0.7em', fontWeight: 'normal', color: '#718096' }}>cells</span>
                        </span>
                    </div>

                    <div
                        style={{
                            backgroundColor: '#f7fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ color: '#718096', fontSize: '0.8em' }}>
                            {t('ui:statsPeakCallDepth')}
                        </span>
                        <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2d3748' }}>
                            {stats.peakCallStackDepth}{' '}
                            <span style={{ fontSize: '0.7em', fontWeight: 'normal', color: '#718096' }}>frames</span>
                        </span>
                    </div>

                    <div
                        style={{
                            backgroundColor: '#f7fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ color: '#718096', fontSize: '0.8em' }}>
                            {t('ui:statsBranchTakenRatio')}
                        </span>
                        <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2d3748' }}>
                            {stats.conditionalJumpsExecuted > 0 ? `${stats.branchTakenRatio}%` : 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Details Section: Memory Footprint & Control Flow */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '10px',
                    }}
                >
                    {/* Memory Footprint Panel */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '10px',
                        }}
                    >
                        <h4
                            style={{
                                margin: '0 0 8px 0',
                                fontSize: '0.95em',
                                color: '#2d3748',
                                borderBottom: '1px solid #edf2f7',
                                paddingBottom: '4px',
                            }}
                        >
                            {t('ui:statsMemory')}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsCurrentStack')}:</span>
                                <strong>{stats.currentStackSize}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsPeakStack')}:</span>
                                <strong>{stats.peakStackSize}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsCurrentHeap')}:</span>
                                <strong>{stats.currentHeapAllocatedCells}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsPeakHeap')}:</span>
                                <strong>{stats.peakHeapAllocatedCells}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsPeakHeapBlocks')}:</span>
                                <strong>{stats.peakHeapBlocks}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsTotalHeapAllocations')}:</span>
                                <strong>{stats.totalHeapAllocations}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsTotalHeapDeallocations')}:</span>
                                <strong>{stats.totalHeapDeallocations}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Branching & Procedures Panel */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '10px',
                        }}
                    >
                        <h4
                            style={{
                                margin: '0 0 8px 0',
                                fontSize: '0.95em',
                                color: '#2d3748',
                                borderBottom: '1px solid #edf2f7',
                                paddingBottom: '4px',
                            }}
                        >
                            {t('ui:statsBranches')} & {t('ui:statsProcedures')}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsTotalBranches')}:</span>
                                <strong>{stats.conditionalJumpsExecuted}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsBranchesTaken')}:</span>
                                <strong>{stats.conditionalJumpsTaken}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsBranchesNotTaken')}:</span>
                                <strong>{stats.conditionalJumpsNotTaken}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsUnconditionalJumps')}:</span>
                                <strong>{stats.jumpsExecuted}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsProcedureCalls')}:</span>
                                <strong>{stats.procedureCallsCount}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsProcedureReturns')}:</span>
                                <strong>{stats.procedureReturnsCount}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4a5568' }}>{t('ui:statsWarningsCount')}:</span>
                                <strong style={{ color: stats.warningsCount > 0 ? '#d69e2e' : '#4a5568' }}>
                                    {stats.warningsCount}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories Summary Chips */}
                <div>
                    <h4
                        style={{
                            margin: '0 0 6px 0',
                            fontSize: '0.95em',
                            color: '#2d3748',
                        }}
                    >
                        {t('ui:statsOverview')}
                    </h4>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                        }}
                    >
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryArithmetic')}:{' '}
                            <strong>{stats.categoryCounts.arithmeticLogic}</strong> (
                            {Math.round((stats.categoryCounts.arithmeticLogic / total) * 100)}%)
                        </span>
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryMemory')}:{' '}
                            <strong>{stats.categoryCounts.memoryStack}</strong> (
                            {Math.round((stats.categoryCounts.memoryStack / total) * 100)}%)
                        </span>
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryControl')}:{' '}
                            <strong>{stats.categoryCounts.controlFlow}</strong> (
                            {Math.round((stats.categoryCounts.controlFlow / total) * 100)}%)
                        </span>
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryProcedures')}:{' '}
                            <strong>{stats.categoryCounts.procedureCalls}</strong> (
                            {Math.round((stats.categoryCounts.procedureCalls / total) * 100)}%)
                        </span>
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryHeap')}:{' '}
                            <strong>{stats.categoryCounts.heapOperations}</strong> (
                            {Math.round((stats.categoryCounts.heapOperations / total) * 100)}%)
                        </span>
                        <span
                            style={{
                                backgroundColor: '#edf2f7',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                            }}
                        >
                            {t('ui:statsCategoryIO')}:{' '}
                            <strong>{stats.categoryCounts.ioOperations}</strong> (
                            {Math.round((stats.categoryCounts.ioOperations / total) * 100)}%)
                        </span>
                    </div>
                </div>

                {/* Instruction Breakdown Table */}
                <div>
                    <h4
                        style={{
                            margin: '0 0 6px 0',
                            fontSize: '0.95em',
                            color: '#2d3748',
                        }}
                    >
                        {t('ui:statsInstructions')}
                    </h4>
                    <div
                        style={{
                            overflowX: 'auto',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.85em',
                            }}
                        >
                            <thead>
                                <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e0' }}>
                                        {t('ui:statsMnemonic')}
                                    </th>
                                    <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e0' }}>
                                        {t('ui:statsCategory')}
                                    </th>
                                    <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e0', textAlign: 'right' }}>
                                        {t('ui:statsCount')}
                                    </th>
                                    <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e0', minWidth: '120px' }}>
                                        {t('ui:statsPercentage')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {instructionEntries.map(([mnemonic, count]) => {
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <tr key={mnemonic} style={{ borderBottom: '1px solid #f0f4f8' }}>
                                            <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                {mnemonic}
                                            </td>
                                            <td style={{ padding: '5px 10px', color: '#4a5568' }}>
                                                {getCategoryName(mnemonic)}
                                            </td>
                                            <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>
                                                {count}
                                            </td>
                                            <td style={{ padding: '5px 10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div
                                                        style={{
                                                            flexGrow: 1,
                                                            height: '6px',
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '3px',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${pct}%`,
                                                                height: '100%',
                                                                backgroundColor: '#3182ce',
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: '0.9em', color: '#718096', minWidth: '32px' }}>
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    );

    if (hideWrapper) {
        return content;
    }

    return (
        <HeaderWrapper header={t('ui:headerStatistics')}>
            {content}
        </HeaderWrapper>
    );
}
