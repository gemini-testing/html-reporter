'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class ToggleOpen extends Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        content: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string])
    }

    state = {
        isCollapsed: true
    }

    render() {
        const {title, content, extendClassNames} = this.props;
        const className = classNames(
            'toggle-open',
            {'toggle-open_collapsed': this.state.isCollapsed},
            extendClassNames
        );

        return (
            <div className={className}>
                <div onClick={this.toggleHandler} className="toggle-open__switcher">{title}</div>
                <div className="toggle-open__content">{content}</div>
            </div>
        );
    }

    toggleHandler = (event) => {
        event.preventDefault();
        this.setState({
            isCollapsed: !this.state.isCollapsed
        });
    }
}
