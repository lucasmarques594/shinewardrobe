FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build application
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun build src/index.ts --outdir ./dist --target bun

# Production stage
FROM base AS production
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 8080

CMD ["bun", "src/index.ts"]