const express = require('express');

const dir = process.env.STATIC_DIR;
const port = process.env.PORT;
const host = process.env.HOST ?? 'localhost';

const app = express();
app.use(express.static(dir));
app.listen(port, (err) => {
    if (err) {
        console.error('Failed to start test server:');
        throw new Error(err);
    }

    process.send('Ready');
    console.info(`Server is listening on ${host}:${port}`);
});
