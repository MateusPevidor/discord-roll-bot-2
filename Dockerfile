FROM node:18

WORKDIR /usr/src/discord-bot

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
ENV NODE_ENV=production
ENV TS_NODE_TRANSPILE_ONLY=true
CMD [ "pnpm", "start" ]
