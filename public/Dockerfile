FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY *.html *.js *.css *.png *.svg ./
COPY data ./data

ENV NODE_ENV=production

CMD ["npm", "start"]
