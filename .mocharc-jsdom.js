"use strict";

module.exports = {
    extension: ["js", "jsx", "ts", "tsx"],
    recursive: true,
    require: [
        "./test/setup/ts-node",
        "./test/setup/jsdom",
        "./test/setup/globals",
        "./test/setup/assert-ext",
        "./test/setup/configure-testing-library"
    ],
};
