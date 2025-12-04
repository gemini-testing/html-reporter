import React, {ReactNode} from 'react';
import _ from 'lodash';
import * as icons from '@gravity-ui/icons';

import {useSelector} from 'react-redux';
import {ResultEntityCommon} from '@/static/new-ui/types/store';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {getIconByStatus} from '@/static/new-ui/utils';
import {Badge as BadgeType, AttachmentType, BadgesAttachment} from '@/types';
import {Badge} from '@/static/new-ui/components/Badge';

import styles from './index.module.css';
import {IconData} from '@gravity-ui/uikit';

const allIcons = icons as unknown as Record<string, IconData>;

const getSuiteDuration = (suite: ResultEntityCommon): string | undefined => {
    if (suite.duration !== undefined) {
        return `in ${(suite.duration / 1000).toFixed(1)}s`;
    }

    return;
};

export const TestStatusBar = (): ReactNode => {
    const suite = useSelector(getCurrentResult);

    if (!suite) {
        return null;
    }

    const badges = suite.attachments?.find(({type}) => type === AttachmentType.Badges) as BadgesAttachment;

    return (
        <div className={styles['test-status-bar']}>
            <div className={styles['test-status-bar__main']}>
                {getIconByStatus(suite.status)}

                <div className={styles['test-status-bar__status']} data-qa="suite-status-bar-status">
                    {_.startCase(suite.status)}
                </div>
                <div className={styles['test-status-bar__duration']}>
                    {getSuiteDuration(suite)}
                </div>
            </div>
            {(badges && badges.list.length > 0) && (
                <div className={styles['test-status-bar__badges']} data-qa="suite-badges">
                    {badges.list.map((badge: BadgeType) => (
                        <Badge
                            key={badge.title}
                            title={badge.title}
                            icon={badge.icon && allIcons[badge.icon] ? allIcons[badge.icon] : undefined}
                            href={badge.url}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
