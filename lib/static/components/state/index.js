'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import MetaInfo from './meta-info';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import Description from './description';

export default class State extends Component {
    static propTypes = {
        state: PropTypes.shape({
            suiteUrl: PropTypes.string.isRequired,
            metaInfo: PropTypes.object.isRequired,
            error: PropTypes.bool,
            success: PropTypes.bool,
            fail: PropTypes.bool,
            image: PropTypes.bool,
            reason: PropTypes.string,
            expectedPath: PropTypes.string,
            actualPath: PropTypes.string,
            diffPath: PropTypes.string,
            description: PropTypes.string
        })
    }

    render() {
        const {suiteUrl, metaInfo, error, success, fail, reason, image,
            expectedPath, actualPath, diffPath, description} = this.props.state;

        let elem = null;

        if (error) {
            elem = <StateError image={Boolean(image)} actual={actualPath} reason={reason}/>;
        } else if (success) {
            elem = <StateSuccess expected={expectedPath}/>;
        } else if (fail) {
            elem = <StateFail expected={expectedPath} actual={actualPath} diff={diffPath}/>;
        }

        return (
            <Fragment>
                <MetaInfo metaInfo={metaInfo} suiteUrl={suiteUrl}/>
                {description && <Description content={description} />}
                {elem}
            </Fragment>
        );
    }
}
