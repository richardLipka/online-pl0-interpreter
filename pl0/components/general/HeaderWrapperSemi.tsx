import React from 'react';
import { primary } from '../../constants/Colors';

type WrapperProps = {
    children: React.ReactNode;
    header: string;
    style?: React.CSSProperties;
};

export function HeaderWrapperSemi(props: WrapperProps) {
    return (
        <div
            style={{
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                ...props.style,
            }}
        >
            <div className="panelNH">
                <div className="panelHeader" style={{ backgroundColor: primary }}>
                    {props.header}
                </div>
                {props.children}
            </div>
        </div>
    );
}
