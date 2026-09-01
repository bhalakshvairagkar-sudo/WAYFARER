FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install
RUN npm --prefix server install
RUN npm --prefix client install

# Copy source files
COPY . .

# Build frontend production bundle
RUN npm --prefix client run build

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server/server.js"]
