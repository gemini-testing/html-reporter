import {TextHintCard} from '@/static/new-ui/components/Card/TextHintCard';
import EmptyReport from '@/static/icons/empty-report.svg';
import classNames from 'classnames';
import {Icon} from '@gravity-ui/uikit';
import {Check} from '@gravity-ui/icons';
import React, {ReactNode} from 'react';

import styles from './EmptyReportCard.module.css';

export function EmptyReportCard(): ReactNode {
    return <div className={styles.container}>
        <TextHintCard className={styles.hintCard}>
            <img src={EmptyReport} alt='icon' className={styles.emptyReportIcon}/>
            <span className={classNames('text-header-1', styles.cardTitle)}>This report is empty</span>
            <div className={styles.hintsContainer}>
                {[
                    'Check if your project contains any tests',
                    'Check if the tool you are using is configured correctly and is able to find your tests',
                    'Check logs to see if some critical error has occurred and prevented report from collecting any results'
                ].map((hintText, index) => <div key={index} className={styles.hint}>
                    <Icon data={Check} className={styles.hintItemIcon}/>
                    <div className={styles.hintItemText}>{hintText}</div>
                </div>)}
            </div>
        </TextHintCard>
    </div>;
}
