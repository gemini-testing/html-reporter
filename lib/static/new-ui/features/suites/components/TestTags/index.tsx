import React, {ReactNode} from 'react';
import {Tag} from '@gravity-ui/icons';
import type {TestTag} from 'testplane';

import {useDispatch, useSelector} from 'react-redux';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {updateNameFilter} from '@/static/modules/actions';
import {AttachmentType, TagsAttachment} from '@/types';

import {Badge, badgeStyles} from '@/static/new-ui/components/Badge';
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
        <>
            {tags.list.map((tag: TestTag) => (
                <Badge
                    key={tag.title}
                    title={tag.title}
                    icon={Tag}
                    onClick={(): void => addTag(tag.title)}
                    qa={`test-tag-${tag.title}`}
                    className={tag.dynamic ? badgeStyles.dynamic : undefined}
                    tooltip={tag.dynamic ? (
                        <p className={badgeStyles.hint}>
                            <span>Tag was added via <code>browser.addTag()</code> command.</span>
                            <span>Such tags can&apos;t be used with <code>--tag</code> filtering in CLI.</span>
                        </p>
                    ) : undefined}
                />
            ))}
        </>
    );
};
