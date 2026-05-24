FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY services/sandbox-simulator/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/sandbox-simulator/server.js ./
EXPOSE 5008
CMD ["npm", "start"]
