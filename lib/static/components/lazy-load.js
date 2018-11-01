'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class LazyLoad extends Component {
    static propTypes = {
        offsetVertical: PropTypes.number.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            inView: false
        };
    }

    _startObservation() {
        if (this.state.inView) {
            return;
        }
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.setState({
                    inView: true
                });
                this._stopObservation();
            }
        }, {
            rootMargin: `${this.props.offsetVertical}px 0px`
        });
        this.observer.observe(this.refs.target);
    }

    _stopObservation() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    componentDidMount() {
        this._startObservation();
    }

    componentWillUnmount() {
        this._stopObservation();
    }

    componentDidUpdate() {
        this._stopObservation();
        this._startObservation();
    }

    render() {
        const {inView} = this.state;
        const {children} = this.props;

        return (
            <div ref='target'>
                {inView ? children : null}
            </div>
        );
    }
}
