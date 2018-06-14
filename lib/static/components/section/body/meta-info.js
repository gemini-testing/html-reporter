'use strict';

import url from 'url';
import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import ToggleOpen from './toggle-open';

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
        suiteUrl: PropTypes.string.isRequired
    }

    render() {
        const {metaInfo, suiteUrl} = this.props;
        const formattedMetaInfo = Object.assign({}, metaInfo, {url: mkLinkToUrl(suiteUrl, metaInfo.url)});
        const metaElements = metaToElements(formattedMetaInfo);

        return (
            <Fragment>
                <ToggleOpen title='Meta-info' content={metaElements}/>
            </Fragment>
        );
    }
}
