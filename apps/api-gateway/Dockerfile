FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY apps/api-gateway/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY apps/api-gateway/server.js ./
EXPOSE 8080
CMD ["npm", "start"]
