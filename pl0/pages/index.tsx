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
import { ParseAndValidate, PreprocessingError } from '../core/validator';
import { extractProgramFromUrl } from '../utils/urlProgram';
import { ShowToast } from '../utils/alerts';
import { Stack } from '../components/stack';
import { Heap } from '../components/heap';
import { Footer } from '../components/footer';
import { ExplainInstruction } from '../core/explainer';
import { IO } from '../components/io';
import { BottomPanel } from '../components/general/BottomPanel';
import { MemoryStatsLayout } from '../components/general/MemoryStatsLayout';
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
    const [stepDelay, setStepDelay] = useState<number>(300);
    const stepDelayRef = React.useRef<number>(300);

    function handleStepDelayChange(delay: number) {
        setStepDelay(delay);
        stepDelayRef.current = delay;
    }

    const [programCode, setProgramCode] = useState<string>('');
    const [forceOpenModal, setForceOpenModal] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const result = extractProgramFromUrl();
        if (!result || !result.code.trim()) return;

        const initialCode = result.code;
        const initialInput = result.input ?? '';

        setProgramCode(initialCode);

        const pav = ParseAndValidate(initialCode.trim());
        setValidationOK(pav.validationOK);
        setValidationErrors(pav.validationErrors);

        if (pav.parseOK && pav.validationOK && pav.instructions.length > 0) {
            setInstructions(pav.instructions);

            isPlayingRef.current = false;
            setIsPlaying(false);
            const m = InitModel(1024, 250, allocatorType);
            if (initialInput) {
                m.input = initialInput;
                setInputTxt(initialInput);
            } else {
                setInputTxt('');
            }
            setOutputTxt('');
            setWarnings([]);
            setEmulationState(EmulationState.NOT_STARTED);
            setHistory([]);
            setModel({ ...m });

            ShowToast(t('ui:programLoadedFromUrl'));
        } else {
            setForceOpenModal(true);
            ShowToast(t('ui:programUrlError'), 'error');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

function cloneModel(m: DataModel): DataModel {
    return {
        pc: m.pc,
        base: m.base,
        sp: m.sp,
        input: m.input,
        output: m.output,
        stack: {
            maxSize: m.stack.maxSize,
            stackItems: m.stack.stackItems.map((item) => ({ value: item.value })),
            stackFrames: m.stack.stackFrames.map((frame) => ({ index: frame.index, size: frame.size })),
        },
        heap: {
            size: m.heap.size,
            values: [...m.heap.values],
            allocatorType:
                typeof m.heap.allocatorType === 'number'
                    ? m.heap.allocatorType
                    : AllocatorType.SINGLE_LINKED,
            heapBlocks: m.heap.heapBlocks.map((block) => ({
                blockAddress: block.blockAddress,
                blockSize: block.blockSize,
                dataAddress: block.dataAddress,
                dataSize: block.dataSize,
                allocatorInfoIndices: [...block.allocatorInfoIndices],
                free: block.free,
            })),
        },
        stats: m.stats
            ? {
                  ...m.stats,
                  instructionCounts: { ...m.stats.instructionCounts },
                  categoryCounts: { ...m.stats.categoryCounts },
              }
            : undefined,
    };
}

    function start(overrideAllocator?: AllocatorType) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        const currentAllocator =
            typeof overrideAllocator === 'number' ? overrideAllocator : allocatorType;
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
                setTimeout(runStep, stepDelayRef.current);
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
                model: cloneModel(model),
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
            if (model && model.stats) {
                model.stats.haltedOnError = true;
            }
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
                    isPlaying={isPlaying}
                    stepDelay={stepDelay}
                    onStepDelayChange={handleStepDelayChange}
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
                    initialCode={programCode}
                    onCodeChange={setProgramCode}
                    forceOpen={forceOpenModal}
                    onModalClose={() => setForceOpenModal(false)}
                    currentInput={inputTxt}
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
                    <div className={styles.memoryStats}>
                        <MemoryStatsLayout
                            heapComponent={
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
                            }
                            ioComponent={
                                <IO
                                    inputTxt={inputTxt}
                                    setInputTXT={setInputTxt}
                                    outputTxt={output}
                                />
                            }
                            renderBottomPanel={(panelProps) => (
                                <BottomPanel
                                    warnings={warnings}
                                    onClearWarnings={() => setWarnings([])}
                                    stats={model?.stats}
                                    emulationState={emulationState}
                                    activeTab={panelProps.activeTab}
                                    onTabChange={panelProps.onTabChange}
                                    onSwapPanels={panelProps.onSwapPanels}
                                    onMaximizeStats={panelProps.onMaximizeStats}
                                    onMaximizeMemory={panelProps.onMaximizeMemory}
                                    onSplitEvenly={panelProps.onSplitEvenly}
                                />
                            )}
                        />
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
