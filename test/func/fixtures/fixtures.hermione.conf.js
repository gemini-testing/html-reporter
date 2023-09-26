const path = require('path');
const _ = require('lodash');

global.assert = require('chai').assert;

const {getCommonConfig} = require('../common.hermione.conf');
const {PORTS} = require('../utils/constants');

module.exports.getFixturesConfig = (projectDir, projectName) => {
    const PROJECT_NAME = projectName ?? require(path.join(projectDir, 'package.json')).name;
    console.log('project name: ' + PROJECT_NAME);

    const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
    const serverPort = process.env.SERVER_PORT ?? PORTS[PROJECT_NAME].server;
    const fixturesPath = 'report';

    return _.merge(getCommonConfig(projectDir), {
        baseUrl: `http://${serverHost}:${serverPort}/fixtures/${PROJECT_NAME}/index.html`,

        sets: {
            fixtures: {
                files: '**/*.hermione.js'
            }
        },

        plugins: {
            'html-reporter-test-server': {
                enabled: true,
                port: serverPort
            },
            'html-reporter-tester': {
                enabled: true,
                path: fixturesPath
            }
        }
    });
};
