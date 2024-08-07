'use strict';

import React, {Fragment, useEffect, useState} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import ResizedScreenshot from '../screenshot/resized';
import SwipeDiff from './swipe-diff';
import SwitchDiff from './switch-diff';
import OnionSkinDiff from './onion-skin-diff';
import {DiffModes} from '../../../../constants/diff-modes';
import {types} from '../../modals';
import useFitImages from './useFitImages';

import './index.styl';
import {Tabs} from '@gravity-ui/uikit';

const StateFail = ({image, diffMode: diffModeProp, isScreenshotAccepterOpened}) => {
    const [diffMode, setDiffMode] = useState(diffModeProp);
    const [fitWidths, {expectedRef, actualRef}] = useFitImages(image, isScreenshotAccepterOpened);

    useEffect(() => {
        setDiffMode(diffModeProp);
    }, [diffModeProp, setDiffMode]);

    const renderDiffModeItems = () => {
        return (
            <div className="diff-modes">
                <Tabs activeTab={diffMode} items={Object.values(DiffModes)} onSelectTab={(mode) => setDiffMode(mode)} size='m'/>
            </div>
        );
    };

    const getLabelKey = () => {
        const images = [image.expectedImg, image.actualImg];
        const sizes = images.map(image => `${image.size.width}${image.size.height}`);
        const key = sizes.join('');

        return key;
    };

    const drawImageBox = (image, {label, diffClusters, width, ref} = {}) => {
        const titleText = `${label} (${image.size.width}x${image.size.height})`;
        const titleKey = getLabelKey();

        return (
            <div className="image-box__image" style={{flex: image.size.width}}>
                {label && !isScreenshotAccepterOpened && <div key={titleKey} ref={ref} className="image-box__title">{titleText}</div>}
                <ResizedScreenshot
                    image={image}
                    diffClusters={diffClusters}
                    overrideWidth={width}
                />
            </div>
        );
    };

    const renderOnlyDiff = () => {
        const {diffImg, diffClusters} = image;

        return drawImageBox(diffImg, {diffClusters});
    };

    const drawExpectedAndActual = ({expectedImg, expectedWidth}, {actualImg, actualWidth}) => {
        return (
            <Fragment>
                {drawImageBox(expectedImg, {label: 'Expected', width: expectedWidth, ref: expectedRef})}
                {drawImageBox(actualImg, {label: 'Actual', width: actualWidth, ref: actualRef})}
            </Fragment>
        );
    };

    const renderThreeImages = (fitWidths = []) => {
        const {expectedImg, actualImg, diffImg, diffClusters} = image;
        const [expectedWidth, actualWidth, diffWidth] = fitWidths;

        return <Fragment>
            {drawExpectedAndActual({expectedImg, expectedWidth}, {actualImg, actualWidth})}
            {drawImageBox(diffImg, {label: 'Diff', diffClusters, width: diffWidth})}
        </Fragment>;
    };

    const renderImages = () => {
        const {expectedImg, actualImg} = image;

        switch (diffMode) {
            case DiffModes.ONLY_DIFF.id:
                return renderOnlyDiff();

            case DiffModes.SWITCH.id:
                return <SwitchDiff image1={expectedImg} image2={actualImg} />;

            case DiffModes.SWIPE.id:
                return <SwipeDiff image1={expectedImg} image2={actualImg} />;

            case DiffModes.ONION_SKIN.id:
                return <OnionSkinDiff image1={expectedImg} image2={actualImg} />;

            case DiffModes.THREE_UP_SCALED.id:
                return <div className="image-box__scaled">
                    {renderThreeImages()}
                </div>;

            case DiffModes.THREE_UP_SCALED_TO_FIT.id:
                return <div className="image-box__scaled">
                    {renderThreeImages(fitWidths)}
                </div>;

            case DiffModes.THREE_UP.id:
            default:
                return renderThreeImages();
        }
    };

    return (
        <Fragment>
            {!isScreenshotAccepterOpened && renderDiffModeItems()}
            {renderImages()}
        </Fragment>
    );
};

StateFail.propTypes = {
    image: PropTypes.shape({
        expectedImg: PropTypes.object.isRequired,
        actualImg: PropTypes.object.isRequired,
        diffImg: PropTypes.object.isRequired,
        diffClusters: PropTypes.array,
        size: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number
        })
    }).isRequired,
    // from store
    diffMode: PropTypes.string,
    isScreenshotAccepterOpened: PropTypes.bool.isRequired
};

export default connect(
    ({modals, view}) => {
        const diffMode = view.diffMode;
        const isScreenshotAccepterOpened = modals.some(modal => modal.id === types.SCREENSHOT_ACCEPTER);

        return {diffMode, isScreenshotAccepterOpened};
    }
)(StateFail);
