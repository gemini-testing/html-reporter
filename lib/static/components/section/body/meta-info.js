'use strict';

import url from 'url';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map, mapValues, isObject} from 'lodash';
import ToggleOpen from '../../toggle-open';

const mkLinkToUrl = (url, text = url) => {
    return <a data-suite-view-link={url} className="section__icon_view-local" target="_blank" href={url}>{text}</a>;
};

const isUrl = (str) => {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return parsedUrl.host && parsedUrl.protocol;
};

const serializeMetaValues = (metaInfo) => mapValues(metaInfo, (v) => isObject(v) ? JSON.stringify(v) : v);

const metaToElements = (metaInfo) => {
    return map(metaInfo, (value, key) => {
        if (isUrl(value)) {
            value = mkLinkToUrl(value);
        }

        return <div key = {key} className="toggle-open__item"><span className="toggle-open__item-key">{key}</span>: {value}</div>;
    });
};

export default class MetaInfo extends Component {
    static propTypes = {
        metaInfo: PropTypes.object.isRequired,
        suiteUrl: PropTypes.string.isRequired,
        getExtraMetaInfo: PropTypes.func.isRequired
    };

    render() {
        const {metaInfo, suiteUrl, getExtraMetaInfo} = this.props;
        const serializedMetaValues = serializeMetaValues(metaInfo);
        const extraMetaInfo = getExtraMetaInfo();
        const formattedMetaInfo = {
            ...serializedMetaValues,
            ...extraMetaInfo,
            url: mkLinkToUrl(suiteUrl, metaInfo.url)
        };
        const metaElements = metaToElements(formattedMetaInfo);

        return <ToggleOpen title='Meta-info' content={metaElements} extendClassNames="toggle-open_type_text"/>;
    }
}
