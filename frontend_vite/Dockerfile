FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

RUN npm install

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server with host binding so Docker port mapping works
CMD ["npx", "vite", "--host", "0.0.0.0"]
