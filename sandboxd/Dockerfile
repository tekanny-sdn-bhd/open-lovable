FROM node:20-bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    chromium \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile || true

CMD ["bash"]
