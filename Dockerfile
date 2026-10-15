# ASUKA 訂位確認生成器 — 純靜態單檔工具,用 nginx 提供服務
FROM nginx:alpine

# 移除預設站台,放入我們的設定與工具本體
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY staff.js /usr/share/nginx/html/staff.js
COPY robots.txt /usr/share/nginx/html/robots.txt

EXPOSE 80

# 用 127.0.0.1 (IPv4) 而非 localhost,避免容器內走 IPv6 而 nginx 只監聽 IPv4
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1
