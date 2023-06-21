import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class ArrowsMove extends Component {
    static propTypes = {
        width: PropTypes.number,
        height: PropTypes.number
    }

    static defaultProps = {
        width: 100,
        height: 100
    }

    render() {
        const {width, height} = this.props;

        return (
            <svg className="arrows-move" width={width} height={height} viewBox={`-8 -3 16 6`} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="arrows-move__icon" d="M -5 -2 L -7 0 L -5 2 M 5 -2 L 7 0 L 5 2" fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
        );
    }
}
