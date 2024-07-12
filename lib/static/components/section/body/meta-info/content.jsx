import path from 'path';
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { ClipboardButton } from '@gravity-ui/uikit';
import { DefinitionList } from '@gravity-ui/components';
import PropTypes from 'prop-types';
import { map, mapValues, isObject, omitBy, isEmpty } from 'lodash';
import { isUrl, getUrlWithBase } from '../../../../../common-utils';

const mkTextWithClipboardButton = (text, url) => {
    return <Fragment>
        {url ? <a data-suite-view-link={url} className="custom-icon_view-local" target="_blank" href={url}>
            {text || url}
        </a> : text}
        <ClipboardButton text={url || text} size='s' className='copy-button' />
    </Fragment>;
}

const serializeMetaValues = (metaInfo) => mapValues(metaInfo, (v) => isObject(v) ? JSON.stringify(v) : v);

const resolveUrl = (baseUrl, value) => {
    const parsedBaseUrl = new URL(baseUrl);
    const baseSearchParams = new URLSearchParams(parsedBaseUrl.search);
    if (baseSearchParams) {
        parsedBaseUrl.search = '';
    }

    const resolvedUrl = new URL(value, parsedBaseUrl.href);

    for (let [key, value] of baseSearchParams) {
        resolvedUrl.searchParams.append(key, value);
    }

    return resolvedUrl.href;
};

const metaToElements = (metaInfo, metaInfoBaseUrls) => {
    return <DefinitionList className='meta-info' itemClassName='meta-info__item' items={
        map(metaInfo, (value, key) => {
            let url = value.url;
            value = value.content;
            if (isUrl(value)) {
                url = value;
            } else if (metaInfoBaseUrls[key]) {
                const baseUrl = metaInfoBaseUrls[key];
                const link = isUrl(baseUrl) ? resolveUrl(baseUrl, value) : path.join(baseUrl, value);
                url = link;
            } else if (typeof value === 'boolean') {
                value = value.toString();
            }
            if (url) {
                value = <a data-suite-view-link={url} className="custom-icon_view-local" target="_blank" href={url}>
                    {value}
                </a>
            }
            return {
                name: key,
                content: <div className="meta-info__item-value">{value}</div>,
                copyText: url || value
            }
        })
    }/>
};

class MetaInfoContent extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        // from store
        result: PropTypes.shape({
            metaInfo: PropTypes.object.isRequired,
            suiteUrl: PropTypes.string.isRequired
        }).isRequired,
        testName: PropTypes.string.isRequired,
        metaInfoBaseUrls: PropTypes.object.isRequired,
        apiValues: PropTypes.shape({
            extraItems: PropTypes.object.isRequired,
            metaInfoExtenders: PropTypes.object.isRequired
        }).isRequired,
        baseHost: PropTypes.string
    };

    getExtraMetaInfo = () => {
        const { testName, apiValues: { extraItems, metaInfoExtenders } } = this.props;

        return omitBy(mapValues(metaInfoExtenders, (extender) => {
            const stringifiedFn = extender.startsWith('return') ? extender : `return ${extender}`;

            return new Function(stringifiedFn)()({ testName }, extraItems);
        }), isEmpty);
    };

    render() {
        const { result, metaInfoBaseUrls, baseHost } = this.props;

        const serializedMetaValues = serializeMetaValues(result.metaInfo);
        const extraMetaInfo = this.getExtraMetaInfo();
        const formattedMetaInfo = {
            ...serializedMetaValues,
            ...extraMetaInfo
        };
        Object.keys(formattedMetaInfo).forEach((key) => {
            formattedMetaInfo[key] = {content: formattedMetaInfo[key]}
        })
        if (result.suiteUrl) {
            formattedMetaInfo.url = {content: result.metaInfo.url || result.suiteUrl, url: getUrlWithBase(result.suiteUrl, baseHost)}
        }

        return metaToElements(formattedMetaInfo, metaInfoBaseUrls);
    }
}

export default connect(
    ({ tree, config: { metaInfoBaseUrls }, apiValues, view }, { resultId }) => {
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
)(MetaInfoContent);
