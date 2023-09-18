FROM cimg/node:16.20-browsers

ENV CHROME_VERSION=116

USER circleci

COPY --chown=circleci browser-utils browser-utils
WORKDIR browser-utils

RUN npm ci && npm run install-chromium

RUN npm install selenium-standalone@9.1.1 -g && \
    selenium-standalone install --drivers.chrome.version=$CHROME_VERSION

ENTRYPOINT selenium-standalone start --drivers.chrome.version=$CHROME_VERSION
