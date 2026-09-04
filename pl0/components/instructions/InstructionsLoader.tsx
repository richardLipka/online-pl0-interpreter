import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { Instruction } from '../../core/model';
import { ParseAndValidate, PreprocessingError } from '../../core/validator';
import { ShowToast } from '../../utils/alerts';
import { OKView } from '../general/OKView';
import styles from '../../styles/instructions.module.css';
import { ButtonStyle, IconButton } from '../general/IconButton';

import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
type InstructionsLoaderProps = {
    instructionsLoaded: (
        instructions: Instruction[],
        validationOK: boolean,
        validationErrors: PreprocessingError[]
    ) => void;
    pc: number | null;
};

export function InstructionsLoader(props: InstructionsLoaderProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    const [textInstructions, setTextInstructions] = useState('');

    const [parseOK, setParseOK] = useState(false);
    const [validationOK, setValidationOK] = useState(false);
    const [parseErrors, setParseErrors] = useState<PreprocessingError[]>([]);
    const [validationErrors, setValidationErrors] = useState<PreprocessingError[]>([]);

    const [instructions, setInstructions] = useState<Instruction[] | null>(null);

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

        props.instructionsLoaded(instructions, validationOK, validationErrors);
        handleClose();
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
                <IconButton
                    onClick={handleShow}
                    text={t('ui:btnLoadInstructions')}
                    icon={faEdit}
                    style={ButtonStyle.STANDARD}
                    id={'load-instructions-button'}
                />
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
                    <input type="file" onChange={onFileAdded} />

                    <div style={{}}>
                        <textarea
                            style={{ width: '100%' }}
                            rows={15}
                            value={textInstructions}
                            onChange={onChange}
                            className={styles.instructionsTextField}
                            id={'instructions-textarea'}
                        />

                        <div>
                            <ParseErrorsView />
                            {parseOK && <ValidationErrorsView />}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
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
