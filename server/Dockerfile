FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG DATABASE_URL
RUN DATABASE_URL=$DATABASE_URL npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]