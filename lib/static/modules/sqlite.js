const createDb = initSqlJs().then(async function(SQL) {
    return await fetchDb('sqlite.db');

    function fetchDb(url = 'sqlite.db') {
        return new Promise((resolve) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                let uInt8Array = new Uint8Array(this.response);
                resolve(new SQL.Database(uInt8Array));
            };
            xhr.send();
        });
    }
});

module.exports = {
    createDb
};
