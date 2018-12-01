require('ts-node').register({
    project: require('path').resolve(__dirname, 'tsconfig.json')
});
module.exports = require('./hermione.ts');
