FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    git make g++ pkg-config \
    libssl-dev libminizip-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/zhlynn/zsign.git /tmp/zsign \
    && cd /tmp/zsign/build/linux \
    && make clean && make \
    && cp zsign /usr/local/bin/zsign \
    && chmod +x /usr/local/bin/zsign \
    && rm -rf /tmp/zsign

RUN npm install -g pnpm

WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]
