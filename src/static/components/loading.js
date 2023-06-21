'use-strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Dimmer, Loader} from 'semantic-ui-react';

export default class Loading extends Component {
    static propTypes = {
        active: PropTypes.bool,
        content: PropTypes.string
    }

    render() {
        const {props: {children, active, content = 'Loading...'}} = this;

        return (
            <Dimmer.Dimmable dimmed={active}>
                <Dimmer active={active} inverted page>
                    <Loader size="large" content={content} />
                </Dimmer>
                {children}
            </Dimmer.Dimmable>
        );
    }
}
