FROM node:20-alpine
WORKDIR /app
COPY packages/platform-auth ./packages/platform-auth
COPY services/aml-service/package.json ./
RUN sed -i 's|file:../../packages|file:./packages|g' package.json
RUN npm install --omit=dev
COPY services/aml-service/server.js ./
COPY services/aml-service/data ./data
EXPOSE 5007
CMD ["npm", "start"]
