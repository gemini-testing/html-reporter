import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import MetaInfo from './meta-info';
import Description from './description';
import Tabs from './tabs';

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
        const {result, testName} = this.props;

        return (
            <Fragment>
                <MetaInfo result={result} testName={testName} />
                {result.description && <Description content={result.description} />}
                <Tabs result={result} />
            </Fragment>
        );
    }
}

export default connect(
    ({tree}, {resultId}) => ({result: tree.results.byId[resultId]})
)(Result);
