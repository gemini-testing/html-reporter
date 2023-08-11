"use strict";

module.exports = {
    extension: ["js", "jsx", "ts", "tsx"],
    recursive: true,
    require: ["./test/ts-node", "./test/setup", "./test/assert-ext", "jsdom-global/register"],
};
