import _ from 'lodash';
import { INode } from 'typings/node';
import { IField } from 'typings/data';
import { IBrowser } from 'typings/suite-adapter';
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('../constants/test-statuses');

function getDataFrom(node: INode, {fieldName = '', fromFields}: IField) {
    if (!fromFields) {
        return [].concat(_.get(node, fieldName, []));
    }

    const {result = {}, retries = {}} = _.pick(node, fromFields);

    return _.isEmpty(result) && _.isEmpty(retries)
        ? walk(node, (n: INode) => getDataFrom(n, {fieldName, fromFields}), _.flatMap)
        : (new Array<any>()).concat(_.get(result, fieldName, []), _.flatMap(retries, fieldName));
}

function getImagePaths(node: INode, fromFields: any) {
    return _(getDataFrom(node, {fieldName: 'imagesInfo', fromFields}))
        .map((imageInfo) => _.pick(imageInfo, ['expectedPath', 'actualPath', 'diffPath']))
        .reject(_.isEmpty)
        .flatMap(_.values)
        .value();
}

function getStatNameForStatus(status: string) {
    const statusToStat: {[key: string]: string} = {
        [SUCCESS]: 'passed',
        [FAIL]: 'failed',
        [ERROR]: 'failed',
        [SKIPPED]: 'skipped'
    };

    return statusToStat[status];
}

function walk(node: INode, cb: any, fn: (browsers: IBrowser[], cb: any) => any): any[] {
    return node.browsers && fn(node.browsers, cb) || node.children && fn(node.children, cb) || [];
}

module.exports = {
    getDataFrom,
    getImagePaths,
    getStatNameForStatus
};
