#!/bin/sh
set -e

CERT_DIR="/app/certs"
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"

# 证书目录不存在则创建
mkdir -p "$CERT_DIR"

# 无证书时自动生成自签名证书（有效期10年，供局域网HTTPS使用）
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "未检测到TLS证书，正在生成自签名证书..."
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 3650 \
    -subj "/CN=ChordFlow LAN" \
    -addext "subjectAltName=IP:127.0.0.1,IP:0.0.0.0,DNS:localhost"
  echo "证书已生成: ${CERT_FILE}"
fi

exec node packages/backend/dist/index.js
