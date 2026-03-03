FROM node:20-alpine

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client before building TypeScript
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]