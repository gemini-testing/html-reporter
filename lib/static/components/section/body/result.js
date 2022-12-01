import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import MetaInfo from './meta-info';
import Description from './description';
import Tabs from './tabs';
import ExtensionPoint from '../../extension-point';
import {RESULT_META} from '../../../../constants/extension-points';

class Result extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        testName: PropTypes.string.isRequired,
        // from store
        result: PropTypes.shape({
            status: PropTypes.string.isRequired,
            imageIds: PropTypes.array.isRequired,
            description: PropTypes.string
        }).isRequired
    }

    render() {
        const {result, resultId, testName} = this.props;

        return (
            <Fragment>
                <ExtensionPoint name={RESULT_META} result={result} testName={testName}>
                    <MetaInfo resultId={resultId} />
                </ExtensionPoint>
                {result.description && <Description content={result.description} />}
                <Tabs result={result} />
            </Fragment>
        );
    }
}

export default connect(
    ({tree}, {resultId}) => ({result: tree.results.byId[resultId]})
)(Result);
