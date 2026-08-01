FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY public ./public

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main.js"]
