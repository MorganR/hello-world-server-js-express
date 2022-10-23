FROM node:19

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
CMD [ "node", "index.js" ]
