'use-strict';

import {PureComponent} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {IDLE, RUNNING, SUCCESS, FAIL} from '../../constants/test-statuses';

const GREY = '#ccc';
const GREEN = '#038035';
const RED = '#c00';
const YELLOW = '#e7d700';

class FaviconStatus extends PureComponent {
    static propTypes = {
        running: PropTypes.bool,
        isFailedSuiteExist: PropTypes.bool
    }

    constructor(props) {
        super(props);
        this.notRunning = true;
        this.link = document.head.querySelector('link[rel="icon"]');
    }

    getFaviconURL(color) {
        const canvas = document.createElement('canvas');
        const diameter = 32;
        const circeSize = diameter / 3;

        canvas.height = diameter;
        canvas.width = diameter;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.arc(diameter / 2, diameter / 2, circeSize, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        return canvas.toDataURL('image/png');
    }

    changeIconColor(color) {
        this.link.setAttribute('href', this.getFaviconURL(color));
    }

    getSuiteStatus = () => {
        const {running, isFailedSuiteExist} = this.props;

        if (running) {
            this.notRunning = false;
            return RUNNING;
        }

        if (this.notRunning) {
            return IDLE;
        }

        if (isFailedSuiteExist) {
            return FAIL;
        }

        return SUCCESS;
    }

    render() {
        switch (this.getSuiteStatus()) {
            case RUNNING:
                this.changeIconColor(YELLOW);
                break;
            case FAIL:
                this.changeIconColor(RED);
                break;
            case SUCCESS:
                this.changeIconColor(GREEN);
                break;
            default:
                this.changeIconColor(GREY);
        }

        return null;
    }
}

export default connect(
    ({reporter: {running, suiteIds}}) => ({
        running,
        isFailedSuiteExist: Boolean(suiteIds.failed.length)
    })
)(FaviconStatus);
