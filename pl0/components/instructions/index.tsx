import React from 'react';
import { useTranslation } from 'react-i18next';
import { InstructionsHighligting } from '../../core/highlighting';
import { Instruction } from '../../core/model';
import { PreprocessingError } from '../../core/validator';
import { HeaderWrapper } from '../general/HeaderWrapper';
import { InstructionsLoader } from './InstructionsLoader';
import { InstructionsTable } from './InstructionsTable';

type InstructionProps = {
    instructions: Instruction[];
    validationOK: boolean;
    validationErrors: PreprocessingError[];
    pc: number | null;
    instructionsLoaded: (
        instructions: Instruction[],
        validationOK: boolean,
        validationErrors: PreprocessingError[]
    ) => void;

    instructionsToBeHighlighted: InstructionsHighligting | null;
    initialCode?: string;
    onCodeChange?: (code: string) => void;
    forceOpen?: boolean;
    onModalClose?: () => void;
    currentInput?: string;
};

export function Instructions(props: InstructionProps) {
    const { t } = useTranslation();
    return (
        <HeaderWrapper header={t('ui:headerInstructions')}>
            <InstructionsLoader
                instructionsLoaded={props.instructionsLoaded}
                pc={props.pc}
                initialCode={props.initialCode}
                onCodeChange={props.onCodeChange}
                forceOpen={props.forceOpen}
                onModalClose={props.onModalClose}
                currentInput={props.currentInput}
                hasInstructions={props.instructions && props.instructions.length > 0}
            />
            <InstructionsTable
                instructions={props.instructions}
                pc={props.pc ?? 0}
                instructionsToBeHighlighted={props.instructionsToBeHighlighted}
            />
        </HeaderWrapper>
    );
}
