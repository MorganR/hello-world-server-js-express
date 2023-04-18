FROM node:19-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
CMD [ "node", "index.js", "--max-old-space-size", "80"]
