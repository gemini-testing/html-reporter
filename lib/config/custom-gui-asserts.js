'use strict';

const {isUndefined, isArray, isEmpty, isFunction, isPlainObject, isString} = require('lodash');

const SUPPORTED_CONTROL_TYPES = Object.values(require('../gui/constants/custom-gui-control-types'));

const assertSectionGroupType = (context, type) => {
    if (isUndefined(type)) {
        throw new Error(`${context} must contain field "type"`);
    }
    if (!isString(type)) {
        throw new Error(`${context} must contain string in the field "type"`);
    }
    if (!SUPPORTED_CONTROL_TYPES.includes(type)) {
        throw new Error(`${context} can contain in the field "type" only ${SUPPORTED_CONTROL_TYPES.join(', ')}`);
    }
};

const assertSectionGroupControls = (context, controls) => {
    if (isUndefined(controls)) {
        throw new Error(`${context} must contain field "controls"`);
    }
    if (!isArray(controls)) {
        throw new Error(`${context} must contain array in the field "controls"`);
    }
    if (isEmpty(controls)) {
        throw new Error(`${context} must contain non-empty array in the field "controls"`);
    }
    controls.forEach((control) => {
        if (!isPlainObject(control)) {
            throw new Error(`${context} must contain objects in the array "controls"`);
        }
    });
};

const assertSectionGroupAction = (context, action) => {
    if (isUndefined(action)) {
        throw new Error(`${context} must contain field "action"`);
    }
    if (!isFunction(action)) {
        throw new Error(`${context} must contain function in the field "action"`);
    }
};

const assertSectionGroup = (sectionName, group, groupIndex) => {
    const context = `customGui["${sectionName}"][${groupIndex}]`;

    if (!isPlainObject(group)) {
        throw new Error(`${context} must be plain object, but got ${typeof group}`);
    }

    assertSectionGroupType(context, group.type);
    assertSectionGroupControls(context, group.controls);
    assertSectionGroupAction(context, group.action);
};

const assertSection = (section, sectionName) => {
    if (!isArray(section)) {
        throw new Error(`customGui["${sectionName}"] must be an array, but got ${typeof section}`);
    }
    section.forEach((group, groupIndex) => assertSectionGroup(sectionName, group, groupIndex));
};

const assertCustomGui = (customGui) => {
    if (!isPlainObject(customGui)) {
        throw new Error(`"customGui" option must be plain object, but got ${typeof customGui}`);
    }
    for (const sectionName in customGui) {
        assertSection(customGui[sectionName], sectionName);
    }
};

module.exports = {
    assertCustomGui
};
