"use strict";

module.exports = {
    extension: ["js", "jsx", "ts", "tsx"],
    recursive: true,
    require: [
        "./test/setup/ts-node.js",
        "./test/setup/globals.js",
        "./test/setup/assert-ext.js",
        "./test/setup/configure-testing-library.js"
    ],
};
