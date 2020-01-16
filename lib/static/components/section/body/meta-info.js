'use strict';

import path from 'path';
import url from 'url';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {map, mapValues, isObject} from 'lodash';
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
        }

        return <div key = {key} className="meta-info__item"><span className="meta-info__item-key">{key}</span>: {value}</div>;
    });
};

class MetaInfo extends Component {
    static propTypes = {
        metaInfo: PropTypes.object.isRequired,
        suiteUrl: PropTypes.string.isRequired,
        getExtraMetaInfo: PropTypes.func.isRequired,
        metaInfoBaseUrls: PropTypes.object.isRequired
    };

    render() {
        const {metaInfo, suiteUrl, getExtraMetaInfo, metaInfoBaseUrls} = this.props;
        const serializedMetaValues = serializeMetaValues(metaInfo);
        const extraMetaInfo = getExtraMetaInfo();
        const formattedMetaInfo = {
            ...serializedMetaValues,
            ...extraMetaInfo,
            url: mkLinkToUrl(suiteUrl, metaInfo.url)
        };

        const metaElements = metaToElements(formattedMetaInfo, metaInfoBaseUrls);

        return <Details title='Meta-info' content={metaElements} extendClassNames='details_type_text'/>;
    }
}

export default connect(
    ({reporter: state}) => ({
        metaInfoBaseUrls: state.config.metaInfoBaseUrls
    })
)(MetaInfo);
