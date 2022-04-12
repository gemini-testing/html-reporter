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

    constructor(props) {
        super(props);

        this._maxHeight = Math.max(props.image1.size.height, props.image2.size.height);
    }

    state = {imgTransparency: 0.5}

    _handleChangeTransparency = (e) => {
        return this.setState({imgTransparency: parseFloat(e.target.value)});
    }

    render() {
        const {image1, image2} = this.props;
        const {imgTransparency} = this.state;

        return (
            <div className='onion-skin-diff'>
                <div style={{height: this._maxHeight}}>
                    <FullScreenshot className='onion-skin-diff__img' image={image1} style={{opacity: imgTransparency, position: 'absolute'}} />
                    <FullScreenshot className='onion-skin-diff__img' image={image2} style={{opacity: 1 - imgTransparency, position: 'absolute'}} />
                </div>
                <input className='onion-skin-diff__slider' type="range" min={0} max={1} step={0.01} value={imgTransparency} onChange={this._handleChangeTransparency} />
            </div>
        );
    }
}
