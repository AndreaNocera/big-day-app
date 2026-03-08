#!/bin/bash
# 1. Prepare Lambda Layer
mkdir -p lambda/layer/python
cp -r lambda/shared lambda/layer/python/
# Install dependencies directly into the layer directory
./.venv/bin/pip install -r lambda/shared/requirements.txt -t lambda/layer/python/

# 2. Build del frontend (Vite - usa le variabili prod)
cd frontend_vite
export $(grep -v '^#' ../.env.production | xargs) && npm run build
cd ..

# 2. Deploy con CDK
cd infra
npx cdk deploy --profile big-day-app
