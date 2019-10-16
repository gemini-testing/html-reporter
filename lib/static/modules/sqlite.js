'use strict';

import axios from 'axios';
import {createTableQuery} from '../../common-utils';

async function createDb(url) {
    return window.initSqlJs().then(async function(SQL) {
        try {
            const db = await axios.get(url, {
                responseType: 'arraybuffer'
            });
            const uInt8Array = new Uint8Array(db.data);
            return {
                connection: new SQL.Database(uInt8Array),
                size: uInt8Array.length,
                response: 200
            };
        } catch (e) {
            return {
                connection: null,
                response: e.response.status
            };
        }
    });
}

async function mergeDbs(dbs, sumOfChunkSizes) {
    return window.initSqlJs().then(async function(SQL) {
        const outputDb = new SQL.Database(undefined, sumOfChunkSizes);
        const pageSize = 65536; // maximum available page size of the database, helps to speed up queries
        outputDb.run('PRAGMA page_size = ' + pageSize);
        outputDb.run(createTableQuery());

        for (const db of dbs) {
            outputDb.run('ATTACH ' + db.filename + ' as attached');
            outputDb.run('INSERT OR IGNORE INTO suites SELECT * FROM attached.suites');
            outputDb.run('DETACH attached');
            db.close();
        }
        return outputDb;
    });
}

module.exports = {
    createDb,
    mergeDbs
};
