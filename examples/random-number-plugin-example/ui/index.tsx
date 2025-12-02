import produce from "immer";

import { mkReducers } from "./reducers";
import { RandomNumberPlugin } from "./Plugin";

// Reducers are optional. If you don't need to work with redux store, you can just use empty array
const reducers = mkReducers(produce);

// Export the plugin interface expected by html-reporter
// The component name here must match what's specified in the preset config
export default {
    RandomNumberPlugin,
    reducers,
};

