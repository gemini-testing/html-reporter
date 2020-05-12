'use strict';

import React, {PureComponent} from 'react';
import classNames from 'classnames';

export default class ShowMore extends PureComponent {
    state = {
        collapsed: true
    };

    handleClick = () => {
        this.setState((state) => ({collapsed: !state.collapsed}));
    }

    render() {
        const {content} = this.props;
        const {collapsed} = this.state;
        const showMoreText = `Show ${collapsed ? 'more' : 'less'}`;
        const showMoreClassName = classNames(
            'show-more',
            {'show-more_collapsed': collapsed}
        );

        const contentElem = collapsed ? null : <div>{content}</div>;

        return (
            <div className={showMoreClassName}>
                {contentElem}
                <div className="show-more__toggler" onClick={this.handleClick}>{showMoreText}</div>
            </div>
        );
    }
}
