'use strict';

const path = require('path');
const util = require('util');
const _ = require('lodash');
const inquirer = require('inquirer');
const program = require('@gemini-testing/commander');

const exec = util.promisify(require('child_process').exec);

const tasks = [
    {
        project: 'hermione',
        task: () => exec('npx hermione --set common', {
            cwd: path.resolve(__dirname, 'hermione'),
            env: {...process.env, PROJECT_UNDER_TEST: 'hermione'}})
    },
    {
        project: 'plugins',
        task: () => exec('npx hermione --set plugins', {
            cwd: path.resolve(__dirname, 'plugins'),
            env: {...process.env, PROJECT_UNDER_TEST: 'plugins'}})
    }
];
const allProjects = tasks.map(_.property('project'));

(async () => {
    program
        .option('--all')
        .option('-p --project [value]', '')
        .parse(process.argv);

    let selectedProjects = [];
    if (program.all) {
        selectedProjects = allProjects;
    } else if (program.project) {
        selectedProjects = program.project;
    } else {
        const {projects} = await inquirer.prompt([{
            type: 'checkbox',
            name: 'projects',
            message: 'Select projects on which you want to run tests:',
            choices: allProjects
        }]);

        selectedProjects = projects;
    }

    if (selectedProjects.some(p => !allProjects.includes(p))) {
        throw new Error(`Project must be one of ${allProjects}`);
    }

    await Promise.all(tasks
        .filter(task => selectedProjects.includes(task.project))
        .map(task => task.task()));

    console.log('All done!');
})();
