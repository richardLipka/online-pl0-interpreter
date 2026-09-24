import React from 'react';
import { Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export function OKView({ value }: { value: boolean }) {
    const { t } = useTranslation();
    return <Badge bg={value ? 'success' : 'danger'}>{value ? t('ui:badgeOK') : t('ui:badgeError')}</Badge>;
}
