#!/bin/sh
set -e

# ChromaDB URL 기본값 설정
CHROMA_URL=${CHROMA_URL:-http://localhost:8000}

echo "ChromaDB URL: $CHROMA_URL"

# nginx.conf 템플릿에서 환경변수 치환
envsubst '${CHROMA_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Nginx 시작
exec nginx -g 'daemon off;'
