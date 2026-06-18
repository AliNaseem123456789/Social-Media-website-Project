# FROM node:20-alpine
FROM public.ecr.aws/docker/library/node:20-alpine
WORKDIR /app
COPY package*.json ./
# RUN npm ci --only=production
RUN npm install --omit=dev
COPY . .
EXPOSE 5001
CMD ["node", "index.js"]
