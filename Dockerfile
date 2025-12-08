# 1. Usamos Node 20 sobre Debian Slim (Ligero pero compatible)
FROM node:20-slim

# 2. Instalamos las herramientas del sistema OBLIGATORIAS
# - python3: yt-dlp lo necesita para arrancar
# - ffmpeg: Para unir audio/video y poner carátulas
# - curl: Para descargar el binario
RUN apt-get update && \
    apt-get install -y python3 ffmpeg curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# 3. Preparamos la carpeta de trabajo
WORKDIR /app

# 4. EL TRUCO: Preparamos la carpeta bin y descargamos yt-dlp
# Tu código busca en /app/bin/yt-dlp, así que lo ponemos ahí.
RUN mkdir -p bin
# Descargamos el binario oficial de Linux
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
# Le damos permisos de ejecución
RUN chmod +x bin/yt-dlp

# 5. Instalamos dependencias de Node.js
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# 6. Copiamos el resto del código
COPY . .

# 7. Construimos la app Next.js
RUN pnpm build

# 8. Arrancamos
EXPOSE 3000
CMD ["pnpm", "start"]