FROM docker.io/library/node:22.11.0-alpine
WORKDIR /app
COPY server.mjs index.html package.json ./
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
