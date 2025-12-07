# 1. Usamos Node 20 (Alpine)
FROM node:20-alpine

# 2. Instalamos Python3 y FFmpeg
RUN apk add --no-cache python3 ffmpeg curl

# --- LA LÍNEA MÁGICA ---
# Creamos un enlace para que el comando 'python' funcione redirigiendo a 'python3'
RUN ln -sf /usr/bin/python3 /usr/bin/python

# 3. Preparamos carpeta
WORKDIR /app

# 4. Copiamos dependencias
COPY package.json pnpm-lock.yaml* ./

# 5. Instalamos
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 6. Copiamos código
COPY . .

# 7. Descargamos yt-dlp para Linux
RUN mkdir -p bin
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
RUN chmod +x bin/yt-dlp

# 8. Build
RUN pnpm build

# 9. Start
EXPOSE 3000
CMD ["pnpm", "start"]