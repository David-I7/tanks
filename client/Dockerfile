FROM node:26.5-trixie-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/app/.npm \
    npm set cache /app/.npm && \
    npm ci

COPY . .

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-trixie-perl as nginx

COPY --link --from=base /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY --link --from=base /app/dist /usr/share/nginx/html

EXPOSE 8080 8443