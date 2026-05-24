FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY packages/contracts ./packages/contracts
COPY services/scoring-service/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/scoring-service/server.js ./
EXPOSE 5003
CMD ["npm", "start"]
