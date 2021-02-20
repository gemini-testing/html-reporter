import path from 'path';
import url from 'url';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {map, mapValues, isObject, omitBy, isEmpty} from 'lodash';
import Details from '../../details';
import {isUrl} from '../../../modules/utils';

const mkLinkToUrl = (url, text = url) => {
    return <a data-suite-view-link={url} className="section__icon_view-local" target="_blank" href={url}>{text}</a>;
};

const serializeMetaValues = (metaInfo) => mapValues(metaInfo, (v) => isObject(v) ? JSON.stringify(v) : v);

const metaToElements = (metaInfo, metaInfoBaseUrls) => {
    return map(metaInfo, (value, key) => {
        if (isUrl(value)) {
            value = mkLinkToUrl(value);
        } else if (metaInfoBaseUrls[key]) {
            const baseUrl = metaInfoBaseUrls[key];
            const link = isUrl(baseUrl) ? url.resolve(baseUrl, value) : path.join(baseUrl, value);
            value = mkLinkToUrl(link, value);
        } else if (typeof value === 'boolean') {
            value = value.toString();
        }

        return <div key = {key} className="meta-info__item"><span className="meta-info__item-key">{key}</span>: {value}</div>;
    });
};

class MetaInfo extends Component {
    static propTypes = {
        result: PropTypes.shape({
            metaInfo: PropTypes.object.isRequired,
            suiteUrl: PropTypes.string.isRequired
        }).isRequired,
        testName: PropTypes.string.isRequired,
        // from store
        metaInfoBaseUrls: PropTypes.object.isRequired,
        apiValues: PropTypes.shape({
            extraItems: PropTypes.object.isRequired,
            metaInfoExtenders: PropTypes.object.isRequired
        }).isRequired
    };

    getExtraMetaInfo = () => {
        const {testName, apiValues: {extraItems, metaInfoExtenders}} = this.props;

        return omitBy(mapValues(metaInfoExtenders, (extender) => {
            const stringifiedFn = extender.startsWith('return') ? extender : `return ${extender}`;

            return new Function(stringifiedFn)()({testName}, extraItems);
        }), isEmpty);
    }

    _renderMetaInfo = () => {
        const {result, metaInfoBaseUrls} = this.props;

        const serializedMetaValues = serializeMetaValues(result.metaInfo);
        const extraMetaInfo = this.getExtraMetaInfo();
        const formattedMetaInfo = {
            ...serializedMetaValues,
            ...extraMetaInfo,
            url: mkLinkToUrl(result.suiteUrl, result.metaInfo.url)
        };

        return metaToElements(formattedMetaInfo, metaInfoBaseUrls);
    }

    render() {
        return <Details
            title='Meta'
            content={this._renderMetaInfo}
            extendClassNames='details_type_text'
        />;
    }
}

export default connect(
    ({config: {metaInfoBaseUrls}, apiValues}) => ({metaInfoBaseUrls, apiValues})
)(MetaInfo);
