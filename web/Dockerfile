# ---- Stage 1: build the static files ----------------------------------------
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite writes VITE_API_URL into the JavaScript *at build time*: the browser
# never reads an environment variable. So it is a build argument, not a
# runtime one. It is the address seen by the browser, not by the container.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: serve them ----------------------------------------------------
# No Node at all: a web server that hands out the files of dist/.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
