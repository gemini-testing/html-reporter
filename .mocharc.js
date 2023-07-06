"use strict";

module.exports = {
    recursive: true,
    require: ["./test/ts-node", "./test/setup", "./test/assert-ext", "jsdom-global/register"],
};
