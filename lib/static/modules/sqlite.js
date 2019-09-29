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

module.exports = {
    createDb
};
