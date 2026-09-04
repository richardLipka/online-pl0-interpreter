import React from 'react';
import { light, primary } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

export function Footer() {
    const { t } = useTranslation();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                backgroundColor: primary,
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '2px 2px 5px 2px rgba(0,0,0,0.1)',
                borderTopLeftRadius: '0px',
                borderTopRightRadius: '0px',
                overflow: 'hidden',
                fontSize: 'small',
                fontWeight: 'lighter',
            }}
            className="panel"
        >
            <div
                style={{
                    marginRight: '30px',
                    color: light,
                }}
            >
                {t('ui:createdBy')}
            </div>
            <div
                style={{
                    marginRight: '30px',
                    color: light,
                }}
            >
                {t('ui:workInfo')}
            </div>
        </div>
    );
}
