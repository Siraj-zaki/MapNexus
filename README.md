# Indoor Map Platform

A comprehensive indoor mapping and IoT platform for retail and industrial applications. Built with modern technologies for scalability, real-time data processing, and beautiful visualizations.

## ✨ Features

- 🗺️ **Interactive Indoor Maps** - Powered by Mapbox GL with GeoJSON support
- 📡 **Real-time Sensor Data** - Live IoT device tracking and monitoring
- 📊 **Dynamic Dashboards** - Customizable analytics and visualizations
- 🚨 **Smart Alerts** - Configurable alerting system with multiple channels
- 📈 **Reports** - Generate insights from historical data
- 🔐 **Authentication** - Secure user management

## 🏗️ Tech Stack

### Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Ant Design
- Mapbox GL JS
- TanStack Query + Zustand

### Backend

- Node.js + Express + TypeScript
- Prisma ORM
- Socket.IO for real-time

### Databases

- PostgreSQL + PostGIS (spatial data)
- TimescaleDB (time-series)
- Redis (caching & pub/sub)

### IoT

- MQTT (Mosquitto broker)

## 📁 Project Structure

```
indoor-map/
├── apps/
│   ├── web/           # React frontend
│   └── server/        # Node.js backend
├── packages/
│   └── shared/        # Shared types & utilities
├── docker/            # Docker configurations
└── docs/              # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose
- Mapbox API Key ([Get one here](https://account.mapbox.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/indoor-map-platform.git
cd indoor-map-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Backend
cp apps/server/.env.example apps/server/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

Edit the `.env` files with your configuration.

### 4. Start Database Services

```bash
npm run db:up
```

This starts PostgreSQL, Redis, and Mosquitto MQTT broker.

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Start Development Servers

```bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run dev:web     # Frontend at http://localhost:5173
npm run dev:server  # Backend at http://localhost:3001
```

## 🔧 Configuration

### Environment Variables

#### Backend (`apps/server/.env`)

| Variable          | Description                  | Default                  |
| ----------------- | ---------------------------- | ------------------------ |
| `DATABASE_URL`    | PostgreSQL connection string | -                        |
| `REDIS_URL`       | Redis connection string      | `redis://localhost:6379` |
| `MQTT_BROKER_URL` | MQTT broker URL              | `mqtt://localhost:1883`  |
| `JWT_SECRET`      | JWT signing secret           | -                        |
| `PORT`            | Server port                  | `3001`                   |

#### Frontend (`apps/web/.env`)

| Variable            | Description         | Default                 |
| ------------------- | ------------------- | ----------------------- |
| `VITE_API_URL`      | Backend API URL     | `http://localhost:3001` |
| `VITE_MAPBOX_TOKEN` | Mapbox access token | -                       |
| `VITE_WS_URL`       | WebSocket URL       | `ws://localhost:3001`   |

## 📜 Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start all development servers |
| `npm run dev:web`    | Start frontend only           |
| `npm run dev:server` | Start backend only            |
| `npm run build`      | Build all packages            |
| `npm run lint`       | Lint all packages             |
| `npm run test`       | Run all tests                 |
| `npm run db:up`      | Start database services       |
| `npm run db:down`    | Stop database services        |
| `npm run db:migrate` | Run database migrations       |
| `npm run db:studio`  | Open Prisma Studio            |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mapbox](https://www.mapbox.com/) for mapping
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Ant Design](https://ant.design/) for enterprise components
