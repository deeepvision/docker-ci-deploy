FROM node:12-alpine

LABEL maintainer="s.sadovyi@deepvision.team"

ENV \
    TZ=Europe/Kiev \
    TERM=xterm \
    # Node options
    TS_NODE_PROJECT=/tsconfig.json \
    NODE_PATH=/usr/local/lib/node_modules \
    # https://github.com/sgerrand/alpine-pkg-glibc/releases
    GLIBC_VERSION=2.30-r0 \
    # https://storage.googleapis.com/kubernetes-release/release/stable.txt
    KUBE_VERSION=1.17.1 \
    # https://github.com/digitalocean/doctl/releases
    DOCTL_VERSION=1.37.0 \
    # https://github.com/docker/compose/releases
    COMPOSE_VERSION=1.25.1 \
    LD_LIBRARY_PATH=/lib:/usr/lib

RUN \
    apk upgrade --no-cache && \
    apk add --no-cache --virtual=build-dependencies curl && \
    apk add --no-cache bash && \
    cd /tmp && \
    \
    # Install glibc
    wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VERSION}/glibc-${GLIBC_VERSION}.apk && \
    apk add glibc-${GLIBC_VERSION}.apk && \
    \
    # Install Kubectl
    curl -L https://storage.googleapis.com/kubernetes-release/release/v${KUBE_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    \
    # Install Doctl
    curl -L https://github.com/digitalocean/doctl/releases/download/v${DOCTL_VERSION}/doctl-${DOCTL_VERSION}-linux-amd64.tar.gz  | tar xz && \
    mv ./doctl /usr/local/bin && \
    \
    # Install Docker Compose
    curl -L https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose && \
    \
    # Install NodeJS packages
    npm install --global \
        typescript \
        ts-node @types/node \
        fs-extra @types/fs-extra \
        yaml @types/yaml \
        bluebird @types/bluebird \
        handlebars @types/handlebars \
        node-fetch @types/node-fetch && \
    \
    # Clean
    rm -rf /tmp/* && \
    npm cache clean --force && \
    apk del --no-cache build-dependencies

COPY ./rootfs /
COPY ./src /data/worker

ENTRYPOINT ["ts-node"]
CMD ["/data/worker/deploy.ts"]
