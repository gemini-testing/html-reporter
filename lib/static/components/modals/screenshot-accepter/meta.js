import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';

import MetaInfoContent from '../../section/body/meta-info/content';

export default class ScreenshotAccepterMeta extends Component {
    static propTypes = {
        showMeta: PropTypes.bool.isRequired,
        resultId: PropTypes.string.isRequired
    }

    render() {
        const {showMeta, resultId} = this.props;

        if (!showMeta) {
            return (<Fragment></Fragment>);
        }

        return (
            <Fragment>
                <div className="screenshot-accepter__meta container">
                    <MetaInfoContent
                        resultId={resultId}
                    />
                </div>
                <hr className='tab__separator' />
            </Fragment>
        );
    }
}
