# Roshan Digital

Full-stack investment platform with Python Flask backend and React frontend.

## Project Structure

```
roshan-digital/
├── frontend/          # React + Vite (localhost:3000)
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Python 3.10 + Flask (localhost:5000)
│   ├── app.py
│   ├── models.py
│   └── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Quick Start (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs on http://localhost:5000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

The Vite dev server proxies `/api` requests to the Flask backend at port 5000.

## Docker

### Build & Run

```bash
docker build -t roshan-digital .
docker run -p 5000:5000 roshan-digital
```

### Docker Compose (full stack)

```bash
docker-compose up --build
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | Backend port |
| `DATABASE_URL` | sqlite:///roshan.db | Database URL |
| `FLASK_DEBUG` | false | Enable debug mode |
| `SECRET_KEY` | auto-generated | Flask secret key |

## Features

- User registration with OTP verification
- Investment plans with daily profits
- Deposit/Withdrawal system
- Referral program
- Task completion rewards
- Community posts & comments
- Admin panel with full management
- Real-time notifications

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Python 3.10, Flask, SQLAlchemy, SQLite
- **Deployment:** Docker, Docker Compose
