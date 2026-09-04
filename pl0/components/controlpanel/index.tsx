import React from 'react';
import { DataModel, EmulationState } from '../../core/model';
import {
    faStepBackward,
    faStepForward,
    faPlay,
    faRedo,
} from '@fortawesome/free-solid-svg-icons';
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
};
export function ControlPanel(props: ControlPanelProps) {
    const { t, i18n } = useTranslation();

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

            <div>
                <IconButton
                    onClick={props.previous}
                    disabled={!props.models || !props.models.length}
                    text={t('ui:btnBack')}
                    icon={faStepBackward}
                    id={'back-button'}
                />
                <IconButton
                    onClick={props.nextStep}
                    disabled={!props.canContinue()}
                    text={t('ui:btnForward')}
                    icon={faStepForward}
                    style={ButtonStyle.STANDARD}
                    id={'forward-button'}
                />
                <IconButton
                    onClick={props.play}
                    disabled={!props.model}
                    text={t('ui:btnPlay')}
                    icon={faPlay}
                    style={ButtonStyle.STANDARD}
                    id={'play-button'}
                />
                <IconButton
                    onClick={props.start}
                    disabled={!props.model}
                    text={t('ui:btnReset')}
                    icon={faRedo}
                    style={ButtonStyle.DANGER}
                    id={'reset-button'}
                />
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
