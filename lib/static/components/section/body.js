'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import SwitcherStyle from './switcher-style';
import SwitcherRetry from './switcher-retry';
import State from '../state';

class SectionBrowserBody extends Component {
    static propTypes = {
        result: PropTypes.object.isRequired,
        retries: PropTypes.array
    }

    static defaultProps = {
        retries: []
    }

    constructor(props) {
        super(props);

        this.state = {
            color: 1,
            retry: this.props.retries.length
        };

        this.onSwitcherStyleChange = this.onSwitcherStyleChange.bind(this);
        this.onSwitcherRetryChange = this.onSwitcherRetryChange.bind(this);
    }

    onSwitcherStyleChange(index) {
        this.setState({color: index});
    }

    onSwitcherRetryChange(index) {
        this.setState({retry: index});
    }

    render() {
        const {result, retries} = this.props;
        const active = retries
            .concat(result)
            .filter((attempt, index) => index === this.state.retry)[0];

        return (
            <div className="section__body">
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <SwitcherStyle onChange={this.onSwitcherStyleChange}/>
                    <SwitcherRetry onChange={this.onSwitcherRetryChange} retries={retries}/>
                    <div className="tab">
                        <div className="tab__item tab__item_active">
                            <State state={active}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default SectionBrowserBody;

