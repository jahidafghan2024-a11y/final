FROM node:20-bullseye-slim

# Install build tools + zsign dependencies
RUN apt-get update && apt-get install -y \
    git make g++ pkg-config \
    libssl-dev libminizip-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Build zsign from source (Linux build lives in build/linux/)
RUN git clone --depth 1 https://github.com/zhlynn/zsign.git /tmp/zsign \
    && cd /tmp/zsign/build/linux \
    && make clean && make \
    && cp zsign /usr/local/bin/zsign \
    && chmod +x /usr/local/bin/zsign \
    && rm -rf /tmp/zsign

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN pnpm install

# Copy source and build
COPY . .
RUN pnpm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]
