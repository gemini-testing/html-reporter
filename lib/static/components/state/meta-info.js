'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import ToggleOpen from './toggle-open';

const mkLinkToUrl = (url, text) => {
    return <a data-suite-view-link={url} className="section__icon_view-local" target="_blank" href={url}>{text}</a>;
};

const metaToElements = (metaInfo) => {
    return map(metaInfo, (value, key) => {
        return <div key = {key} className="toggle-open__item"><span className="toggle-open__item-key">{key}</span>: {value}</div>;
    });
};

export default class MetaInfo extends Component {
    static propTypes = {
        metaInfo: PropTypes.object.isRequired,
        suiteUrl: PropTypes.string.isRequired
    }

    render() {
        const {metaInfo: {url, file, sessionId}, suiteUrl} = this.props;
        const metaElements = metaToElements({
            url: mkLinkToUrl(suiteUrl, url),
            file,
            sessionId
        });

        return (
            <Fragment>
                <ToggleOpen title='Meta-info' content={metaElements}/>
            </Fragment>
        );
    }
}
