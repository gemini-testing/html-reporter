const os = require('os');
const path = require('path');
const downloadChromium = require('hermione-headless-chrome/lib/download-chromium-by-version');

downloadChromium(process.env.CHROME_VERSION, path.join(os.homedir(), 'chrome-cache'), 10)
    .then(chromePath => console.log(chromePath));
