FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY policies ./policies
EXPOSE 5005
CMD ["npm", "start"]
