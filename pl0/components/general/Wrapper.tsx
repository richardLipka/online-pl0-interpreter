import React from 'react';

type WrapperProps = {
    children: React.ReactNode;
};

export function Wrapper(props: WrapperProps) {
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
            {props.children}
        </div>
    );
}
