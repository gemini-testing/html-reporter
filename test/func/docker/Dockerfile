FROM node:18-slim

ARG DEBIAN_FRONTEND=noninteractive

ARG BUILDPLATFORM

ENV CHROMIUM_VERSION="126.0.6478.126-1~deb12u1"
ENV ARM_CHROMEDRIVER_URL="https://github.com/electron/electron/releases/download/v31.1.0/chromedriver-v31.1.0-linux-arm64.zip"
ENV ARM_CHROMEDRIVER_RELATIVE_PATH=""
ENV AMD_CHROMEDRIVER_URL="https://storage.googleapis.com/chrome-for-testing-public/126.0.6478.126/linux64/chromedriver-linux64.zip"
ENV AMD_CHROMEDRIVER_RELATIVE_PATH="/chromedriver-linux64"

RUN if [ "$BUILDPLATFORM" = "linux/arm64" ]; then export RELATIVE_PATH="$ARM_CHROMEDRIVER_RELATIVE_PATH"; export URL="$ARM_CHROMEDRIVER_URL"; \
    else export RELATIVE_PATH="$AMD_CHROMEDRIVER_RELATIVE_PATH"; export URL="$AMD_CHROMEDRIVER_URL"; fi && \
    apt-get update -y && \
    apt-get install -y wget unzip && \
    wget "$URL" -O "chromedriver.zip" && \
    unzip "chromedriver" && \
    if [ "$RELATIVE_PATH" != "" ]; then mv "$RELATIVE_PATH/chromedriver" "/chromedriver"; fi && \
    apt update -y && \
    apt install libnss3 -y && \
    rm chromedriver.zip && \
    (rm chromedriver.debug || true) && \
    apt-get install chromium="$CHROMIUM_VERSION" -y

LABEL com.circleci.preserve-entrypoint=true

ENTRYPOINT ./chromedriver --port=4444 --whitelisted-ips=""
