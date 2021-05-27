import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class ArrowsClose extends Component {
    static propTypes = {
        width: PropTypes.number,
        height: PropTypes.number
    }

    static defaultProps = {
        width: 16,
        height: 16
    }

    render() {
        const {width, height} = this.props;
        const maxSize = Math.max(width, height);

        return (
            <svg className="arrows-close" width={width} height={height} viewBox={`0 0 ${maxSize} ${maxSize}`} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="arrows-close__icon" d="M4.302 10.789v-.324l-1.15.315a6.259 6.259 0 01-1.65.221c-.6 0-1-.448-1-1.001a1 1 0 011-1h4.5a1 1 0 011 1v4.505a1 1 0 01-1 1c-.553 0-1-.403-1-1 0-.56.074-1.117.222-1.656l.313-1.147h-.32l-1.079 1.437c-.284.379-.595.737-.93 1.072l-1.002 1.002a1 1 0 11-1.414-1.414l1.004-1.004a9.994 9.994 0 011.064-.923l1.442-1.083zm7.4-5.582v.323l1.15-.314a6.258 6.258 0 011.65-.221c.6 0 1 .447 1 1a1 1 0 01-1 1h-4.5a1 1 0 01-1-1V1.492a1 1 0 011-1c.552 0 1 .403 1 1 0 .56-.075 1.116-.222 1.656l-.314 1.147h.321l1.078-1.437c.284-.379.595-.737.93-1.072L13.798.783a1 1 0 111.413 1.414l-1.003 1.004a9.992 9.992 0 01-1.064.923l-1.442 1.083z" fill="#000" />
            </svg>
        );
    }
}
