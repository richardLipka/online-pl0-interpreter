import React from 'react';
import { primary } from '../../constants/Colors';

type WrapperProps = {
    children: React.ReactNode;
    header: React.ReactNode;
};

export function HeaderWrapper(props: WrapperProps) {
    return (
        <div
            style={{
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'auto',
                maxHeight: '100%',
            }}
        >
            <div className="panel">
                <div className="panelHeader" style={{ backgroundColor: primary }}>
                    {props.header}
                </div>
                {props.children}
            </div>
        </div>
    );
}
