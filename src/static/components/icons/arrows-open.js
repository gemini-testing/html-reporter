import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class ArrowsOpen extends Component {
    static propTypes = {
        width: PropTypes.number,
        height: PropTypes.number
    }

    static defaultProps = {
        width: 15,
        height: 14
    }

    render() {
        const {width, height} = this.props;
        const maxSize = Math.max(width, height);

        return (
            <svg className="arrows-open" width={width} height={height} viewBox={`0 0 ${maxSize} ${maxSize}`} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="arrows-open__icon" d="M11.302 1.789v-.324l-1.15.315A6.258 6.258 0 018.502 2c-.6 0-1-.448-1-1.001a1 1 0 011-1h4.5a1 1 0 011 1v4.505a1 1 0 01-1 1c-.552 0-1-.403-1-1 0-.56.075-1.117.222-1.656l.313-1.147h-.32l-1.078 1.437a10 10 0 01-.93 1.072L9.205 6.213a1 1 0 11-1.414-1.414l1.004-1.004c.332-.332.688-.641 1.064-.923l1.442-1.083zm-8.6 10.418v.323l1.15-.314a6.259 6.259 0 011.65-.221c.6 0 1 .447 1 1a1 1 0 01-1 1h-4.5a1 1 0 01-1-1V8.492a1 1 0 011-1c.552 0 1 .403 1 1 0 .56-.075 1.116-.222 1.656l-.313 1.147h.32l1.078-1.437a10 10 0 01.93-1.072l1.003-1.002a1 1 0 011.414 1.414l-1.004 1.004a9.994 9.994 0 01-1.064.923l-1.442 1.083z" fill="#000" />
            </svg>
        );
    }
}
