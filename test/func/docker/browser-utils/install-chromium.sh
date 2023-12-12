#!/usr/bin/env bash

CHROME_PATH=$(node ./download-chromium.js)
mkdir ~/browsers
mv $CHROME_PATH ~/browsers/chrome-linux
chmod +x ~/browsers/chrome-linux/chrome
