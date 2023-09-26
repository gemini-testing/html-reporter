#!/usr/bin/env node

const {PORTS} = require('./constants');

const projectName = process.argv[2];
const context = process.argv[3];

process.stdout.write(PORTS[projectName][context]?.toString());
