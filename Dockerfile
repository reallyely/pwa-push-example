FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY domain/package.json ./domain/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install

COPY backend ./backend
COPY domain ./domain
COPY frontend ./frontend
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY domain/package.json ./domain/package.json
RUN npm install --omit=dev

COPY --from=build /app/backend/dist ./backend/dist
COPY domain ./domain
COPY --from=build /app/frontend/dist/frontend/browser ./frontend/dist/frontend/browser

ENV PORT=8080
EXPOSE 8080

CMD ["node", "backend/dist/main.js"]
