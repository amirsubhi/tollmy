FROM node:18-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY api/     api/
COPY lib/     lib/
COPY data/    data/

EXPOSE 3000

ENV PORT=3000 NODE_ENV=production

CMD ["node", "api/server.js"]
