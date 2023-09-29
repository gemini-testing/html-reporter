import {pick} from 'lodash';
import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import MetaInfo from './meta-info';
import History from './history';
import Description from './description';
import Tabs from './tabs';
import ExtensionPoint from '../../extension-point';
import {RESULT_META} from '../../../../constants/extension-points';
import {PageScreenshot} from './page-screenshot';
import * as projectPropTypes from '../../prop-types';

class Result extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        testName: PropTypes.string.isRequired,
        // from store
        result: PropTypes.shape({
            status: PropTypes.string.isRequired,
            imageIds: PropTypes.array.isRequired,
            description: PropTypes.string
        }).isRequired,
        pageScreenshot: PropTypes.shape({
            actualImg: projectPropTypes.ImageData.isRequired
        })
    };

    render() {
        const {result, resultId, testName, pageScreenshot} = this.props;

        return (
            <Fragment>
                <ExtensionPoint name={RESULT_META} result={result} testName={testName}>
                    <MetaInfo resultId={resultId}/>
                    <History resultId={resultId}/>
                </ExtensionPoint>
                {result.description && <Description content={result.description}/>}
                <Tabs result={result}/>
                {pageScreenshot && <hr className="tab__separator"/>}
                {pageScreenshot && <PageScreenshot image={pageScreenshot.actualImg}/>}
            </Fragment>
        );
    }
}

export default connect(
    ({tree}, {resultId}) => {
        const result = tree.results.byId[resultId];
        const images = Object.values(pick(tree.images.byId, result.imageIds));
        const pageScreenshot = images.find(image => !image.stateName && image.actualImg);

        return {result, pageScreenshot};
    }
)(Result);
