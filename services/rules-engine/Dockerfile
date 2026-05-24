FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY services/rules-engine/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/rules-engine/server.js ./
COPY services/rules-engine/policies ./policies
EXPOSE 5005
CMD ["npm", "start"]
