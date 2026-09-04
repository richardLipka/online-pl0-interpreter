import React from 'react';
import { Table } from 'react-bootstrap';
import { Instruction } from '../../core/model';
import { InstructionItemView } from './InstructionItemView';
import styles from '../../styles/instructions.module.css';
import { InstructionsHighligting } from '../../core/highlighting';
import { useTranslation } from 'react-i18next';

type InstructionsTableProps = {
    instructions: Instruction[];
    pc: number;
    instructionsToBeHighlighted: InstructionsHighligting | null;
};
export function InstructionsTable(props: InstructionsTableProps) {
    const { t } = useTranslation();
    return (
        <Table className={styles.instructionsTable}>
            <thead>
                <tr>
                    <th style={{ width: '35px' }}></th>
                    <th style={{ width: '50px' }}>
                        {t('ui:instructionsTableInstruction')}
                    </th>
                    <th style={{ width: '35px' }}>{t('ui:instructionsTableLevel')}</th>
                    <th style={{ width: '35px' }}>{t('ui:instructionsTablePar')}</th>
                    <th>{t('ui:instructionsTableExplanation')}</th>
                </tr>
            </thead>
            <tbody>
                {props.instructions?.map((i, index) => (
                    <InstructionItemView
                        key={index}
                        instruction={i}
                        hasBreakpoint={false}
                        hasError={false}
                        isNext={index == props.pc}
                        instructionsToBeHighlighted={props.instructionsToBeHighlighted}
                    />
                ))}
            </tbody>
        </Table>
    );
}
