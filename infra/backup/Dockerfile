FROM postgres:18.6-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873

RUN apk add --no-cache age bash dcron

COPY backup.sh /usr/local/bin/backup.sh
COPY estado-respaldo.sh /usr/local/bin/estado-respaldo
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/estado-respaldo

RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

HEALTHCHECK --interval=5m --timeout=10s --start-period=15m --retries=1 \
  CMD ["/usr/local/bin/estado-respaldo"]

ENTRYPOINT []
CMD ["sh", "-c", "/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1; exec crond -f -l 8"]
