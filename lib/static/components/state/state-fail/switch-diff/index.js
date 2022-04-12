import React, {Component} from 'react';
import PropTypes from 'prop-types';
import FullScreenshot from '../../screenshot/full';

import './index.styl';

export default class SwipeDiff extends Component {
    static propTypes = {
        image1: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        image2: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired
    }

    state = {showFirst: true}

    _handleClick = () => this.setState({showFirst: !this.state.showFirst})

    render() {
        const {image1, image2} = this.props;
        const {showFirst} = this.state;

        return (
            <div className={'switch-diff'} onClick={this._handleClick} >
                <FullScreenshot className='switch-diff__img' image={image1} style={{display: showFirst ? 'inline-block' : 'none'}} />
                <FullScreenshot className='switch-diff__img' image={image2} style={{display: !showFirst ? 'inline-block' : 'none'}} />
            </div>
        );
    }
}
