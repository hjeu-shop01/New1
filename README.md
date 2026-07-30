# Account Shop Full

Monorepo production-ready cho web shop bán account kèm admin panel.

## Gồm có
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Auth: JWT + phân quyền role
- Database thật: PostgreSQL + Prisma
- Admin: quản lý sản phẩm / đơn hàng / người dùng
- Deploy:
  - Frontend trên Vercel
  - Backend + database trên Render + PostgreSQL

## Chạy local

### 1) Cài dependencies
```bash
npm install
```

### 2) Cấu hình env
Tạo `server/.env` từ `.env.example`.

### 3) Khởi tạo database
```bash
cd server
npx prisma migrate dev
npm run seed
```

### 4) Chạy app
```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

## Admin mặc định
- Email: `admin@example.com`
- Password: `Admin@123`

## Deploy
### Vercel
- Chọn project folder: `client`
- Set env: `VITE_API_URL=https://your-render-server.onrender.com`

### Render
- Tạo PostgreSQL database
- Deploy service từ folder `server`
- Set env:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `CLIENT_URL` = domain Vercel của bạn

### Lưu ý
- Chạy migration/seed sau khi DB được kết nối.
- Đổi mật khẩu admin và JWT secret trước khi public.
