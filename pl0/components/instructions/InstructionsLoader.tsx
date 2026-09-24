import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { Instruction } from '../../core/model';
import { ParseAndValidate, PreprocessingError, hasLineNumbers, stripLineNumbers, addLineNumbers } from '../../core/validator';
import { ShowToast } from '../../utils/alerts';
import { OKView } from '../general/OKView';
import styles from '../../styles/instructions.module.css';
import { ButtonStyle, IconButton } from '../general/IconButton';
import { faEdit, faShareNodes, faEraser, faExclamationTriangle, faListOl } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';
import { encodeProgramToUrl } from '../../utils/urlProgram';

type InstructionsLoaderProps = {
    instructionsLoaded: (
        instructions: Instruction[],
        validationOK: boolean,
        validationErrors: PreprocessingError[]
    ) => void;
    pc: number | null;
    initialCode?: string;
    onCodeChange?: (code: string) => void;
    forceOpen?: boolean;
    onModalClose?: () => void;
    currentInput?: string;
    hasInstructions?: boolean;
};

export function InstructionsLoader(props: InstructionsLoaderProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);

    const handleClose = () => {
        setShowModal(false);
        props.onModalClose?.();
    };
    const handleShow = () => setShowModal(true);

    const [textInstructions, setTextInstructions] = useState(props.initialCode || '');

    const [parseOK, setParseOK] = useState(false);
    const [validationOK, setValidationOK] = useState(false);
    const [parseErrors, setParseErrors] = useState<PreprocessingError[]>([]);
    const [validationErrors, setValidationErrors] = useState<PreprocessingError[]>([]);

    const [instructions, setInstructions] = useState<Instruction[] | null>(null);

    useEffect(() => {
        if (props.initialCode !== undefined && props.initialCode !== textInstructions) {
            setTextInstructions(props.initialCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.initialCode]);

    useEffect(() => {
        if (props.forceOpen) {
            setShowModal(true);
        }
    }, [props.forceOpen]);

    useEffect(() => {
        const pav = ParseAndValidate(textInstructions.trim());

        setParseOK(pav.parseOK);
        setValidationOK(pav.validationOK);

        setParseErrors(pav.parseErrors);
        setValidationErrors(pav.validationErrors);

        if (pav.parseOK && pav.validationOK) {
            setInstructions(pav.instructions);
        } else {
            setInstructions(null);
        }
    }, [textInstructions]);

    async function handleShare() {
        const codeToShare = (textInstructions || props.initialCode || '').trim();
        if (!codeToShare) return;

        const shareUrl = encodeProgramToUrl(
            typeof window !== 'undefined' ? window.location.href : '',
            codeToShare,
            props.currentInput
        );

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', shareUrl);
            }
            ShowToast(t('ui:shareUrlCopied'));
        } catch {
            ShowToast(t('ui:shareUrlCopied'));
        }
    }

    function ParseErrorsView() {
        return (
            <div>
                {t('ui:instructionsParsingState')}: <OKView value={parseOK} />
                {parseErrors.map((e, index) => (
                    <code key={index} style={{ display: 'block' }}>
                        {e.rowIndex}: {e.error}
                    </code>
                ))}
            </div>
        );
    }
    function ValidationErrorsView() {
        return (
            <div>
                {t('ui:instructionsValidationState')}: <OKView value={validationOK} />
                {validationErrors.map((e, index) => (
                    <code key={index} style={{ display: 'block' }}>
                        {e.rowIndex}: {e.error}
                    </code>
                ))}
            </div>
        );
    }

    function onChange(e: React.FormEvent<HTMLTextAreaElement>): void {
        setTextInstructions(e.currentTarget.value);
    }

    function onFileAdded(e: React.FormEvent<HTMLInputElement>) {
        if (!e.currentTarget.files || e.currentTarget.files.length === 0) return;

        const file = e.currentTarget.files[0];
        const isTextMime = !file.type || file.type.startsWith('text/') || file.type === 'application/octet-stream';
        const isTextExt = /\.(pl0|pcode|asm|txt|code|dat)$/i.test(file.name) || !file.name.includes('.');

        if (isTextMime || isTextExt) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result;
                if (typeof text === 'string') {
                    setTextInstructions(text);
                    ShowToast(t('ui:inputFileLoaded'));
                } else {
                    ShowToast(t('ui:inputFileError'), 'error');
                }
            };
            reader.onerror = () => {
                ShowToast(t('ui:inputFileError'), 'error');
            };
            reader.readAsText(file);
        } else {
            ShowToast(t('ui:inputFileErrorNotText'), 'error');
        }
    }
    function onSave() {
        if (instructions == null) {
            ShowToast(t('ui:cannotsaveNoInstructions'), 'error');
            return;
        }

        props.onCodeChange?.(textInstructions);
        props.instructionsLoaded(instructions, validationOK, validationErrors);
        handleClose();
    }

    const canShare = Boolean(props.hasInstructions || (parseOK && validationOK && instructions != null));
    const lineNumbersPresent = hasLineNumbers(textInstructions);
    const showLineNumbersWarning = lineNumbersPresent && (!parseOK || !validationOK);
    const hasInstructionsCode = textInstructions.trim().length > 0;
    const initialOrTextHasLineNumbers = hasLineNumbers(props.initialCode || textInstructions);
    const initialOrTextHasCode = (props.initialCode || textInstructions).trim().length > 0;

    function handleStripLineNumbers() {
        const cleaned = stripLineNumbers(textInstructions);
        setTextInstructions(cleaned);
        ShowToast(t('ui:lineNumbersRemoved'));
    }

    function handleAddLineNumbers() {
        const numbered = addLineNumbers(textInstructions);
        setTextInstructions(numbered);
        ShowToast(t('ui:lineNumbersAdded'));
    }

    function handleQuickStrip() {
        const source = props.initialCode || textInstructions;
        const cleaned = stripLineNumbers(source);
        setTextInstructions(cleaned);
        props.onCodeChange?.(cleaned);
        const pav = ParseAndValidate(cleaned.trim());
        if (pav.parseOK && pav.validationOK && pav.instructions.length > 0) {
            props.instructionsLoaded(pav.instructions, pav.validationOK, pav.validationErrors);
        }
        ShowToast(t('ui:lineNumbersRemoved'));
    }

    function handleQuickNumber() {
        const source = props.initialCode || textInstructions;
        const numbered = addLineNumbers(source);
        setTextInstructions(numbered);
        props.onCodeChange?.(numbered);
        const pav = ParseAndValidate(numbered.trim());
        if (pav.parseOK && pav.validationOK && pav.instructions.length > 0) {
            props.instructionsLoaded(pav.instructions, pav.validationOK, pav.validationErrors);
        }
        ShowToast(t('ui:lineNumbersAdded'));
    }

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingRight: '10px',
                    marginBottom: '15px',
                }}
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <IconButton
                        onClick={handleShow}
                        text={t('ui:btnLoadInstructions')}
                        icon={faEdit}
                        style={ButtonStyle.STANDARD}
                        id={'load-instructions-button'}
                    />
                    <IconButton
                        onClick={handleShare}
                        disabled={!canShare}
                        text={t('ui:btnShareProgram')}
                        icon={faShareNodes}
                        style={ButtonStyle.STANDARD}
                        id={'share-instructions-button'}
                    />
                    {initialOrTextHasLineNumbers ? (
                        <IconButton
                            onClick={handleQuickStrip}
                            text={t('ui:btnStripLineNumbers')}
                            icon={faEraser}
                            style={ButtonStyle.STANDARD}
                            id={'quick-strip-instructions-button'}
                        />
                    ) : (
                        initialOrTextHasCode && (
                            <IconButton
                                onClick={handleQuickNumber}
                                text={t('ui:btnNumberLines')}
                                icon={faListOl}
                                style={ButtonStyle.STANDARD}
                                id={'quick-number-instructions-button'}
                            />
                        )
                    )}
                </div>
                {props.pc !== null && (
                    <div>
                        PC: <b>{props.pc}</b>
                    </div>
                )}
            </div>

            <Modal
                show={showModal}
                onHide={handleClose}
                backdrop="static"
                keyboard={false}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>{t('ui:instructionsModalHeader')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            flexWrap: 'wrap',
                            gap: '8px',
                        }}
                    >
                        <input type="file" onChange={onFileAdded} />
                        {lineNumbersPresent ? (
                            <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={handleStripLineNumbers}
                                id="strip-line-numbers-button"
                                title={t('ui:btnStripLineNumbersTooltip')}
                            >
                                <FontAwesomeIcon
                                    icon={faEraser}
                                    width="14px"
                                    height="14px"
                                    style={{ width: '14px', height: '14px', marginRight: '6px' }}
                                />
                                {t('ui:btnStripLineNumbers')}
                            </Button>
                        ) : (
                            hasInstructionsCode && (
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleAddLineNumbers}
                                    id="add-line-numbers-button"
                                    title={t('ui:btnNumberLinesTooltip')}
                                >
                                    <FontAwesomeIcon
                                        icon={faListOl}
                                        width="14px"
                                        height="14px"
                                        style={{ width: '14px', height: '14px', marginRight: '6px' }}
                                    />
                                    {t('ui:btnNumberLines')}
                                </Button>
                            )
                        )}
                    </div>

                    <div>
                        <textarea
                            style={{ width: '100%' }}
                            rows={15}
                            value={textInstructions}
                            onChange={onChange}
                            className={styles.instructionsTextField}
                            id={'instructions-textarea'}
                        />

                        {showLineNumbersWarning && (
                            <div
                                id="line-numbers-detected-alert"
                                className="alert alert-warning py-1 px-3 mt-2 mb-2 d-flex align-items-center"
                                style={{
                                    fontSize: '0.85rem',
                                    lineHeight: '1.3',
                                    minHeight: '38px',
                                    borderRadius: '4px',
                                    gap: '8px',
                                }}
                            >
                                <FontAwesomeIcon
                                    icon={faExclamationTriangle}
                                    width="16px"
                                    height="16px"
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        flexShrink: 0,
                                        color: '#b45309',
                                    }}
                                />
                                <span>{t('ui:lineNumbersDetectedNotice')}</span>
                            </div>
                        )}

                        <div style={{ marginTop: showLineNumbersWarning ? '0px' : '10px' }}>
                            <ParseErrorsView />
                            {parseOK && <ValidationErrorsView />}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-info"
                        onClick={handleShare}
                        disabled={!(parseOK && validationOK && instructions != null)}
                        id={'modal-share-instructions-button'}
                        style={{ marginRight: 'auto' }}
                    >
                        {t('ui:btnShareProgram')}
                    </Button>
                    <Button variant="secondary" onClick={handleClose}>
                        {t('ui:btnCancel')}
                    </Button>
                    <Button
                        variant="primary"
                        disabled={!(parseOK && validationOK && instructions != null)}
                        onClick={onSave}
                        id={'save-instructions-button'}
                    >
                        {t('ui:btnSave')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
