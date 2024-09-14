'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {isUpdatedStatus} from '../../../common-utils';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

export default class StateSuccess extends Component {
    static propTypes = {
        status: PropTypes.string.isRequired,
        expectedImg: PropTypes.object.isRequired
    };

    render() {
        const {status, expectedImg} = this.props;

        return (
            <Screenshot disableCache={isUpdatedStatus(status)} src={expectedImg.path} size={expectedImg.size} />
        );
    }
}
