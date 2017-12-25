'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazy-load';

export default class Screenshot extends Component {
    static propTypes = {
        imagePath: PropTypes.string.isRequired
    }

    constructor(props) {
        super(props);
        const url = this.props.imagePath
            .split('/')
            .map((item) => encodeURIComponent(item))
            .join('/');
        this.state = {url};
    }

    render() {
        return (
            <LazyLoad offsetVertical={800}>
                <img src={this.state.url}/>
            </LazyLoad>
        );
    }
}
