#!/usr/bin/env node

const {PORTS} = require('./constants');

const projectName = process.argv[2];
const context = process.argv[3];

console.log(PORTS[projectName][context]);
