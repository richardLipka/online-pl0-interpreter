import React from 'react';

type InputProps = {
    inputTxt: string;
    setInputTXT: (newValue: string) => void;
};

export function Input(props: InputProps) {
    function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        props.setInputTXT(event.currentTarget.value);
    }

    return (
        <textarea
            style={{ width: '100%' }}
            value={props.inputTxt}
            onChange={handleChange}
            id={'input-textarea'}
        />
    );
}
