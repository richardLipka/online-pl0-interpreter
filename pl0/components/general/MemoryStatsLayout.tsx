import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGripLines,
    faExchangeAlt,
    faExpandAlt,
    faCompressAlt,
    faColumns,
} from '@fortawesome/free-solid-svg-icons';

interface MemoryStatsLayoutProps {
    heapComponent: React.ReactNode;
    ioComponent: React.ReactNode;
    renderBottomPanel: (panelProps: {
        activeTab: 'warnings' | 'statistics';
        onTabChange: (tab: 'warnings' | 'statistics') => void;
        onSwapPanels: () => void;
        onMaximizeStats: () => void;
        onMaximizeMemory: () => void;
        onSplitEvenly: () => void;
    }) => React.ReactNode;
}

export function MemoryStatsLayout({
    heapComponent,
    ioComponent,
    renderBottomPanel,
}: MemoryStatsLayoutProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);

    // splitRatio: percentage of top panel height (15% to 85%)
    const [splitRatio, setSplitRatio] = useState<number>(55);
    const [isSwapped, setIsSwapped] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'warnings' | 'statistics'>('warnings');

    // Drag-to-resize divider implementation
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const percentage = (offsetY / rect.height) * 100;
            // Clamp between 15% and 85% to keep both panels readable
            const clamped = Math.min(Math.max(percentage, 15), 85);
            setSplitRatio(clamped);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleSwapPanels = () => {
        setIsSwapped((prev) => !prev);
    };

    const handleMaximizeStats = () => {
        setActiveTab('statistics');
        // If swapped, stats is on top (splitRatio), so set to 80. If not swapped, stats is at bottom, so top is 20.
        setSplitRatio(isSwapped ? 80 : 20);
    };

    const handleMaximizeMemory = () => {
        // Memory gets 80%
        setSplitRatio(isSwapped ? 20 : 80);
    };

    const handleSplitEvenly = () => {
        setSplitRatio(50);
    };

    const memoryNode = (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <div style={{ flex: 2, minWidth: 0, height: '100%', overflow: 'auto' }}>
                {heapComponent}
            </div>
            <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'auto' }}>
                {ioComponent}
            </div>
        </div>
    );

    const statsNode = (
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
            {renderBottomPanel({
                activeTab,
                onTabChange: setActiveTab,
                onSwapPanels: handleSwapPanels,
                onMaximizeStats: handleMaximizeStats,
                onMaximizeMemory: handleMaximizeMemory,
                onSplitEvenly: handleSplitEvenly,
            })}
        </div>
    );

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Upper Panel */}
            <div
                style={{
                    height: `${splitRatio}%`,
                    minHeight: '60px',
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                }}
            >
                {isSwapped ? statsNode : memoryNode}
            </div>

            {/* Draggable Divider Bar */}
            <div
                onMouseDown={handleMouseDown}
                onDoubleClick={handleSplitEvenly}
                title={t('ui:dragToResize')}
                style={{
                    height: '14px',
                    width: '100%',
                    cursor: 'row-resize',
                    backgroundColor: isDragging ? '#489fb5' : '#2b354f',
                    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    position: 'relative',
                    transition: isDragging ? 'none' : 'background-color 0.15s ease',
                    zIndex: 10,
                    flexShrink: 0,
                }}
            >
                {/* Grip Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#cbd5e0',
                        fontSize: '11px',
                        opacity: 0.85,
                    }}
                >
                    <FontAwesomeIcon icon={faGripLines} />
                </div>

                {/* Quick actions on the splitter */}
                <div
                    style={{
                        position: 'absolute',
                        right: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleSwapPanels}
                        title={t('ui:swapPanels')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '3px',
                            color: '#ffffff',
                            padding: '1px 6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <FontAwesomeIcon icon={faExchangeAlt} />
                    </button>
                    <button
                        type="button"
                        onClick={handleMaximizeStats}
                        title={t('ui:maximizeStats')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '3px',
                            color: '#ffffff',
                            padding: '1px 6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <FontAwesomeIcon icon={faExpandAlt} />
                    </button>
                    <button
                        type="button"
                        onClick={handleMaximizeMemory}
                        title={t('ui:maximizeMemory')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '3px',
                            color: '#ffffff',
                            padding: '1px 6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <FontAwesomeIcon icon={faCompressAlt} />
                    </button>
                    <button
                        type="button"
                        onClick={handleSplitEvenly}
                        title={t('ui:splitEvenly')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '3px',
                            color: '#ffffff',
                            padding: '1px 6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <FontAwesomeIcon icon={faColumns} />
                    </button>
                </div>
            </div>

            {/* Lower Panel */}
            <div
                style={{
                    height: `calc(${100 - splitRatio}% - 14px)`,
                    minHeight: '60px',
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                }}
            >
                {isSwapped ? memoryNode : statsNode}
            </div>
        </div>
    );
}
