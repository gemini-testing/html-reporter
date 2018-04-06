'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import MetaInfo from './meta-info';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import Description from './description';
import {isSuccessStatus, isFailStatus, isErroredStatus, isUpdatedStatus, isIdleStatus} from '../../../common-utils';

export default class State extends Component {
    static propTypes = {
        state: PropTypes.shape({
            suiteUrl: PropTypes.string.isRequired,
            metaInfo: PropTypes.object.isRequired,
            status: PropTypes.string,
            image: PropTypes.bool,
            reason: PropTypes.object,
            expectedPath: PropTypes.string,
            actualPath: PropTypes.string,
            diffPath: PropTypes.string,
            description: PropTypes.string
        })
    }

    render() {
        const {suiteUrl, metaInfo, status, reason, image,
            expectedPath, actualPath, diffPath, description} = this.props.state;

        let elem = null;

        if (isErroredStatus(status)) {
            elem = <StateError image={Boolean(image)} actual={actualPath} reason={reason}/>;
        } else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && expectedPath)) {
            elem = <StateSuccess status={status} expected={expectedPath} />;
        } else if (isFailStatus(status)) {
            elem = reason
                ? <StateError image={true} actual={actualPath} reason={reason}/>
                : <StateFail expected={expectedPath} actual={actualPath} diff={diffPath}/>;
        }

        return (
            <Fragment>
                <MetaInfo metaInfo={metaInfo} suiteUrl={suiteUrl}/>
                {description && <Description content={description}/>}
                {elem}
            </Fragment>
        );
    }
}
