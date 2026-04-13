FROM node:22-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python-is-python3 \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npm run dev"]