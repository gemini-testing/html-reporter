FROM node:18

ENV CHROME_VERSION=119

ARG DEBIAN_FRONTEND=noninteractive

ARG BUILDPLATFORM

RUN if [ "$BUILDPLATFORM" = "linux/arm64" ]; then export PREF=false; export URL="https://github.com/electron/electron/releases/download/v31.1.0/chromedriver-v31.1.0-linux-arm64.zip"; \
    else export PREF=true; export URL="https://storage.googleapis.com/chrome-for-testing-public/126.0.6478.126/linux64/chromedriver-linux64.zip"; fi && \
    wget "$URL" -O "chromedriver.zip" && \
    unzip "chromedriver" && \
    if [ "$PREF" = true ]; then mv "/chromedriver-linux64/chromedriver" "/chromedriver"; fi && \
    apt update -y && \
    apt install libnss3 -y

RUN npx playwright install chromium
RUN npx playwright install-deps

RUN apt-get install chromium=126.0.6478.126-1~deb12u1 -y

LABEL com.circleci.preserve-entrypoint=true

ENTRYPOINT ./chromedriver --port=4444 --whitelisted-ips=""
