FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client (doesn't need DATABASE_URL)
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]