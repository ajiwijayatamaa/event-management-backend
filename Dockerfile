# Kita ingin buat API IMAGE terus nanti hasil image nya bisa kita jalanin.

# Cara buat IMAGE:
# 1. Kita mau menggunakan Nodejs versi berapa untuk ngebuild aplikasi API kita
FROM node:22-alpine

# 2. Kita mau taruh aplikasi kita di folder apa? 
WORKDIR /app

# 3. Setelah itu copy seluruh package.json ke ./ atau kita mau copy ke folder /app nya itu
COPY package*.json ./

# 4. Setelah di copy kita akan melakukan run
RUN npm ci

# 5. Setalah NPM ci kita akan copy semua datanya ke dalam folder app
COPY . .

# 6. Aplikasi kita running di port berapa?
EXPOSE 8000

# 7. Liat di package json bagian scripts jadi kita build dulu baru npm run start
CMD ["sh", "-c", "npx prisma generate && npm run build && npm run start"]

# 8. Jalankan/running di terminal, untuk membuat sebuah image 
# Syntax running: docker build -t <nama-image> .(spasi titik ini untuk ngasih tau posisi docker filenya ada dimana)
# REAL IMPLEMENTASI: docker build -t mini-project-backend .

# 9. Cek dulu di docker apakah image nya sudah terbuat

# 10. TAHAP AKHIR RUNNING IMAGE NYA/Sekalian buat CONTAINER nya:
# Syntax running dan buat container: docker run --name <nama_container> -p <hostPort>:<containerPortNodejs> <nama-image-dari-yang-tadi-kita-buat>
# docker run --name backend_event_management -p 9000:8000 mini-project-backend