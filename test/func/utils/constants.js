module.exports = {
    GRID_URL: 'http://localhost:4444/wd/hub/',
    CHROME_BINARY_PATH: '/home/circleci/browsers/chrome-linux/chrome',
    PORTS: {
        'hermione-eye': {
            server: 8081,
            gui: 8071
        },
        'hermione-gui': {
            server: 8082,
            gui: 8072
        }
    }
};
