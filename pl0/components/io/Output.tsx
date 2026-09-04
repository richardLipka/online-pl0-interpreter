import React from 'react';

type OutputProps = {
    outputTxt: string;
};

export function Output(props: OutputProps) {
    return (
        <textarea
            style={{ width: '100%', flexGrow: 1 }}
            value={props.outputTxt}
            readOnly={true}
            id={'output-textarea'}
        />
    );
}
