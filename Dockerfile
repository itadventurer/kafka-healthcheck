FROM node:8-alpine

RUN apk --no-cache add \
      bash \
      g++ \
      ca-certificates \
      lz4-dev \
      musl-dev \
      cyrus-sasl-dev \
      openssl-dev \
      make \
      python

RUN apk add --no-cache --virtual .build-deps gcc zlib-dev libc-dev bsd-compat-headers py-setuptools bash

# Create app directory
RUN mkdir -p /usr/local/app

# Move to the app directory
WORKDIR /usr/local/app

EXPOSE 8080

COPY nodemon.json /usr/local/app
COPY tsconfig.json /usr/local/app/
COPY package.json /usr/local/app/
COPY yarn.lock /usr/local/app
RUN yarn

COPY src /usr/local/app/src/

RUN yarn build
ENTRYPOINT ["node", "./dist/kafka-healthcheck.js"]
