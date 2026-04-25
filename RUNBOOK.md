# 10Min Grocery — Operations Runbook

## Architecture Overview

```
[User Browser] ──HTTP──► [Frontend: React/Vite :3000]
                               │
                          REST + WS
                               │
[Rider App]  ──────────► [Backend: Express :5000]
[Admin Panel] ────────►       │
                         ┌────┴────────┐
                    [MongoDB :27017]  [Socket.IO]
```

---

## 1. Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB running locally or Atlas connection string

### Starting the Backend
```bash
cd backend
npm install
# Ensure .env has MONGODB_URI and JWT_SECRET
npm start          # or: node server.js
# Server starts at http://localhost:5000
```

### Starting the Frontend
```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:5173
```

---

## 2. Docker Deployment

### First-time setup
```bash
# From project root
docker-compose up --build -d
```

### Verify containers running
```bash
docker-compose ps
# Should show: 10min_mongo, 10min_backend, 10min_frontend — Up
```

### View logs
```bash
docker-compose logs -f backend    # Backend logs
docker-compose logs -f mongo      # MongoDB logs
docker-compose logs -f frontend   # Nginx logs
```

### Stop everything
```bash
docker-compose down
# To also remove data volumes:
docker-compose down -v
```

---

## 3. Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/groceerynewstore
JWT_SECRET=<change_this_to_a_long_random_string>
NODE_ENV=production

# Optional integrations
STRIPE_SECRET_KEY=sk_...
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_KEY=<your_google_maps_key>  # Optional for live map
```

---

## 4. Admin Portal Access

| URL | Purpose |
|-----|---------|
| `/admin/login` | Admin login |
| `/admin/dashboard` | Overview stats |
| `/admin/live-map` | Real-time rider + order tracking |
| `/admin/riders` | Rider management |
| `/admin/kyc` | KYC verification queue |
| `/admin/orders` | Order management |
| `/admin/payouts` | Payout calculation & export |
| `/admin/disputes` | Dispute resolution |
| `/admin/audit` | Immutable audit logs |
| `/admin/assignment-config` | Assignment engine config |
| `/admin/zones` | Delivery zone management |

**Default admin credentials** — create one via MongoDB:
```js
// Run in mongosh:
db.users.insertOne({
  name: "Admin",
  email: "admin@10min.com",
  password: "<bcrypt-hashed>",  // use bcryptjs to hash
  role: "admin"
})
```

---

## 5. Rider Portal

| URL | Purpose |
|-----|---------|
| `/rider/login` | Rider login |
| `/rider/dashboard` | Orders, earnings, profile |
| `/rider/kyc` | KYC document submission |

---

## 6. API Health Check

```bash
curl http://localhost:5000/
# Expected: {"status":"ok","service":"10Min Grocery Backend","version":"2.0.0"}
```

---

## 7. Key API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Customer login |
| POST | `/api/auth/register` | Customer register |
| POST | `/api/riders/login` | Rider login |
| POST | `/api/riders/register` | Rider self-register |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/live-map` | Active riders + orders |
| GET | `/api/admin/users` | All users |

### KYC
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/kyc/submit` | Rider submits KYC |
| GET | `/api/kyc/queue` | Admin: pending queue |
| PUT | `/api/kyc/:id/approve` | Admin: approve |
| PUT | `/api/kyc/:id/reject` | Admin: reject |

### Assignments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/assignments/auto` | Trigger auto-assign |
| POST | `/api/assignments/manual` | Manual assign |
| PUT | `/api/assignments/:id/accept` | Rider accepts |
| PUT | `/api/assignments/:id/reject` | Rider rejects |
| GET/PUT | `/api/assignments/config` | Engine config |

### Payouts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payouts/calculate` | Calculate for period |
| GET | `/api/payouts` | List all payouts |
| GET | `/api/payouts/export` | CSV export |
| PUT | `/api/payouts/:id/mark-paid` | Mark as paid |

---

## 8. Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `joinOrderRoom` | `orderId` | Customer tracks order |
| `joinRiderRoom` | `riderId` | Rider joins own room |
| `joinAdminRoom` | — | Admin joins map room |
| `updateRiderLocation` | `{riderId, lat, lng, orderId}` | Client-side location push |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `riderLocationUpdated` | `{riderId, lat, lng}` | Location broadcast |
| `orderStatusUpdated` | `{orderId, status}` | Status change |
| `orderAssigned` | `{orderId}` | New order for rider |
| `accountStatusChanged` | `{status, reason}` | Account suspension |
| `riderOnline/Offline` | `{riderId, name}` | Rider availability |

---

## 9. Database Backups

```bash
# Manual backup
docker exec 10min_mongo mongodump --out /backup/$(date +%Y%m%d)

# Restore from backup
docker exec 10min_mongo mongorestore /backup/20241201/
```

---

## 10. Troubleshooting

| Issue | Check |
|-------|-------|
| Backend won't start | Verify `MONGODB_URI` in `.env`, check MongoDB is running |
| KYC approval not reflecting | Check `Rider.kycStatus` update in `kycController.js:approveKYC` |
| Socket.IO not connecting | Ensure CORS origin in `server.js` matches frontend URL |
| Auto-assign fails | Check `AssignmentConfig` exists in DB (auto-seeded on startup) |
| CSV export empty | Rider must have delivered orders in the selected period |
| Rate limit errors | Default: 120 req/min API, 20 req/15min auth. Adjust in `server.js` |
| Riders not showing on map | Confirm rider called `PUT /api/riders/availability` with `isAvailable: true` |

---

## 11. Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use a strong random `JWT_SECRET` (32+ chars)
- [ ] Set `MONGODB_URI` to Atlas connection string with auth
- [ ] Enable MongoDB Atlas IP allowlist
- [ ] Configure Nginx SSL termination with Let's Encrypt
- [ ] Set up log rotation for server logs
- [ ] Configure automated daily MongoDB backups
- [ ] Restrict admin routes behind VPN or IP allowlist if needed
- [ ] Remove dev CORS origins from `server.js`
- [ ] Set up error monitoring (e.g., Sentry)

---

*Generated: March 2026 | 10Min Grocery v2.0.0*
