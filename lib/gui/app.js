'use strict';

const path = require('path');
const _ = require('lodash');
const looksSame = require('looks-same');
const Promise = require('bluebird');
const ToolRunnerFactory = require('./tool-runner-factory');

const lookSameAsync = (img1, img2, opts) => {
    return new Promise((resolve, reject) => {
        looksSame(img1, img2, opts, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
};

module.exports = class App {
    static create(paths, tool, configs) {
        return new this(paths, tool, configs);
    }

    constructor(paths, tool, configs) {
        const {program, pluginConfig} = configs;

        this._tool = ToolRunnerFactory.create(program.name(), paths, tool, configs);
        this._pluginConfig = pluginConfig;

        this._browserConfigs = [];
        this._retryCache = {};
    }

    initialize() {
        return this._tool.initialize();
    }

    finalize() {
        this._tool.finalize();
    }

    run(tests) {
        return _.isEmpty(tests)
            ? this._tool.run()
            : this._runWithoutRetries(tests);
    }

    _runWithoutRetries(tests) {
        if (_.isEmpty(this._browserConfigs)) {
            this._browserConfigs = _.map(this._tool.config.getBrowserIds(), (id) => this._tool.config.forBrowser(id));
        }

        this._disableRetries();

        return this._tool.run(tests)
            .finally(() => this._restoreRetries());
    }

    updateReferenceImage(failedTests = []) {
        return this._tool.updateReferenceImage(failedTests);
    }

    _resolveImgPath(imgPath) {
        return path.resolve(process.cwd(), this._pluginConfig.path, imgPath);
    }

    _getCompareOpts() {
        const {tolerance, antialiasingTolerance} = this._tool.config;

        return {tolerance, antialiasingTolerance, stopOnFirstFail: true, shouldCluster: false};
    }

    async findEqualDiffs(imagesInfo) {
        const [refImagesInfo, ...comparedImagesInfo] = imagesInfo;
        const compareOpts = this._getCompareOpts();

        return await Promise.filter(comparedImagesInfo, async (imageInfo) => {
            try {
                await Promise.mapSeries(imageInfo.diffClusters, async (diffCluster, i) => {
                    const refComparisonRes = await lookSameAsync(
                        {source: this._resolveImgPath(refImagesInfo.expectedImg.path), boundingBox: refImagesInfo.diffClusters[i]},
                        {source: this._resolveImgPath(imageInfo.expectedImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!refComparisonRes.equal) {
                        return Promise.reject(false);
                    }

                    const actComparisonRes = await lookSameAsync(
                        {source: this._resolveImgPath(refImagesInfo.actualImg.path), boundingBox: refImagesInfo.diffClusters[i]},
                        {source: this._resolveImgPath(imageInfo.actualImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!actComparisonRes.equal) {
                        return Promise.reject(false);
                    }
                });

                return true;
            } catch (err) {
                return err === false ? err : Promise.reject(err);
            }
        });
    }

    addClient(connection) {
        this._tool.addClient(connection);
    }

    get data() {
        return this._tool.tree;
    }

    _disableRetries() {
        this._browserConfigs.forEach((broConfig) => {
            this._retryCache[broConfig.id] = broConfig.retry;
            broConfig.retry = 0;
        });
    }

    _restoreRetries() {
        this._browserConfigs.forEach((broConfig) => {
            broConfig.retry = this._retryCache[broConfig.id];
        });
    }
};
