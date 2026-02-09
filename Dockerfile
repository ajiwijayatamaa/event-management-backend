FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "npx prisma generate && npm run build && npm run start"]

# docker build -t blog-app-api .

# docker run --name backend_event -p 9000:8000 backend-event-management