FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 当前上游代码会在 build 阶段初始化 OpenAI SDK，
# 所以这里必须有一个 OPENAI_API_KEY；假值也可以。
ARG OPENAI_API_KEY=dummy
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/generated-images

EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]