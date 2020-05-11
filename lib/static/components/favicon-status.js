'use-strict';

import {PureComponent} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

const DEFAULT = 'default';
const SUCCESS = 'success';
const FAILED = 'fail';
const RUNNING = 'running';

class FaviconStatus extends PureComponent {
    static propTypes = {
        status: PropTypes.string
    }

    link = null;

    getFaviconURL(color) {
        const canvas = document.createElement('canvas');
        const diameter = 32;

        canvas.height = diameter;
        canvas.width = diameter;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.arc(diameter / 2, diameter / 2, diameter / 3, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        return canvas.toDataURL('image/png');
    }

    render() {
        const {status} = this.props;
        if (!this.link) {
            this.link = document.head.querySelector('link[rel="icon"]');
        }

        switch (status) {
            case RUNNING:
                this.link.setAttribute('href', this.getFaviconURL('#e7d700'));
                break;
            case FAILED:
                this.link.setAttribute('href', this.getFaviconURL('#c00'));
                break;
            case SUCCESS:
                this.link.setAttribute('href', this.getFaviconURL('#038035'));
                break;
            default:
                this.link.setAttribute('href', this.getFaviconURL('#ccc'));
        }

        return null;
    }
}

export default connect(
    ({reporter: {running, suiteIds}}) => {
        let status;
        if (running) {
            status = RUNNING;
        } else if (!suiteIds.all.length && !suiteIds.failed.length) {
            status = DEFAULT;
        } else if (suiteIds.failed.length) {
            status = FAILED;
        } else if (!suiteIds.failed.length) {
            status = SUCCESS;
        }

        return {
            status
        };
    }
)(FaviconStatus);
