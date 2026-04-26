FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/generated-images /app/data

EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
