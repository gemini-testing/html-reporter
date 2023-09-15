'use strict';

const fs = require('fs/promises');
const path = require('path');
const util = require('util');
const _ = require('lodash');
const inquirer = require('inquirer');
const program = require('@gemini-testing/commander');

const exec = util.promisify(require('child_process').exec);

const tasks = [
    {project: 'hermione', task: () => exec('npx hermione', {cwd: path.resolve(__dirname, 'hermione')})},
    {project: 'plugins', task: async () => {
        const pluginNames = await fs.readdir('plugins');
        await Promise.all(pluginNames.map(pluginName =>
            exec('npm run build', {cwd: path.resolve(__dirname, 'hermione', pluginName)})
        ));

        return exec('npx hermione', {cwd: path.resolve(__dirname, 'plugins')});
    }}
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
            message: 'Select projects for which you want to generate fixture reports:',
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
