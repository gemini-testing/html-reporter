let initSql;

try {
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
                        case 200:
                            let uInt8Array = new Uint8Array(this.response);
                            resolve(new SQL.Database(uInt8Array));
                        case 404:
                            resolve(null);
                    }
                }
            };
            xhr.send();
        });
    });
}

async function mergeDbs(dbs) {
    if (!initSql) {
        return null;
    }
    return initSql().then(async function(SQL) {
        const outputDb = new SQL.Database();
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
