#!/usr/bin/env bash
set -euo pipefail

# Run from the repository root, or set REPO_ROOT explicitly.
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT"

IMAGE="${IMAGE:-dolphinscheduler-cluster:3.4.2}"

echo '[1/3] Building the distribution package...'
./mvnw -B -Prelease -Dmaven.test.skip=true -Dmaven.javadoc.skip=true package

PACKAGE="$(find dolphinscheduler-dist/target -maxdepth 1 -type f -name 'apache-dolphinscheduler-*-bin.tar.gz' -print -quit)"
if [[ -z "$PACKAGE" ]]; then
  echo 'Distribution package was not generated under dolphinscheduler-dist/target' >&2
  exit 1
fi

echo '[2/3] Preparing Docker build context...'
mkdir -p dist/target
find dist/target -maxdepth 1 -type f -name 'apache-dolphinscheduler-*-bin.tar.gz' -delete
cp "$PACKAGE" dist/target/

echo '[3/3] Building the role image...'
docker build -f deploy/cluster/Dockerfile -t "$IMAGE" .

echo "Image built: $IMAGE"
