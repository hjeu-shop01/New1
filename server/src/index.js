import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import morgan from 'morgan';
import helmet from 'helmet';
import { prisma } from './prisma.js';
import { Role, OrderStatus } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.fullName || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'account-shop-api' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email đã tồn tại' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        role: Role.USER
      }
    });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

app.get('/api/products', async (_, res) => {
  const items = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(items);
});

app.post('/api/products', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { title, description, category, price, stock, imageUrl, isActive } = req.body || {};
    if (!title || !description || !category || price == null) {
      return res.status(400).json({ message: 'Thiếu dữ liệu sản phẩm' });
    }
    const product = await prisma.product.create({
      data: {
        title,
        description,
        category,
        price: Number(price),
        stock: Number(stock || 0),
        imageUrl: imageUrl || null,
        isActive: Boolean(isActive ?? true)
      }
    });
    res.status(201).json(product);
  } catch {
    res.status(500).json({ message: 'Create product failed' });
  }
});

app.put('/api/products/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const product = await prisma.product.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price != null ? Number(data.price) : undefined,
        stock: data.stock != null ? Number(data.stock) : undefined,
        imageUrl: data.imageUrl ?? undefined,
        isActive: data.isActive != null ? Boolean(data.isActive) : undefined
      }
    });
    res.json(product);
  } catch {
    res.status(500).json({ message: 'Update product failed' });
  }
});

app.delete('/api/products/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Delete product failed' });
  }
});

app.get('/api/orders', requireAuth, async (req, res) => {
  const isAdmin = req.auth.role === Role.ADMIN;
  const orders = await prisma.order.findMany({
    where: isAdmin ? {} : { userId: req.auth.sub },
    include: { user: true, product: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
});

app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1, customerEmail } = req.body || {};
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    if (!product.isActive) return res.status(400).json({ message: 'Sản phẩm đã bị ẩn' });

    const userEmail = customerEmail || req.auth.email;
    const amount = product.price * Number(quantity);

    const order = await prisma.order.create({
      data: {
        userId: req.auth.sub,
        productId: product.id,
        customerEmail: userEmail,
        productName: product.title,
        quantity: Number(quantity),
        amount,
        status: OrderStatus.PENDING
      },
      include: { product: true, user: true }
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: Math.max(0, product.stock - Number(quantity)) }
    });

    res.status(201).json(order);
  } catch {
    res.status(500).json({ message: 'Create order failed' });
  }
});

app.put('/api/orders/:id/status', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ message: 'Status không hợp lệ' });
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(order);
  } catch {
    res.status(500).json({ message: 'Update order failed' });
  }
});

app.delete('/api/orders/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Delete order failed' });
  }
});

app.get('/api/users', requireAuth, requireRole(Role.ADMIN), async (_, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

app.put('/api/users/:id/role', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch {
    res.status(500).json({ message: 'Update role failed' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Delete user failed' });
  }
});

app.get('/api/admin/summary', requireAuth, requireRole(Role.ADMIN), async (_, res) => {
  const [users, products, orders] = await Promise.all([
    prisma.user.findMany({ select: { id: true, role: true } }),
    prisma.product.findMany({ select: { id: true, price: true, stock: true } }),
    prisma.order.findMany({ select: { amount: true, status: true, createdAt: true } })
  ]);

  const revenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const completed = orders.filter((o) => o.status === OrderStatus.COMPLETED).length;
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i;
    const amount = orders
      .filter((o) => new Date(o.createdAt).getMonth() === monthIndex)
      .reduce((sum, o) => sum + o.amount, 0);
    return { month: new Date(2026, monthIndex, 1).toLocaleString('en-US', { month: 'short' }), revenue: amount };
  });

  res.json({
    revenue,
    totalOrders: orders.length,
    totalUsers: users.length,
    totalProducts: products.length,
    completed,
    monthlyRevenue
  });
});

async function ensureAdmin() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: Role.ADMIN,
        fullName: 'Administrator'
      }
    });
  }
}

ensureAdmin()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
