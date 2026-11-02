FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server.js ./
COPY *.html *.js *.css *.png *.svg ./
COPY slots ./slots
COPY data ./data

ENV NODE_ENV=production

CMD ["npm", "start"]
