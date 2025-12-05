import React, {ReactNode} from 'react';
import * as icons from '@gravity-ui/icons';
import {Tooltip, Label, Icon} from '@gravity-ui/uikit';
import type {TestTag} from 'testplane';

import {useDispatch, useSelector} from 'react-redux';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {updateNameFilter} from '@/static/modules/actions';
import {AttachmentType, TagsAttachment} from '@/types';

import styles from './index.module.css';
import {usePage} from '@/static/new-ui/hooks/usePage';

export const TestTags = (): ReactNode => {
    const suite = useSelector(getCurrentResult);
    const dispatch = useDispatch();
    const page = usePage();
    const nameFilter = useSelector((state) => state.app[page].nameFilter);

    if (!suite) {
        return null;
    }

    const tags = suite.attachments?.find(({type}) => type === AttachmentType.Tags) as TagsAttachment;

    const addTag = (tag: string): void => {
        const tagStr = `@${tag}`;

        if (!nameFilter.includes(tagStr)) {
            dispatch(
                updateNameFilter({
                    data: nameFilter.length ? `${nameFilter} ${tagStr}` : tagStr,
                    page
                })
            );
        }
    };

    if (!tags?.list || tags.list.length === 0) {
        return null;
    }

    return (
        <div className={styles['test-tags']} data-qa="test-tags">
            <span className={styles['test-tags__title']}>
                Tags
            </span>
            {tags && tags.list.length > 0 && (
                tags.list.map((tag: TestTag) => (
                    <Tooltip
                        key={tag.title}
                        content={tag.dynamic && (
                            <p className={styles['test-tags__hint']}>
                                <span>Tag was added via <code>browser.addTag()</code> command.</span>
                                <span>Such tags can&apos;t be used with <code>--tag</code> filtering in CLI.</span>
                            </p>
                        )}
                    >
                        <Label
                            size="xs"
                            theme={tag.dynamic ? 'warning' : 'normal'}
                            onClick={(): void => addTag(tag.title)}
                            icon={<Icon data={icons.Tag} size={14} />}
                            qa={`test-tag-${tag.title}`}
                        >
                            {tag.title}
                        </Label>
                    </Tooltip>
                ))
            )}
        </div>
    );
};
