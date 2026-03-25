# Neo4j Enterprise via Docker

Setup ini menjalankan Neo4j Enterprise dengan Docker Compose.

- Image dipin ke `neo4j:2026.02.3-enterprise`.
- Pada 2026-03-23, alias `neo4j:enterprise` di Docker Hub mengarah ke rilis ini.
- Kredensial disimpan di `secrets/neo4j_auth.txt` dan tidak ikut ke git.

## Jalankan

```bash
docker compose up -d
```

Atau jalankan startup + seed data sekaligus:

```bash
./scripts/start-and-seed.sh
```

## Akses

- Browser: <http://localhost:7474>
- Bolt: `bolt://localhost:7687`
- Username: `neo4j`
- Password: lihat `secrets/neo4j_auth.txt`

## Load Ulang Sample Data

Script ini akan menghapus graph saat ini lalu mengisi ulang sample data sederhana untuk dashboard:

```bash
./scripts/seed-sample-data.sh
```

Sample graph berisi:

- `Team`
- `Person`
- `Project`
- `Task`
- `Dashboard`
- `Metric`

## Dashboard Builder

App Node.js ini menyediakan:

- login page untuk credential Neo4j
- support Neo4j local maupun remote instance
- dashboard builder drag-and-resize
- widget `Stat`, `Table`, dan `Graph`
- visual graph interaktif bergaya Bloom versi ringan
- layout bergaya NeoDash dengan sidebar dashboard dan tab workspace

### Development

```bash
npm install
npm run dev
```

Lalu buka <http://localhost:3000>

Jika Anda akses mode development dari IP/domain lain, Anda bisa tambahkan origin yang diizinkan:

```bash
export NEODECK_ALLOWED_DEV_ORIGINS=http://192.168.18.178:3000,http://your-domain.dev
npm run dev
```

Catatan:

- error console `/_next/webpack-hmr` adalah channel WebSocket untuk hot reload saat `next dev`
- ini tidak dipakai saat production `npm run start`
- jika dev server diakses lewat reverse proxy, proxy harus meneruskan WebSocket upgrade ke `/_next/webpack-hmr`
- untuk app public, pakai `npm run build && npm run start`, jangan expose `next dev`

### Koneksi Remote

- Single instance atau IP langsung:
  Gunakan `bolt://192.168.18.16:7687` dan pilih `Direct` mode.
- Cluster / routing:
  Gunakan `neo4j://host:7687`, `neo4j+s://host:7687`, atau `neo4j+ssc://host:7687`.
- Mode `Auto` akan mencoba URI yang Anda masukkan dan memberi petunjuk bila error-nya terkait routing table.
- Untuk deployment public, koneksi ke Neo4j dilakukan dari backend server Next.js. Artinya server aplikasi harus bisa reach host Neo4j tujuan.

### Allowlist Host Opsional

Jika app ini nanti dipublish ke internet, sebaiknya batasi host Neo4j yang boleh diakses:

```bash
export NEODECK_ALLOWED_HOSTS=192.168.18.16,my-neo4j.example.com
```

### Production Build

```bash
npm run build
npm run start
```

## Hentikan

```bash
docker compose down
```

## Catatan lisensi

Neo4j Enterprise membutuhkan penerimaan lisensi melalui `NEO4J_ACCEPT_LICENSE_AGREEMENT=yes`. Pastikan penggunaan Anda sesuai lisensi Neo4j Enterprise.
