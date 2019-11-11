#!/bin/sh

set -e
set -u

cd /github/workspace

docker login docker.pkg.github.com -u sergsadovyi -p $GITHUB_DOCKER_TOKEN
docker build -t docker.pkg.github.com/deeepvision/cloud-deploy/cloud-deploy .
docker push docker.pkg.github.com/deeepvision/cloud-deploy/cloud-deploy
