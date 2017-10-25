'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Parser from 'html-react-parser';

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

        return (
            <div className={className}>
                <div onClick={this._toggleState} className="meta-info__switcher">Meta-info</div>
                <div className="meta-info__content">
                    {Parser(this.props.metaInfo)}
                </div>
            </div>
        );
    }

    _toggleState(event) {
        this.setState({collapsed: !this.state.collapsed});
        event.preventDefault();
    }
}
