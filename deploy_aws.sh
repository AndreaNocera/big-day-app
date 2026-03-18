#!/bin/bash
# 1. Prepare Lambda Layer (Using Docker for Linux compatibility)
if [[ "$*" != *"--skip-layer"* ]]; then
    echo "Preparing Lambda Layer..."
    rm -rf lambda/layer/python
    mkdir -p lambda/layer/python
    cp -r lambda/shared lambda/layer/python/
    docker run --rm --platform linux/amd64 -v "$PWD/lambda":/var/task public.ecr.aws/sam/build-python3.12 \
        pip install -r /var/task/shared/requirements.txt -t /var/task/layer/python/
else
    echo "Skipping Lambda Layer preparation."
fi

# 2. Build del frontend (Vite - usa le variabili prod)
if [[ "$*" != *"--skip-frontend"* ]] && [[ "$*" != *"-sf"* ]]; then
    echo "Building frontend..."
    cd frontend_vite
    cp ../.env.production .env.production
    npm run build
    cd ..
else
    echo "Skipping frontend build."
fi

# 3. Deploy con CDK
cd infra
CDK_ARGS=()
if [[ "$*" == *"--skip-frontend"* ]] || [[ "$*" == *"-sf"* ]]; then
    CDK_ARGS+=("-c" "skip_frontend=true")
fi

npx cdk deploy --profile big-day-app "${CDK_ARGS[@]}"
cd ..
