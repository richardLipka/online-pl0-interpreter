import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/layout.module.css';
import React, { useEffect, useState } from 'react';
import {
    AllocatorType,
    DataModel,
    EmulationState,
    Instruction,
    InstructionStepParameters,
    InstructionStepResult,
} from '../core/model';
import { InitModel, NextStep } from '../core/operations';
import { Instructions } from '../components/instructions';
import { PreprocessingError } from '../core/validator';
import { Stack } from '../components/stack';
import { Heap } from '../components/heap';
import { Footer } from '../components/footer';
import { ExplainInstruction } from '../core/explainer';
import { IO } from '../components/io';
import { WarningsView } from '../components/io/Warnings';
import { ControlPanel } from '../components/controlpanel';
import {
    HeapToBeHighlighted,
    InstructionsToBeHighlighted,
    SplitExplanationMessageParts,
    StackToBeHighlighted,
} from '../core/highlighting';
import { useTranslation } from 'react-i18next';

interface HistorySnapshot {
    model: DataModel;
    inputTxt: string;
    output: string;
    warnings: string[];
}

const Home: NextPage = () => {
    const { t, i18n } = useTranslation();
    const [model, setModel] = useState<DataModel | null>(null);
    const [history, setHistory] = useState<HistorySnapshot[]>([]);

    const [version, setVersion] = useState<number>(0);
    const [explainerVersion, setExplainerVersion] = useState<number>(0);

    const [inputTxt, setInputTxt] = useState<string>('');
    const [output, setOutputTxt] = useState<string>('');
    const [warnings, setWarnings] = useState<string[]>([]);

    const [instructions, setInstructions] = useState<Instruction[]>([]);
    const [validationOK, setValidationOK] = useState<boolean>(false);
    const [validationErrors, setValidationErrors] = useState<PreprocessingError[]>([]);

    const [emulationState, setEmulationState] = useState<EmulationState>(
        EmulationState.NOT_STARTED
    );

    const isPlayingRef = React.useRef<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        if (!model || model.pc >= instructions.length) {
            return;
        }

        explainNextInstruction();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.pc, inputTxt, i18n.language]);

    const [allocatorType, setAllocatorType] = useState<AllocatorType>(
        AllocatorType.SINGLE_LINKED
    );

    function instructionsLoaded(
        instructions: Instruction[],
        validationOK: boolean,
        validationErrors: PreprocessingError[]
    ) {
        setValidationOK(validationOK);
        setValidationErrors(validationErrors);
        setInstructions(instructions);
        start();
    }

    function start(overrideAllocator?: AllocatorType) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        const currentAllocator = overrideAllocator ?? allocatorType;
        const m = InitModel(1024, 250, currentAllocator);
        setEmulationState(EmulationState.NOT_STARTED);
        resetInstructionsExplanations();
        setHistory([]);
        setModel({ ...m });
        setInputTxt('');
        setOutputTxt('');
        setWarnings([]);
        explainNextInstruction();
    }

    function handleAllocatorChange(newType: AllocatorType) {
        setAllocatorType(newType);
        start(newType);
    }

    function play() {
        if (isPlayingRef.current) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            return;
        }
        if (!ableToContinue()) return;
        isPlayingRef.current = true;
        setIsPlaying(true);

        let stepCount = 0;
        const maxSteps = 10000;

        function runStep() {
            if (!isPlayingRef.current) return;
            if (stepCount++ >= maxSteps) {
                alert(t('ui:maxStepsReached'));
                isPlayingRef.current = false;
                setIsPlaying(false);
                return;
            }

            const res = nextStep();
            if (res && !res.isEnd && isPlayingRef.current) {
                setTimeout(runStep, 40);
            } else {
                isPlayingRef.current = false;
                setIsPlaying(false);
            }
        }

        runStep();
    }

    function getNextStepParameters(): InstructionStepParameters | null {
        if (!model) {
            return null;
        }
        return {
            model,
            instructions,
            input: inputTxt,
        };
    }

    function nextStep(): InstructionStepResult | null {
        if (!model) {
            return null;
        }

        setHistory((prev) => [
            ...prev,
            {
                model: JSON.parse(JSON.stringify(model)),
                inputTxt: inputTxt,
                output: output,
                warnings: [...warnings],
            },
        ]);

        let result: InstructionStepResult | null = null;

        try {
            model.input = inputTxt;
            const pars: InstructionStepParameters | null = getNextStepParameters();
            if (!pars) {
                return null;
            }

            const stepResult = NextStep(pars);
            result = stepResult;

            if (stepResult.isEnd) {
                setEmulationState(EmulationState.FINISHED);
                isPlayingRef.current = false;
                setIsPlaying(false);
            } else {
                setEmulationState(EmulationState.PAUSED);
            }

            setInputTxt(stepResult.inputNextStep);
            setOutputTxt(stepResult.output);
            if (stepResult.warnings && stepResult.warnings.length > 0) {
                setWarnings((prev) => [...prev, ...stepResult.warnings]);
            }

            explainNextInstruction();
        } catch (e) {
            const errorMsg = (e as Error).message;
            setWarnings((prev) => [...prev, errorMsg]);
            alert(errorMsg);
            setEmulationState(EmulationState.ERROR);
            isPlayingRef.current = false;
            setIsPlaying(false);
        }

        setVersion((v) => v + 1);
        return result;
    }

    function previous() {
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (history.length === 0) return;
        const lastSnapshot = history[history.length - 1];
        setHistory((prev) => prev.slice(0, prev.length - 1));
        setModel(lastSnapshot.model);
        setInputTxt(lastSnapshot.inputTxt);
        setOutputTxt(lastSnapshot.output);
        setWarnings(lastSnapshot.warnings);
        setEmulationState(EmulationState.PAUSED);
        setVersion((v) => v + 1);
    }

    function ableToContinue(): boolean {
        if (!model || model.pc >= instructions.length) {
            return false;
        }

        return (
            emulationState === EmulationState.PAUSED ||
            emulationState === EmulationState.NOT_STARTED
        );
    }

    function explainNextInstruction() {
        if (!model || model.pc >= instructions.length) return;

        const pars: InstructionStepParameters | null = getNextStepParameters();
        if (!pars) {
            return;
        }

        const explanation = ExplainInstruction(pars);
        const parseParts = SplitExplanationMessageParts(
            explanation.message,
            explanation.placeholders
        );
        instructions[model.pc].explanationParts = parseParts;

        setExplainerVersion((v) => v + 1);
    }

    function resetInstructionsExplanations() {
        for (const instruction of instructions) {
            instruction.explanationParts = [];
        }
        setVersion((v) => v + 1);
    }

    return (
        <main className={styles.layoutwrapper}>
            <Head>
                <title>{t('ui:title')}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className={styles.header}>
                <ControlPanel
                    models={history.map((h) => h.model)}
                    model={model}
                    nextStep={nextStep}
                    previous={previous}
                    play={play}
                    start={start}
                    emulationState={emulationState}
                    canContinue={ableToContinue}
                />
            </div>
            <div className={styles.instructions}>
                <Instructions
                    instructions={instructions}
                    validationErrors={validationErrors}
                    validationOK={validationOK}
                    instructionsLoaded={instructionsLoaded}
                    pc={model?.pc ?? null}
                    instructionsToBeHighlighted={
                        model == null
                            ? null
                            : InstructionsToBeHighlighted(
                                  instructions[model?.pc ?? 0]?.explanationParts
                              )
                    }
                />
            </div>

            {model && (
                <>
                    <div className={styles.stack}>
                        <Stack
                            sp={model?.sp}
                            stack={model?.stack}
                            base={model?.base}
                            stackToBeHighlighed={
                                model == null
                                    ? new Map<number, string>()
                                    : StackToBeHighlighted(
                                          instructions[model?.pc ?? 0]?.explanationParts
                                      )
                            }
                        />
                    </div>
                    <div className={styles.heap}>
                        <Heap
                            heap={model?.heap}
                            heapToBeHighlighted={
                                model == null
                                    ? new Map<number, string>()
                                    : HeapToBeHighlighted(
                                          instructions[model?.pc ?? 0]?.explanationParts
                                      )
                            }
                            allocatorType={allocatorType}
                            onAllocatorChange={handleAllocatorChange}
                        />
                    </div>
                    <div className={styles.io}>
                        <IO
                            inputTxt={inputTxt}
                            setInputTXT={setInputTxt}
                            outputTxt={output}
                        />
                    </div>
                    <div className={styles.warnings}>
                        <WarningsView warnings={warnings} onClear={() => setWarnings([])} />
                    </div>
                </>
            )}
            {
                <div className={styles.footer}>
                    <Footer />
                </div>
            }
        </main>
    );
};

export default Home;
