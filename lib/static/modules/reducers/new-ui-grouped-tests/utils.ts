import {
    GroupByExpression,
    GroupByMetaExpression,
    GroupByType,
    GroupEntity, ImageEntity,
    ResultEntity, State
} from '@/static/new-ui/types/store';
import {get, isNull, isObject, isString, isUndefined, toString} from 'lodash';
import {isAssertViewError} from '@/common-utils';
import stripAnsi from 'strip-ansi';

const stringify = (value: unknown): string => {
    if (isString(value)) {
        return value;
    }

    if (isObject(value)) {
        return JSON.stringify(value);
    }

    if (isNull(value)) {
        return 'null';
    }

    if (isUndefined(value)) {
        return 'undefined';
    }

    return toString(value);
};

const extractErrors = (result: ResultEntity, images: ImageEntity[]): string[] => {
    const IMAGE_COMPARISON_FAILED_MESSAGE = 'image comparison failed';

    const errors = new Set<string>();

    images.forEach((image) => {
        const imageErrorMessage = get(image, 'error.message');
        if (imageErrorMessage) {
            errors.add(imageErrorMessage);
        }

        if (get(image, 'diffImg')) {
            errors.add(IMAGE_COMPARISON_FAILED_MESSAGE);
        }
    });

    const {error} = result;

    if (errors.size > 0 && isAssertViewError(error)) {
        return [...errors];
    }

    const errorMessage = get(error, 'message');
    if (errorMessage) {
        errors.add(errorMessage);
    }

    return [...errors];
};

const groupTestsByMeta = (expr: GroupByMetaExpression, resultsById: Record<string, ResultEntity>): Record<string, GroupEntity> => {
    const DEFAULT_GROUP = `__${GroupByType.Meta}__DEFAULT_GROUP`;
    const results = Object.values(resultsById);
    const groups: Record<string | symbol, GroupEntity> = {};
    let id = 1;

    for (const result of results) {
        let groupingKey: string;
        if (!result.metaInfo || !result.metaInfo[expr.key]) {
            groupingKey = DEFAULT_GROUP;
        } else {
            groupingKey = `${GroupByType.Meta}__${expr.key}__${stringify(result.metaInfo[expr.key])}`;
        }

        if (!groups[groupingKey]) {
            groups[groupingKey] = {
                id: id.toString(),
                key: expr.key,
                label: stringify(result.metaInfo[expr.key]),
                resultIds: [],
                browserIds: []
            };
            id++;
        }

        groups[groupingKey].resultIds.push(result.id);
        if (!groups[groupingKey].browserIds.includes(result.parentId)) {
            groups[groupingKey].browserIds.push(result.parentId);
        }
    }

    return groups;
};

const groupTestsByError = (resultsById: Record<string, ResultEntity>, imagesById: Record<string, ImageEntity>, errorPatterns: State['config']['errorPatterns']): Record<string, GroupEntity> => {
    const groups: Record<string | symbol, GroupEntity> = {};
    const results = Object.values(resultsById);
    let id = 1;

    for (const result of results) {
        const images = result.imageIds.map((imageId) => imagesById[imageId]);
        const errors = extractErrors(result, images);

        for (const errorText of errors) {
            const pattern = errorPatterns.find(p => p.regexp.test(errorText));

            let groupingKey: string;
            let groupLabel: string;
            if (pattern) {
                groupLabel = pattern.name;
                groupingKey = `${GroupByType.Error}__${pattern.name}`;
            } else {
                groupLabel = errorText;
                groupingKey = `${GroupByType.Error}__${errorText}`;
            }

            if (!groups[groupingKey]) {
                groups[groupingKey] = {
                    id: id.toString(),
                    key: 'error',
                    label: stripAnsi(groupLabel),
                    resultIds: [],
                    browserIds: []
                };
                id++;
            }

            groups[groupingKey].resultIds.push(result.id);
            if (!groups[groupingKey].browserIds.includes(result.parentId)) {
                groups[groupingKey].browserIds.push(result.parentId);
            }
        }
    }

    return groups;
};

export const groupTests = (groupByExpressions: GroupByExpression[], resultsById: Record<string, ResultEntity>, imagesById: Record<string, ImageEntity>, errorPatterns: State['config']['errorPatterns']): Record<string, GroupEntity> => {
    const currentGroupByExpression = groupByExpressions[0];

    if (!currentGroupByExpression) {
        return {};
    }

    if (currentGroupByExpression.type === GroupByType.Meta) {
        return groupTestsByMeta(currentGroupByExpression, resultsById);
    }

    if (currentGroupByExpression.type === GroupByType.Error) {
        return groupTestsByError(resultsById, imagesById, errorPatterns);
    }

    return {};
};
