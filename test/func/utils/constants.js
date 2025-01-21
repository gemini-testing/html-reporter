module.exports = {
    GRID_URL: 'http://127.0.0.1:4444/',
    CHROME_BINARY_PATH: '/usr/bin/chromium',
    PORTS: {
        testplane: {
            server: 8083,
            gui: 8073
        },
        'testplane-eye': {
            server: 8081,
            gui: 8071
        },
        'testplane-gui': {
            server: 8082,
            gui: 8072
        },
        plugins: {
            server: 8084,
            gui: 8074
        },
        analytics: {
            server: 8085,
            gui: 8075
        }
    }
};
