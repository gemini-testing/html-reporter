const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = class SqliteAdapter {

    static create(pluginConfig, dbName) {
        return new this(pluginConfig, dbName);
    }

    constructor(pluginConfig, dbName) {
        console.log("created db at: " + dbName);
        this._dbConn = null;
        this._pluginConfig = pluginConfig;
        this._dbName = dbName;
    }

    init() { // TODO: add exceptions handlers
        this._dbConn = new sqlite3.Database(path.join(this._pluginConfig.path, this._dbName));
        console.log('db connection opened');
        this._createTable();
        return this;
    }

    close() {
        console.log('closing db connection');
        return this._dbConn.close();
    }

    write(testResult) {
        const testResultObj = this._parseTestResult(testResult);
        const values = this._createValuesArray(testResultObj);
        const error = this._insert(values);
        console.log("error");
        console.log(error);

    }

    _parseTestResult(testResult) {
        return {
            suitePath: testResult.suitePath,
            suiteName: testResult.suiteName,
            // ...testResult.testResult
            name: testResult.testResult.name,
            suitUrl: testResult.testResult.suiteUrl,
            metaInfo: testResult.testResult.metaInfo,
            description: testResult.testResult.description,
            error: testResult.testResult.error,
            skipReason: testResult.testResult.skipReason,
            imagesInfo: testResult.testResult.imagesInfo,
            screenshot: testResult.testResult.screenshot,
            multipleTabs: testResult.testResult.multipleTabs,
            status: testResult.testResult.status,
            attempt: testResult.testResult.attempt
        };
    }

    _createValuesArray(testResult) {
        const values = [];

        for (let key in testResult) {
            if (testResult.hasOwnProperty(key)) {
                if (testResult[key] === undefined || testResult[key] === null) {
                    values.push(null);
                } else {
                    switch (testResult[key].constructor) {
                        case Array:
                        case Object:
                            values.push(JSON.stringify(testResult[key]));
                            break;
                        case Boolean:
                            values.push(testResult[key] ? 1 : 0);
                            break;
                        default:
                            values.push(testResult[key]);
                    }
                }
            }
        }
        return values;
    }

    _insert(values) {
        this._dbConn.run(`INSERT INTO suites VALUES (${values.map(value => "?").join(", ")})`, values, err => {

            if (err) {
                return err.message;
            }
            return (`Rows inserted ${this.changes}`);
        });
    }

    _createTable() { // TODO: dont forget to change metaInfo to one field in other places
        this._dbConn.run('CREATE TABLE suites (suitePath TEXT, suiteName TEXT, name TEXT, suiteUrl TEXT,  metaInfo TEXT, description TEXT, error TEXT, skipReason TEXT, imagesInfo TEXT, screenshot INT, multipleTabs INT, status TEXT, resultAttempt INT)');
    }
};
