FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY services/case-service/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/case-service/server.js ./
EXPOSE 5004
CMD ["npm", "start"]
