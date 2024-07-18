export const UNCHECKED = 0;
export const INDETERMINATE = 0.5;
export const CHECKED = 1;

export default {
    UNCHECKED,
    INDETERMINATE,
    CHECKED
};

export type CheckStatus = typeof UNCHECKED | typeof INDETERMINATE | typeof CHECKED;
