import path from 'path';

import {DefinitionList} from '@gravity-ui/uikit';
import {isEmpty, isObject, mapValues, omitBy} from 'lodash';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {getRelativeUrl, getUrlWithBase, isUrl} from '@/common-utils';
import {ResultEntity, State} from '@/static/new-ui/types/store';
import {HtmlReporterValues} from '@/plugin-api';
import {ReporterConfig} from '@/types';
import styles from './index.module.css';
import {makeLinksClickable} from '@/static/new-ui/utils';
import {TestStatus} from '@/constants';

const serializeMetaValues = (metaInfo: Record<string, unknown>): Record<string, string> =>
    mapValues(metaInfo, (v): string => {
        if (isObject(v)) {
            return JSON.stringify(v);
        }

        return v?.toString() ?? 'No value';
    });

interface MetaInfoItem<T> {
    label: string;
    content: T;
    url?: string;
    copyText?: string;
}

export interface MetaInfoProps {
    resultId: string,
    qa?: string;
}

interface MetaInfoInternalProps extends MetaInfoProps {
    result: ResultEntity;
    testName: string;
    metaInfoBaseUrls: ReporterConfig['metaInfoBaseUrls'];
    apiValues: Pick<HtmlReporterValues, 'extraItems' | 'metaInfoExtenders'>;
    baseHost: string;
}

function MetaInfoInternal(props: MetaInfoInternalProps): ReactNode {
    const resolveMetaInfoExtenders = (): Record<string, string> => {
        const {testName, apiValues: {extraItems, metaInfoExtenders}} = props;

        return omitBy(mapValues(metaInfoExtenders, (extender) => {
            const stringifiedFn = extender.startsWith('return') ? extender : `return ${extender}`;

            return new Function(stringifiedFn)()({testName}, extraItems);
        }), isEmpty);
    };

    const {result, metaInfoBaseUrls, baseHost} = props;

    const serializedMetaValues = serializeMetaValues({
        ...result.metaInfo,
        ...resolveMetaInfoExtenders()
    });

    const metaInfoItems: MetaInfoItem<string>[] = Object.entries(serializedMetaValues).map(([key, value]) => ({
        label: key,
        content: value
    }));

    const metaInfoItemsWithResolvedUrls: MetaInfoItem<string | React.JSX.Element>[] = metaInfoItems.map((item) => {
        if (item.label === 'url' || metaInfoBaseUrls[item.label] === 'auto') {
            const url = getUrlWithBase(item.content, baseHost);
            return {
                label: item.label,
                content: getRelativeUrl(item.content),
                url,
                copyText: url
            };
        }

        if (metaInfoBaseUrls[item.label]) {
            const baseUrl = metaInfoBaseUrls[item.label];
            const resolvedUrl = isUrl(baseUrl) ? getUrlWithBase(item.content, baseUrl) : path.join(baseUrl, item.content);
            // For file paths/arbitrary strings show them unchanged. If original value was URL, we don't want to mislead
            // user by showing old URL, actually pointing to resolved URL, so we show an actual resolved URL here.

            const displayName = isUrl(item.content) ? resolvedUrl : item.content;
            return {
                label: item.label,
                content: displayName,
                copyText: displayName,
                url: resolvedUrl
            };
        }

        if (!isUrl(item.content)) {
            return item;
        }

        return {
            label: item.label,
            content: item.content,
            url: item.content
        };
    });

    if (result.duration !== undefined) {
        metaInfoItemsWithResolvedUrls.push({
            label: 'duration',
            content: `${new Intl.NumberFormat().format(result.duration)} ms`
        });
    }

    const hasUrlMetaInfoItem = metaInfoItemsWithResolvedUrls.some(item => item.label === 'url');
    if (!hasUrlMetaInfoItem && result.suiteUrl) {
        metaInfoItemsWithResolvedUrls.push({
            label: 'url',
            content: getRelativeUrl(result.suiteUrl),
            url: getUrlWithBase(result.suiteUrl, baseHost)
        });
    }

    if (result.status === TestStatus.SKIPPED && result.skipReason) {
        metaInfoItemsWithResolvedUrls.push({
            label: 'skipReason',
            content: makeLinksClickable(result.skipReason),
            copyText: result.skipReason
        });
    }

    return <DefinitionList className={styles.metaInfo} qa={props.qa}>
        {metaInfoItemsWithResolvedUrls.map((item) => {
            if (item.url) {
                return <DefinitionList.Item name={item.label} copyText={item.copyText ?? item.content as string} key={item.label}>
                    <a className={styles.metaInfoValue} data-suite-view-link={item.url} target="_blank" href={item.url} rel="noreferrer">
                        {item.content}
                    </a>
                </DefinitionList.Item>;
            }

            return <DefinitionList.Item name={item.label} copyText={item.copyText ?? item.content as string} key={item.label}>
                <span className={styles.metaInfoValue}>{item.content}</span>
            </DefinitionList.Item>;
        })
        }
    </DefinitionList>;
}

export const MetaInfo = connect(
    ({tree, config: {metaInfoBaseUrls}, apiValues, view}: State, {resultId}: MetaInfoProps) => {
        const result = tree.results.byId[resultId];
        const browser = tree.browsers.byId[result?.parentId];

        return {
            result,
            testName: browser?.parentId,
            metaInfoBaseUrls,
            apiValues,
            baseHost: view.baseHost
        };
    }
)(MetaInfoInternal);
