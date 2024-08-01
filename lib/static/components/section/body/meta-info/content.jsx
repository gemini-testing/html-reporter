import path from 'path';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {DefinitionList} from '@gravity-ui/components';
import PropTypes from 'prop-types';
import {map, mapValues, isObject, omitBy, isEmpty} from 'lodash';
import {isUrl, getUrlWithBase, getRelativeUrl} from '../../../../../common-utils';

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
            } else if (metaInfoBaseUrls[key] && metaInfoBaseUrls[key] !== 'auto') {
                const baseUrl = metaInfoBaseUrls[key];
                const link = isUrl(baseUrl) ? resolveUrl(baseUrl, value) : path.join(baseUrl, value);
                url = link;
            } else if (typeof value === 'boolean') {
                value = value.toString();
            }

            if (url) {
                value = <a data-suite-view-link={url} className="custom-icon_view-local" target="_blank" href={url} rel="noreferrer">
                    {value}
                </a>;
            }

            return {
                name: key,
                content: <div className="meta-info__item-value">{value}</div>,
                copyText: url || value
            };
        })
    }/>;
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
        const {testName, apiValues: {extraItems, metaInfoExtenders}} = this.props;

        return omitBy(mapValues(metaInfoExtenders, (extender) => {
            const stringifiedFn = extender.startsWith('return') ? extender : `return ${extender}`;

            return new Function(stringifiedFn)()({testName}, extraItems);
        }), isEmpty);
    };

    render() {
        const {result, metaInfoBaseUrls, baseHost} = this.props;

        const serializedMetaValues = serializeMetaValues(result.metaInfo);
        const extraMetaInfo = this.getExtraMetaInfo();
        const formattedMetaInfo = {
            ...serializedMetaValues,
            ...extraMetaInfo
        };
        Object.keys(formattedMetaInfo).forEach((key) => {
            formattedMetaInfo[key] = {content: formattedMetaInfo[key]};
        });

        for (const [key, value] of Object.entries(formattedMetaInfo)) {
            if (isUrl(value.content) && (key === 'url' || metaInfoBaseUrls[key] === 'auto')) {
                formattedMetaInfo[key] = {
                    content: getRelativeUrl(value.content),
                    url: getUrlWithBase(getRelativeUrl(value.content), baseHost)
                };
            }
        }
        if (!formattedMetaInfo.url && result.suiteUrl) {
            formattedMetaInfo.url = {
                content: getRelativeUrl(result.suiteUrl),
                url: getUrlWithBase(getRelativeUrl(result.suiteUrl), baseHost)
            };
        }

        return metaToElements(formattedMetaInfo, metaInfoBaseUrls);
    }
}

export default connect(
    ({tree, config: {metaInfoBaseUrls}, apiValues, view}, {resultId}) => {
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
