import React, {ReactNode} from 'react';
import _ from 'lodash';
import * as icons from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';

import {useSelector} from 'react-redux';
import {getCurrentResultId} from '@/static/new-ui/features/suites/selectors';
import {ResultEntityCommon} from '@/static/new-ui/types/store';
import {getIconByStatus} from '@/static/new-ui/utils';
import {Badge, AttachmentType, BadgesAttachment} from '@/types';

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
    const suite = useSelector((state) => {
        const resultId = getCurrentResultId(state);

        if (resultId) {
            return state.tree.results.byId[resultId];
        }

        return;
    });

    if (!suite) {
        return null;
    }

    const badges = suite.attachments?.find(({type}) => type === AttachmentType.Badges) as BadgesAttachment;

    return (
        <div className={styles['test-status-bar']}>
            <div className={styles['test-status-bar__main']}>
                {getIconByStatus(suite.status)}

                <div className={styles['test-status-bar__status']}>
                    {_.startCase(suite.status)}
                </div>
                <div className={styles['test-status-bar__duration']}>
                    {getSuiteDuration(suite)}
                </div>
            </div>
            {(badges && badges.list.length > 0) && (
                <div className={styles['test-status-bar__badges']} data-qa="suite-badges">
                    {badges.list.filter((badge) => badge && badge.title).map((badge: Badge) => (
                        <Button
                            key={badge.title}
                            size="xs"
                            onClick={(): void => {
                                if (badge.url) {
                                    window.open(badge.url, '_blank');
                                }
                            }}
                        >
                            {badge.icon && allIcons[badge.icon] && <Icon data={allIcons[badge.icon]} size={14} />}
                            {badge.title}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};
