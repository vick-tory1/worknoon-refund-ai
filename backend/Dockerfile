FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p database

EXPOSE 5000

CMD ["sh", "-c", "node database/seed.js && node server.js"]