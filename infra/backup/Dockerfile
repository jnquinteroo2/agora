FROM alpine:3.20

RUN apk add --no-cache \
    postgresql16-client \
    age \
    curl \
    bash \
    dcron

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f", "-l", "8"]
