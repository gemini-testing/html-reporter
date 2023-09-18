#!/usr/bin/env bash

# The download script outputs progress messages, but we need only final path, hence we filter output here
CHROME_PATH=$(node ./download-chromium.js |& grep '^/home')
CHROME_PATH=$(dirname $CHROME_PATH)
mkdir ~/browsers
mv $CHROME_PATH ~/browsers/chrome-linux
