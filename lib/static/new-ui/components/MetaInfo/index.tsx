import path from 'path';

import {DefinitionList} from '@gravity-ui/components';
import {mapValues, isObject, omitBy, isEmpty} from 'lodash';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {isUrl, getUrlWithBase, getRelativeUrl} from '@/common-utils';
import {ResultEntity, State} from '@/static/new-ui/types/store';
import {HtmlReporterValues} from '@/plugin-api';
import {ReporterConfig} from '@/types';
import styles from './index.module.css';

const serializeMetaValues = (metaInfo: Record<string, unknown>): Record<string, string> =>
    mapValues(metaInfo, (v): string => {
        if (isObject(v)) {
            return JSON.stringify(v);
        }

        return v?.toString() ?? 'No value';
    });

interface MetaInfoItem {
    label: string;
    content: string;
    url?: string;
    copyText?: string;
}

export interface MetaInfoProps {
    resultId: string,
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

    const metaInfoItems: MetaInfoItem[] = Object.entries(serializedMetaValues).map(([key, value]) => ({
        label: key,
        content: value
    }));

    const metaInfoItemsWithResolvedUrls = metaInfoItems.map((item) => {
        if (item.label === 'url' || metaInfoBaseUrls[item.label] === 'auto') {
            const url = getUrlWithBase(getRelativeUrl(item.content), baseHost);
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

    const hasUrlMetaInfoItem = metaInfoItemsWithResolvedUrls.some(item => item.label === 'url');
    if (!hasUrlMetaInfoItem && result.suiteUrl) {
        metaInfoItemsWithResolvedUrls.push({
            label: 'url',
            content: getRelativeUrl(result.suiteUrl),
            url: getUrlWithBase(getRelativeUrl(result.suiteUrl), baseHost)
        });
    }

    return <DefinitionList className={styles.metaInfo} items={
        metaInfoItemsWithResolvedUrls.map((item) => {
            if (item.url) {
                return {
                    name: item.label,
                    content: <a data-suite-view-link={item.url} target="_blank" href={item.url} rel="noreferrer">
                        {item.content}
                    </a>,
                    copyText: item.copyText ?? item.content
                };
            }

            return {
                name: item.label,
                content: item.content,
                copyText: item.copyText ?? item.content
            };
        })
    }/>;
}

export const MetaInfo = connect(
    ({tree, config: {metaInfoBaseUrls}, apiValues, view}: State, {resultId}: MetaInfoProps) => {
        const result = tree.results.byId[resultId];
        const browser = tree.browsers.byId[result.parentId];

        return {
            result,
            testName: browser.parentId,
            metaInfoBaseUrls,
            apiValues,
            baseHost: view.baseHost
        };
    }
)(MetaInfoInternal);
