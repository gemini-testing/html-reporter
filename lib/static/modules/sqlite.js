let initSql;

try {
    // eslint-disable-next-line no-undef
    initSql = initSqlJs;
} catch (e) {
    initSql = undefined;
}

async function createDb(url) {
    if (!initSql) {
        return null;
    }
    return initSql().then(async function(SQL) {
        return new Promise((resolve) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    switch (xhr.status) {
                        case 200: {
                            let uInt8Array = new Uint8Array(this.response);
                            resolve(
                                {
                                    db: new SQL.Database(uInt8Array),
                                    size: uInt8Array.length,
                                    response: 200
                                });
                            break;
                        }
                        default: {
                            resolve(
                                {
                                    db: null,
                                    response: xhr.status
                                });
                        }
                    }
                }
            };
            xhr.send();
        });
    });
}

async function mergeDbs(dbs, sumOfChunkSizes) {
    if (!initSql) {
        return null;
    }
    return initSql().then(async function(SQL) {
        const outputDb = new SQL.Database(undefined, sumOfChunkSizes);
        outputDb.run('PRAGMA page_size = ' + 65536);
        outputDb.run('CREATE TABLE suites (' +
            ['suitePath TEXT',
                'suiteName TEXT',
                'name TEXT',
                'suiteUrl TEXT',
                'metaInfo TEXT',
                'description TEXT',
                'error TEXT',
                'skipReason TEXT',
                'imagesInfo TEXT',
                'screenshot INT', //boolean - 0 or 1
                'multipleTabs INT', //boolean - 0 or 1
                'status TEXT',
                'timestamp INT'].join(', ') + ')');

        for (let i = 0; i < dbs.length; i++) {
            outputDb.run('ATTACH ' + dbs[i].filename + ' as attached');
            outputDb.run('INSERT OR IGNORE INTO suites SELECT * FROM attached.suites');
            outputDb.run('DETACH attached');
            dbs[i].close();
        }
        return outputDb;
    });
}

module.exports = {
    createDb,
    mergeDbs
};
