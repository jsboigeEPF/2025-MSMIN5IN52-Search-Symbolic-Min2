FROM oven/bun:latest

WORKDIR /app

# Copier les fichiers de configuration
COPY package.json bun.lock ./

# Installer les dépendances
RUN bun install
RUN bun install tailwindcss @tailwindcss/vite
# Copier le code source
COPY . .

# Exposer le port Vite
EXPOSE 5173

# Commande de démarrage en mode dev
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
