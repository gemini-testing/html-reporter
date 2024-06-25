FROM node:18-alpine3.18

ENV CHROME_VERSION=119

ARG DEBIAN_FRONTEND=noninteractive

RUN apk update
RUN apk upgrade
RUN apk add bash curl openrc iptables dbus openjdk11

RUN apk add chromium=119.0.6045.159-r0
RUN apk add chromium-chromedriver=119.0.6045.159-r0

ENTRYPOINT chromedriver --port=4444 --whitelisted-ips=""
