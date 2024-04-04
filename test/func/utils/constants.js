module.exports = {
    GRID_URL: 'http://localhost:4444/wd/hub/',
    CHROME_BINARY_PATH: '/home/circleci/browsers/chrome-linux/chrome',
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
        }
    }
};
