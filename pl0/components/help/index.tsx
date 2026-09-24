import React, { useState } from 'react';
import { Button, Modal, Table } from 'react-bootstrap';
import { IconButton } from '../general/IconButton';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export function Help() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'instructions' | 'cli'>('instructions');

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    const renderHaltBadge = (canHalt: boolean) => {
        return (
            <span
                style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75em',
                    fontWeight: 600,
                    backgroundColor: canHalt ? '#fed7d7' : '#c6f6d5',
                    color: canHalt ? '#9b2c2c' : '#22543d',
                    border: `1px solid ${canHalt ? '#feb2b2' : '#9ae6b4'}`,
                    whiteSpace: 'nowrap',
                }}
            >
                {canHalt ? t('ui:helpCanHaltYes') : t('ui:helpCanHaltNo')}
            </span>
        );
    };

    const renderHaltNote = (key: string) => {
        return (
            <div
                style={{
                    marginTop: '6px',
                    fontSize: '0.82em',
                    color: '#4a5568',
                    backgroundColor: '#f7fafc',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    borderLeft: '3px solid #cbd5e0',
                }}
            >
                <strong>{t('ui:helpHaltConditions')}:</strong> {t(key)}
            </div>
        );
    };

    return (
        <>
            <IconButton onClick={handleShow} text={t('ui:help')} icon={faQuestion} />

            <Modal scrollable={true} show={showModal} onHide={handleClose} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>{t('ui:help')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>
                        <Button
                            variant={activeTab === 'instructions' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => setActiveTab('instructions')}
                        >
                            {t('ui:helpTabInstructions')}
                        </Button>
                        <Button
                            variant={activeTab === 'cli' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => setActiveTab('cli')}
                        >
                            {t('ui:helpTabCli')}
                        </Button>
                    </div>

                    {activeTab === 'instructions' ? (
                    <div>
                        <h2>{t('ui:instructions')}</h2>

                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th style={{ width: '45px' }}>
                                        {t('ui:instructionsTableInstruction')}
                                    </th>
                                    <th style={{ width: '35px' }}>
                                        {t('ui:instructionsTableLevel')}
                                    </th>
                                    <th style={{ width: '40px' }}>
                                        {t('ui:instructionsTablePar')}
                                    </th>
                                    <th style={{ width: '90px' }}>
                                        {t('ui:helpSystemHaltHeader')}
                                    </th>
                                    <th>{t('ui:instructionsTableExplanation')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>LIT</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:value')}</td>
                                    <td>{renderHaltBadge(false)}</td>
                                    <td>
                                        <p>{t('ui:help_lit')}</p>
                                        {renderHaltNote('ui:help_lit_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>INT</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:value')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_int')}</p>
                                        {renderHaltNote('ui:help_int_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>OPR</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:operation')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_opr')}</p>
                                        <p>
                                            {t('ui:help_opr2').split('\n').map((line, index) => (
                                                <React.Fragment key={index}>
                                                    {line}
                                                    <br />
                                                </React.Fragment>
                                            ))}
                                        </p>
                                        {renderHaltNote('ui:help_opr_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>JMP</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:address')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_jmp')}</p>
                                        {renderHaltNote('ui:help_jmp_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>JMC</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:address')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_jmc')}</p>
                                        {renderHaltNote('ui:help_jmc_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>LOD</strong></td>
                                    <td>{t('ui:level')}</td>
                                    <td>{t('ui:address')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_lod')}</p>
                                        {renderHaltNote('ui:help_lod_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>STO</strong></td>
                                    <td>{t('ui:level')}</td>
                                    <td>{t('ui:address')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_sto')}</p>
                                        {renderHaltNote('ui:help_sto_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>CAL</strong></td>
                                    <td>{t('ui:level')}</td>
                                    <td>{t('ui:address')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_cal')}</p>
                                        <p>{t('ui:help_cal2')}</p>
                                        <p>{t('ui:help_cal3')}</p>
                                        <p>{t('ui:help_cal4')}</p>
                                        {renderHaltNote('ui:help_cal_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>RET</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_ret')}</p>
                                        <p>{t('ui:help_ret2')}</p>
                                        {renderHaltNote('ui:help_ret_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>REA</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_rea')}</p>
                                        {renderHaltNote('ui:help_rea_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>WRI</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_wri')}</p>
                                        {renderHaltNote('ui:help_wri_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>NEW</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_new')}</p>
                                        {renderHaltNote('ui:help_new_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>DEL</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_del')}</p>
                                        {renderHaltNote('ui:help_del_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>LDA</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_lda')}</p>
                                        {renderHaltNote('ui:help_lda_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>STA</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_sta')}</p>
                                        {renderHaltNote('ui:help_sta_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>PLD</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_pld')}</p>
                                        {renderHaltNote('ui:help_pld_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>PST</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_pst')}</p>
                                        {renderHaltNote('ui:help_pst_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>ITR</strong></td>
                                    <td>0</td>
                                    <td>0</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_itr')}</p>
                                        {renderHaltNote('ui:help_itr_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>RTI</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:parameter')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_rti')}</p>
                                        <p>{t('ui:help_rti2')}</p>
                                        {renderHaltNote('ui:help_rti_halt')}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>OPF</strong></td>
                                    <td>0</td>
                                    <td>{t('ui:operation')}</td>
                                    <td>{renderHaltBadge(true)}</td>
                                    <td>
                                        <p>{t('ui:help_opf')}</p>
                                        <p>
                                            {t('ui:help_opr2').split('\n').map((line, index) => (
                                                <React.Fragment key={index}>
                                                    {line}
                                                    <br />
                                                </React.Fragment>
                                            ))}
                                        </p>
                                        {renderHaltNote('ui:help_opf_halt')}
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                    ) : (
                    <div>
                        <h2>{t('ui:cliHelpTitle')}</h2>
                        <p style={{ color: '#4a5568' }}>{t('ui:cliHelpDesc')}</p>

                        <h4 style={{ marginTop: '16px' }}>{t('ui:cliHelpUsageTitle')}</h4>
                        <div
                            style={{
                                backgroundColor: '#2d3748',
                                color: '#f7fafc',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '0.9em',
                                overflowX: 'auto',
                            }}
                        >
                            <div>npx tsx cli/index.ts [options] &lt;file.pl0 ...&gt;</div>
                            <div style={{ color: '#a0aec0', marginTop: '4px' }}># {t('ui:cliHelpOptionsLabel')}: -i &lt;input&gt; | -s &lt;max-steps&gt; | -t (--trace) | --stats | --no-debug | -n (--ignore-line-numbers) | -f &lt;text|json&gt; | --lang &lt;cs|en&gt;</div>
                        </div>

                        <h4 style={{ marginTop: '20px' }}>{t('ui:cliHelpDirectivesTitle')}</h4>
                        <p style={{ color: '#718096', fontSize: '0.9em', fontStyle: 'italic' }}>
                            {t('ui:cliHelpDirectivesNote')}
                        </p>

                        <Table striped bordered hover responsive style={{ fontSize: '0.9em' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#edf2f7' }}>
                                    <th style={{ width: '220px' }}>{t('ui:helpDirectiveColumn')}</th>
                                    <th>{t('ui:helpDescriptionColumn')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>&amp;REGS</code></td>
                                    <td>{t('ui:directive_regs')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;STK</code></td>
                                    <td>{t('ui:directive_stk')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;STKA</code></td>
                                    <td>{t('ui:directive_stka')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;STKN &lt;n&gt;</code></td>
                                    <td>{t('ui:directive_stkn')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;STKRG &lt;a&gt; &lt;b&gt;</code></td>
                                    <td>{t('ui:directive_stkrg')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;ECHO &lt;string&gt;</code></td>
                                    <td>{t('ui:directive_echo')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;MEM</code></td>
                                    <td>{t('ui:directive_mem')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;HEAP</code></td>
                                    <td>{t('ui:directive_heap')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;ASSERT_TOS &lt;val&gt;</code></td>
                                    <td>{t('ui:directive_assert_tos')}</td>
                                </tr>
                                <tr>
                                    <td><code>&amp;STATS</code></td>
                                    <td>{t('ui:directive_stats')}</td>
                                </tr>
                            </tbody>
                        </Table>

                        <h5 style={{ marginTop: '16px' }}>{t('ui:helpDirectivesExampleTitle')}</h5>
                        <pre
                            style={{
                                backgroundColor: '#f7fafc',
                                border: '1px solid #e2e8f0',
                                padding: '12px',
                                borderRadius: '6px',
                                fontSize: '0.85em',
                                fontFamily: 'Consolas, Monaco, monospace',
                            }}
                        >
{`; ${t('ui:helpDirectivesExampleComment')}
INT 0, 4
LIT 0, 5 ; ${t('ui:helpDirectivesExampleValueComment')}
STO 0, 3
&REGS
&STKA
&ECHO "${t('ui:helpDirectivesExampleEcho')}"
LOD 0, 3
&STKN 1
&ASSERT_TOS 5
RET 0, 0`}
                        </pre>
                    </div>
                    )}
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
