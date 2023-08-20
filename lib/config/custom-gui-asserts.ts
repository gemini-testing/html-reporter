import {isUndefined, isArray, isEmpty, isFunction, isPlainObject, isString} from 'lodash';
import CustomGuiControlTypes from '../gui/constants/custom-gui-control-types';

const SUPPORTED_CONTROL_TYPES: string[] = Object.values(CustomGuiControlTypes);

const assertSectionGroupType = (context: string, type: unknown): void => {
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

const assertSectionGroupControls = (context: string, controls: unknown): void => {
    if (isUndefined(controls)) {
        throw new Error(`${context} must contain field "controls"`);
    }
    if (!isArray(controls)) {
        throw new Error(`${context} must contain array in the field "controls"`);
    }
    if (isEmpty(controls)) {
        throw new Error(`${context} must contain non-empty array in the field "controls"`);
    }
    controls.forEach((control: unknown) => {
        if (!isPlainObject(control)) {
            throw new Error(`${context} must contain objects in the array "controls"`);
        }
    });
};

const assertSectionGroupAction = (context: string, action: unknown): void => {
    if (isUndefined(action)) {
        throw new Error(`${context} must contain field "action"`);
    }
    if (!isFunction(action)) {
        throw new Error(`${context} must contain function in the field "action"`);
    }
};

const assertSectionGroup = (sectionName: string, group: unknown, groupIndex: number): void => {
    const context = `customGui["${sectionName}"][${groupIndex}]`;

    if (!isPlainObject(group)) {
        throw new Error(`${context} must be plain object, but got ${typeof group}`);
    }

    const groupObj = group as Record<string, unknown>;

    assertSectionGroupType(context, groupObj.type);
    assertSectionGroupControls(context, groupObj.controls);
    assertSectionGroupAction(context, groupObj.action);
};

const assertSection = (section: unknown, sectionName: string): void => {
    if (!isArray(section)) {
        throw new Error(`customGui["${sectionName}"] must be an array, but got ${typeof section}`);
    }
    section.forEach((group: unknown, groupIndex: number) => assertSectionGroup(sectionName, group, groupIndex));
};

export const assertCustomGui = (customGui: unknown): void => {
    if (!isPlainObject(customGui)) {
        throw new Error(`"customGui" option must be plain object, but got ${typeof customGui}`);
    }

    const customGuiObj = customGui as Record<string, unknown>;

    for (const sectionName in customGuiObj) {
        assertSection(customGuiObj[sectionName], sectionName);
    }
};
