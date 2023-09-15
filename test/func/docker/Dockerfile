FROM cimg/node:16.20-browsers

ENV CHROME_VERSION=116

USER circleci

COPY --chown=circleci browser-utils browser-utils
WORKDIR browser-utils

RUN npm ci && \
    # The download script outputs progress messages, but we need only final path, hence we filter output here
    CHROME_PATH=$(node ./download-chromium.js |& grep '^/home') && \
    CHROME_PATH=$(dirname $CHROME_PATH) && \
    mkdir ~/browsers && \
    mv $CHROME_PATH ~/browsers/chrome-linux

RUN npm install  selenium-standalone@9.1.1 -g && \
    selenium-standalone  install --drivers.chrome.version=$CHROME_VERSION

ENTRYPOINT selenium-standalone start --drivers.chrome.version=$CHROME_VERSION
