import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class Arrow extends Component {
    static propTypes = {
        width: PropTypes.number,
        height: PropTypes.number
    }

    static defaultProps = {
        width: 12,
        height: 7
    }

    render() {
        const {width, height} = this.props;

        return (
            <svg width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="arrow-icon" d="M11 6L6 1 1 6" stroke="#000" />
            </svg>
        );
    }
}
