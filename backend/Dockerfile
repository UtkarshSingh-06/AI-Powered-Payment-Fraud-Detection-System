FROM node:20-alpine

WORKDIR /app

COPY packages/contracts ./packages/contracts
COPY packages/platform-kafka ./packages/platform-kafka
COPY packages/platform-auth ./packages/platform-auth
COPY packages/feature-schema ./packages/feature-schema
COPY backend/package*.json ./
RUN sed -i 's|file:../packages|file:./packages|g' package.json
RUN npm install --omit=dev

COPY backend/ .

RUN mkdir -p data

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
