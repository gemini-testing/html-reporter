'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const utils = require('../server-utils');
const {SUCCESS, FAIL, ERROR, UPDATED} = require('../constants/test-statuses');
const globalCacheAllImages = new Map();

module.exports = class TestAdapter {
    static create(testResult = {}, tool, status, noAttempt) {
        return new this(testResult, tool, status, noAttempt);
    }

    constructor(testResult) {
        this._testResult = testResult;
    }

    get suite() {
        return this._suite;
    }

    get sessionId() {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId() {
        return this._testResult.browserId;
    }

    get imagesInfo() {
        return this._testResult.imagesInfo;
    }

    set imagesInfo(imagesInfo) {
        this._testResult.imagesInfo = imagesInfo;
    }

    _getImgFromStorage(imgPath) {
        // fallback for gemini
        return globalCacheAllImages.get(imgPath) || imgPath;
    }

    getImagesFor(status, stateName) {
        const refImg = this.getRefImg(stateName);
        const currImg = this.getCurrImg(stateName);
        const errImg = this.getErrImg();

        const refPath = utils.getReferencePath(this, stateName);
        const currPath = utils.getCurrentPath(this, stateName);
        const diffPath = utils.getDiffPath(this, stateName);

        if (status === SUCCESS || status === UPDATED) {
            return {expectedImg: {path: this._getImgFromStorage(refPath), size: refImg.size}};
        }

        if (status === FAIL) {
            return {
                expectedImg: {
                    path: this._getImgFromStorage(refPath),
                    size: refImg.size
                },
                actualImg: {
                    path: this._getImgFromStorage(currPath),
                    size: currImg.size
                },
                diffImg: {
                    path: this._getImgFromStorage(diffPath),
                    size: {
                        width: _.max([_.get(refImg, 'size.width'), _.get(currImg, 'size.width')]),
                        height: _.max([_.get(refImg, 'size.height'), _.get(currImg, 'size.height')])
                    }
                }
            };
        }

        if (status === ERROR) {
            return {
                actualImg: {
                    path: this.state ? this._getImgFromStorage(currPath) : '',
                    size: currImg.size || errImg.size
                }
            };
        }

        return {};
    }

    async saveBase64Screenshot(reportPath) {
        if (!this.screenshot.base64) {
            utils.logger.warn('Cannot save screenshot on reject');

            return Promise.resolve();
        }

        const currPath = utils.getCurrentPath(this);
        const localPath = path.resolve(tmp.tmpdir, currPath);
        await utils.makeDirFor(localPath);
        await fs.writeFile(localPath, new Buffer(this.screenshot.base64, 'base64'), 'base64');

        return this._saveImg(localPath, currPath, reportPath);
    }

    async _saveImg(localPath, destPath, reportDir) {
        if (!localPath) {
            return Promise.resolve();
        }

        const res = await this._imagesSaver.saveImg(localPath, {destPath, reportDir});

        globalCacheAllImages.set(destPath, res || destPath);
        return res;
    }
};
