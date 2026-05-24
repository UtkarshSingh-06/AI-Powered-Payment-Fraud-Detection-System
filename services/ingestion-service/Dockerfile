FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY services/ingestion-service/package.json ./
COPY packages/contracts ./packages/contracts
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/ingestion-service/server.js ./
EXPOSE 5002
CMD ["npm", "start"]
