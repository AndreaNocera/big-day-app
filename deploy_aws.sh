#!/bin/bash
# 1. Prepare Lambda Layer (Using Docker for Linux compatibility)
if [[ "$*" != *"--skip-layer"* ]]; then
    if [[ ! -d lambda/layer/python ]] || [[ "$*" == *"--rebuild-shared-layer"* ]]; then
        echo "Preparing shared Lambda Layer..."
        rm -rf lambda/layer/python
        mkdir -p lambda/layer/python
        cp -r lambda/shared lambda/layer/python/
        docker run --rm --platform linux/amd64 -v "$PWD/lambda":/var/task public.ecr.aws/sam/build-python3.12 \
            pip install -r /var/task/shared/requirements.txt -t /var/task/layer/python/
    else
        echo "Preserving existing shared Lambda Layer. Use --rebuild-shared-layer to refresh it."
    fi
    echo "Preparing photo Lambda Layer..."
    rm -rf lambda/photo_layer/python
    mkdir -p lambda/photo_layer/python
    cp -r lambda/photo_shared lambda/photo_layer/python/
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
CDK_EXIT=$?
cd ..

# 4. Invalidazione CloudFront (solo se il frontend e' stato deployato con successo)
if [[ $CDK_EXIT -eq 0 ]] && [[ "$*" != *"--skip-frontend"* ]] && [[ "$*" != *"-sf"* ]]; then
    echo "Invalidating CloudFront cache..."
    DIST_ID=$(aws cloudfront list-distributions --profile big-day-app \
        --query "DistributionList.Items[?Origins.Items[0].DomainName=='wedding-frontend-prod-nocera.s3-website-eu-west-1.amazonaws.com'].Id | [0]" \
        --output text)
    if [[ -n "$DIST_ID" && "$DIST_ID" != "None" ]]; then
        aws cloudfront create-invalidation --profile big-day-app \
            --distribution-id "$DIST_ID" --paths "/*" \
            --query "Invalidation.{Id:Id,Status:Status}" --output table
        echo "Invalidazione creata sulla distribuzione $DIST_ID (completamento in ~1-3 min)."
    else
        echo "ATTENZIONE: distribuzione CloudFront non trovata, invalidazione saltata."
    fi
fi
