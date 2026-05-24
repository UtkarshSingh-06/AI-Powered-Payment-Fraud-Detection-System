FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY packages/platform-kafka ./packages/platform-kafka
COPY services/notification-service/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/notification-service/server.js ./
EXPOSE 5006
CMD ["npm", "start"]
