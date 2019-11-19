#!/bin/sh

set -e
set -u

cd /github/workspace

docker login docker.pkg.github.com -u sergsadovyi -p $GITHUB_DOCKER_TOKEN
docker pull docker.pkg.github.com/deeepvision/cloud-deploy/cloud-deploy

docker login -u $DOCKERHUB_USER -p $DOCKERHUB_PASS
docker tag docker.pkg.github.com/deeepvision/cloud-deploy/cloud-deploy deeepvision/ci-deploy
docker push deeepvision/ci-deploy
