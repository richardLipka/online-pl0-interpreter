import React, { useState } from 'react';
import { Button, Modal, Table } from 'react-bootstrap';
import { IconButton } from '../general/IconButton';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export function Help() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    return (
        <>
            <IconButton onClick={handleShow} text={t('ui:help')} icon={faQuestion} />

            <Modal scrollable={true} show={showModal} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('ui:help')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{}}>
                        <h2>{t("ui:instructions")}</h2>

                        {
                            <Table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '35px' }}></th>
                                        <th style={{ width: '50px' }}>
                                            {t('ui:instructionsTableInstruction')}
                                        </th>
                                        <th style={{ width: '35px' }}>
                                            {t('ui:instructionsTableLevel')}
                                        </th>
                                        <th style={{ width: '35px' }}>
                                            {t('ui:instructionsTablePar')}
                                        </th>
                                        <th>{t('ui:instructionsTableExplanation')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td></td>
                                        <td>LIT</td>
                                        <td>0</td>
                                        <td>{t("ui:value")}</td>
                                        <td>{t("ui:help_lit")}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>INT</td>
                                        <td>0</td>
                                        <td>{t("ui:value")}</td>
                                        <td>{t("ui:help_int")}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>OPR</td>
                                        <td>0</td>
                                        <td>{t("ui:operation")}</td>
                                        <td>
                                            <p>
                                                {t("ui:help_opr")}
                                            </p>
                                            <p>
                                                {t("ui:help_opr2").split('\n').map((line, index) => (
                                                <React.Fragment key={index}>
                                                {line}
                                                <br />
                                                </React.Fragment>
                                                ))}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>JMP</td>
                                        <td>0</td>
                                        <td>{t("ui:address")}</td>
                                        <td>
                                            {t("ui:help_jmp")}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>JMC</td>
                                        <td>0</td>
                                        <td>{t("ui:address")}</td>
                                        <td>
                                            {t("ui:help_jmc")}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>LOD</td>
                                        <td>{t("ui:level")}</td>
                                        <td>{t("ui:address")}</td>
                                        <td>
                                            {t("ui:help_lod")}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>STO</td>
                                        <td>{t("ui:level")}</td>
                                        <td>{t("ui:address")}</td>
                                        <td>
                                            {t("ui:help_sto")}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>CAL</td>
                                        <td>{t("ui:level")}</td>
                                        <td>{t("ui:address")}</td>
                                        <td>
                                            <p>
                                                {t("ui:help_cal")}
                                            </p>
                                            <p>
                                                {t("ui:help_cal2")}
                                            </p>
                                            <p>
                                                {t("ui:help_cal3")}
                                            </p>
                                            <p>
                                                {t("ui:help_cal4")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>RET</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_ret")}
                                            </p>
                                            <p>
                                                {t("ui:help_ret2")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>REA</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_rea")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>WRI</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_wri")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>NEW</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_new")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>DEL</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_del")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>LDA</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_lda")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>STA</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_sta")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>PLD</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_pld")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>PST</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_pst")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>ITR</td>
                                        <td>0</td>
                                        <td>0</td>
                                        <td>
                                            <p>
                                                {t("ui:help_itr")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>RTI</td>
                                        <td>0</td>
                                        <td>{t("ui:parameter")}</td>
                                        <td>
                                            <p>
                                                {t("ui:help_rti")}
                                            </p>
                                            <p>
                                                {t("ui:help_rti2")}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>OPF</td>
                                        <td>0</td>
                                        <td>{t("ui:operation")}</td>
                                        <td>
                                            <p>
                                                {t("ui:help_opf")}
                                            </p>
                                            <p>
                                                {t("ui:help_opr2").split('\n').map((line, index) => (
                                                <React.Fragment key={index}>
                                                {line}
                                                <br />
                                                </React.Fragment>
                                                ))}
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                            </Table>
                        }
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleClose}>
                        {t('ui:ok')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
