"use strict";

module.exports = {
    recursive: true,
    require: ["./test/ts-node", "jsdom-global/register", "./test/setup", "./test/assert-ext"],
};
