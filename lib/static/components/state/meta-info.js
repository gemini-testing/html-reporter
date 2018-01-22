'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {map} from 'lodash';

const mkLinkToUrl = (url, text) => {
    return <a data-suite-view-link={url} className="section__icon_view-local" target="_blank" href={url}>{text}</a>;
};

const metaToElements = (metaInfo) => {
    return map(metaInfo, (value, key) => {
        return <div className="meta-info__item"><span className="meta-info__item-key">{key}</span>: {value}</div>;
    });
};

export default class MetaInfo extends Component {
    static propTypes = {
        metaInfo: PropTypes.object.isRequired,
        suiteUrl: PropTypes.string.isRequired
    }

    constructor(props) {
        super(props);
        this.state = {collapsed: true};
        this._toggleState = this._toggleState.bind(this);
    }

    render() {
        const className = classNames(
            'meta-info',
            {'meta-info_collapsed': this.state.collapsed}
        );

        const {url, file, sessionId} = this.props.metaInfo;
        const {suiteUrl} = this.props;
        const metaElements = metaToElements({
            url: mkLinkToUrl(suiteUrl, url),
            file,
            sessionId
        });

        return (
            <div className={className}>
                <div onClick={this._toggleState} className="meta-info__switcher">Meta-info</div>
                <div className="meta-info__content">
                    {metaElements}
                </div>
            </div>
        );
    }

    _toggleState(event) {
        this.setState({collapsed: !this.state.collapsed});
        event.preventDefault();
    }
}
