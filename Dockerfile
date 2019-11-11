FROM node:12-alpine

LABEL maintainer="s.sadovyi@deepvision.team"

ENV \
    TZ=Europe/Kiev \
    TERM=xterm \
    # Node options
    TS_NODE_PROJECT=/tsconfig.json \
    NODE_PATH=/usr/local/lib/node_modules
    # https://storage.googleapis.com/kubernetes-release/release/stable.txt
    KUBE_VERSION=1.16.2 \
    # https://github.com/digitalocean/doctl/releases
    DOCTL_VERSION=1.33.1

COPY ./rootfs /
COPY ./src/deploy.ts /

RUN \
    apk add --no-cache --virtual=build-dependencies curl && \
    cd /tmp && \

    # Install Kubectl
    curl -L https://storage.googleapis.com/kubernetes-release/release/v${KUBE_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \

    # Install Doctl
    mkdir /lib64 && \
    ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2 && \
    curl -L https://github.com/digitalocean/doctl/releases/download/v${DOCTL_VERSION}/doctl-${DOCTL_VERSION}-linux-amd64.tar.gz  | tar xz && \
    mv ./doctl /usr/local/bin && \

    # Install NodeJS packages
    npm install --global \
        typescript \
        ts-node @types/node \
        fs-extra @types/fs-extra \
        bluebird @types/bluebird \
        node-fetch @types/node-fetch && \

    # Clean
    npm cache clean --force && \
    apk del --no-cache build-dependencies

ENTRYPOINT ["ts-node"]
CMD ["/deploy.ts"]
