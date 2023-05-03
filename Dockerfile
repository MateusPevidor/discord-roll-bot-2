FROM node:18

WORKDIR /usr/src/discord-bot

COPY . /usr/src/discord-bot
RUN pwd
RUN ls -la
RUN cat package.json
RUN which npm
RUN npm i --production

CMD [ "npm", "run", "start" ]