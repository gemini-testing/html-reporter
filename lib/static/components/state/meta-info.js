'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Parser from 'html-react-parser';
import _ from 'lodash';

export default class MetaInfo extends Component {
    static propTypes = {
        metaInfo: PropTypes.string.isRequired
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
        const metaInfoHtml = MetaInfo._stringifyMeta({
            url: MetaInfo._mkLinkToUrl(suiteUrl, url),
            file,
            sessionId
        });

        return (
            <div className={className}>
                <div onClick={this._toggleState} className="meta-info__switcher">Meta-info</div>
                <div className="meta-info__content">
                    {Parser(metaInfoHtml)}
                </div>
            </div>
        );
    }

    _toggleState(event) {
        this.setState({collapsed: !this.state.collapsed});
        event.preventDefault();
    }

    static _mkLinkToUrl(url, text) {
        return `<a data-suite-view-link="${url}" class="section__icon_view-local" target="_blank" href="${url}">${text}</a>`;
    }

    static _stringifyMeta(obj) {
        return _(obj)
            .map((value, key) => `<div class="meta-info__item"><span class="meta-info__item-key">${key}</span>: ${value}</div>`)
            .join('');
    }
}
