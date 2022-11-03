FROM ubuntu:20.04

RUN rm /bin/sh && ln -s /bin/bash /bin/sh
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN wget https://deb.nodesource.com/setup_17.x && chmod +x ./setup_17.x && ./setup_17.x
RUN apt-get install -y nodejs

RUN npm install -g yarn

ADD . /app

WORKDIR /app/

WORKDIR /app
EXPOSE 3000
RUN yarn install --cache-folder ./.yarncache
RUN export NODE_OPTIONS=--openssl-legacy-provider && yarn build
CMD node dist
