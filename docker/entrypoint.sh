#!/bin/sh

set -eu

cd /app

LOCKFILE="package-lock.json"
NODE_MODULES_DIR="node_modules"
NEXT_DIR=".next"
LOCK_HASH_FILE="$NODE_MODULES_DIR/.package-lock.sha256"
BUILD_MARKER="$NEXT_DIR/BUILD_ID"

mkdir -p "$NODE_MODULES_DIR" "$NEXT_DIR" generated-images data

if [ ! -f package.json ]; then
    echo "[entrypoint] 未找到 /app/package.json，请确认已将源码目录挂载到容器。"
    exit 1
fi

if [ ! -f "$LOCKFILE" ]; then
    echo "[entrypoint] 未找到 /app/$LOCKFILE，当前部署方式要求仓库包含 package-lock.json。"
    exit 1
fi

current_lock_hash="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
saved_lock_hash=""

if [ -f "$LOCK_HASH_FILE" ]; then
    saved_lock_hash="$(cat "$LOCK_HASH_FILE")"
fi

if [ ! -x "$NODE_MODULES_DIR/.bin/next" ] || [ "$current_lock_hash" != "$saved_lock_hash" ]; then
    echo "[entrypoint] 检测到依赖缺失或 package-lock.json 已变化，执行 npm ci..."
    npm ci --include=dev
    printf '%s' "$current_lock_hash" > "$LOCK_HASH_FILE"
else
    echo "[entrypoint] 依赖未变化，跳过 npm ci。"
fi

needs_build="false"

if [ ! -f "$BUILD_MARKER" ]; then
    needs_build="true"
else
    for path in package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs src public; do
        if [ ! -e "$path" ]; then
            continue
        fi

        if [ -d "$path" ]; then
            if find "$path" -type f -newer "$BUILD_MARKER" -print -quit | grep -q .; then
                needs_build="true"
                break
            fi
        elif [ "$path" -nt "$BUILD_MARKER" ]; then
            needs_build="true"
            break
        fi
    done
fi

if [ "$needs_build" = "true" ]; then
    echo "[entrypoint] 检测到源码或配置变化，执行 npm run build..."
    npm run build
else
    echo "[entrypoint] 构建产物仍然有效，跳过 npm run build。"
fi

echo "[entrypoint] 启动 Next.js..."
exec npm start -- --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
