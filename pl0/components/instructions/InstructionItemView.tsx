import React from 'react';
import { InstructionsHighligting } from '../../core/highlighting';
import { Instruction, InstructionType } from '../../core/model';
import { InstructionExplanation } from './InstructionExplanation';

type InstructionItemViewProps = {
    instruction: Instruction;
    hasError: boolean;
    hasBreakpoint: boolean;
    isNext: boolean;

    instructionsToBeHighlighted: InstructionsHighligting | null;
};
export function InstructionItemView(props: InstructionItemViewProps) {
    // Any row can be highlighted - e.g. the target of a jump, call or return of the next instruction
    const highlightedRow =
        props.instructionsToBeHighlighted?.rowColors.get(props.instruction.index) ?? null;
    const highlightedPar = props.isNext
        ? props.instructionsToBeHighlighted?.parameter ?? null
        : null;
    const highlightedLevel = props.isNext
        ? props.instructionsToBeHighlighted?.level ?? null
        : null;

    return (
        <tr
            style={
                props.isNext
                    ? {
                          backgroundColor: 'white',
                          borderLeft: '3px solid green',
                      }
                    : {}
            }
        >
            <td
                style={
                    highlightedRow
                        ? {
                              backgroundColor: highlightedRow,
                              color: 'black',
                          }
                        : {}
                }
            >
                {props.instruction.index}
            </td>
            <td>{InstructionType[props.instruction.instruction]}</td>
            <td
                style={
                    highlightedLevel
                        ? {
                              backgroundColor: highlightedLevel,
                          }
                        : {}
                }
            >
                {props.instruction.level}
            </td>
            <td
                style={
                    highlightedPar
                        ? {
                              backgroundColor: highlightedPar,
                          }
                        : {}
                }
            >
                {props.instruction.parameter_str}
            </td>

            <td>
                <InstructionExplanation
                    explanationParts={props.instruction.explanationParts ?? []}
                    isNext={props.isNext}
                />
            </td>
        </tr>
    );
}
