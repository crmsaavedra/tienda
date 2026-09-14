FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del cliente y buildear
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Instalar dependencias del backend
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código fuente
COPY src/ ./src/
COPY scripts/ ./scripts/

# Crear directorios necesarios
RUN mkdir -p uploads backups

# Exponer puerto y arrancar
EXPOSE 3000
CMD ["npm", "start"]
