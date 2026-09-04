import React from 'react';
import { ExplanationMessagePart } from '../../core/highlighting';

type InstructionExplanationProps = {
    explanationParts: ExplanationMessagePart[];
    isNext: boolean;
};

function ExplanationPart({
    part,
    isNext,
}: {
    part: ExplanationMessagePart;
    isNext: boolean;
}): JSX.Element | null {
    if (part.placeholder) {
        return (
            <span style={isNext ? { backgroundColor: part.color ?? 'white' } : {}}>
                {part.content.replace(
                    part.placeholder.placeholder,
                    part.placeholder.value.toString()
                )}
            </span>
        );
    }
    return <span>{part.content}</span>;
}
export function InstructionExplanation(props: InstructionExplanationProps) {
    if (!props.explanationParts || props.explanationParts.length === 0) {
        return <span></span>;
    }
    return (
        <div>
            {props.explanationParts?.map((part, index) => (
                <ExplanationPart part={part} key={index} isNext={props.isNext} />
            ))}
        </div>
    );
}
