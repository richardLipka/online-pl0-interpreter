import React from 'react';
import { DataModel, EmulationState } from '../../core/model';
import {
    faStepBackward,
    faStepForward,
    faPlay,
    faStop,
    faRedo,
    faTachometerAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ButtonStyle, IconButton } from '../general/IconButton';
import Select, { SingleValue } from 'react-select';
import { useTranslation } from 'react-i18next';
import { Help } from '../help';

const languageOptions = [
    { value: 'cs', label: 'Čeština' },
    { value: 'en', label: 'English' },
];

type ControlPanelProps = {
    models: DataModel[];
    model: DataModel | null;

    nextStep: () => void;
    previous: () => void;
    play: () => void;
    start: () => void;

    emulationState: EmulationState;
    canContinue: () => boolean;

    isPlaying?: boolean;
    stepDelay?: number;
    onStepDelayChange?: (delay: number) => void;
};
export function ControlPanel(props: ControlPanelProps) {
    const { t, i18n } = useTranslation();

    const isPlaying = props.isPlaying ?? false;
    const currentDelay = props.stepDelay ?? 300;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                padding: '20px',
            }}
        >
            <div
                style={{
                    marginLeft: '10px',
                    fontSize: 'small',
                    position: 'absolute',
                    left: 0,
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <Help />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        onClick={() => props.previous()}
                        disabled={isPlaying || !props.models || !props.models.length}
                        text={t('ui:btnBack')}
                        icon={faStepBackward}
                        id={'back-button'}
                    />
                    <IconButton
                        onClick={() => props.nextStep()}
                        disabled={isPlaying || !props.canContinue()}
                        text={t('ui:btnForward')}
                        icon={faStepForward}
                        style={ButtonStyle.STANDARD}
                        id={'forward-button'}
                    />
                    <IconButton
                        onClick={() => props.play()}
                        disabled={!isPlaying && (!props.model || !props.canContinue())}
                        text={isPlaying ? t('ui:btnStop') : t('ui:btnPlay')}
                        icon={isPlaying ? faStop : faPlay}
                        style={isPlaying ? ButtonStyle.DANGER : ButtonStyle.STANDARD}
                        id={'play-button'}
                    />
                    <IconButton
                        onClick={() => props.start()}
                        disabled={isPlaying || !props.model}
                        text={t('ui:btnReset')}
                        icon={faRedo}
                        style={ButtonStyle.DANGER}
                        id={'reset-button'}
                    />
                </div>

                {/* Execution Speed Controller */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FontAwesomeIcon icon={faTachometerAlt} style={{ color: '#489fb5' }} />
                        <span style={{ fontSize: '0.85em', fontWeight: 600 }}>
                            {t('ui:speedLabel')}:
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75em', color: '#cbd5e0' }}>{t('ui:speedFast')}</span>
                        <input
                            type="range"
                            min={20}
                            max={1500}
                            step={20}
                            value={currentDelay}
                            onChange={(e) => {
                                if (props.onStepDelayChange) {
                                    props.onStepDelayChange(Number(e.target.value));
                                }
                            }}
                            style={{
                                width: '110px',
                                cursor: 'pointer',
                                accentColor: '#489fb5',
                            }}
                            title={`${currentDelay} ${t('ui:msPerStep')}`}
                        />
                        <span style={{ fontSize: '0.75em', color: '#cbd5e0' }}>{t('ui:speedSlow')}</span>
                    </div>

                    <span
                        style={{
                            backgroundColor: 'rgba(72, 159, 181, 0.3)',
                            border: '1px solid #489fb5',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                            minWidth: '58px',
                            textAlign: 'center',
                        }}
                    >
                        {currentDelay} ms
                    </span>
                </div>
            </div>
            {
                <div
                    style={{
                        marginRight: '30px',
                        fontSize: 'small',
                        position: 'absolute',
                        right: 0,
                        display: 'flex',
                        flexDirection: 'row',
                    }}
                >
                    <Select
                        options={languageOptions}
                        placeholder={t('ui:selectLanguage')}
                        value={
                            languageOptions.find(
                                (o) => o.value === (i18n.language?.startsWith('en') ? 'en' : 'cs')
                            ) ?? languageOptions[0]
                        }
                        onChange={(
                            newValue: SingleValue<{
                                value: string;
                                label: string;
                            }>
                        ) => {
                            i18n.changeLanguage(newValue?.value ?? 'cs');
                        }}
                    />
                </div>
            }

            {/*

            <div
                style={{
                    marginRight: '30px',
                    color: light,
                    fontSize: 'small',
                    justifySelf: 'flex-end',
                }}
            >
                Vytvořili Lukáš Vlček a Vojtěch Bartička <br />
                Semestrální práce z KIV/FJP, FAV ZČU 2021/2022
            </div>*/}
        </div>
    );
}
