import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Bell,
  CirclePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  Package,
  Search,
  Settings,
  ShoppingCart,
  SunMedium,
  Trash2,
  Users,
  X,
  Edit3,
  RefreshCw
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const emptyProduct = {
  title: '',
  description: '',
  category: 'Game',
  price: 0,
  stock: 0,
  imageUrl: '',
  isActive: true
}

const statusOptions = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELED']

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value || 0)
}

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

function LoadingRows({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-6">
          {Array.from({ length: 6 }).map((__, j) => (
            <div key={j} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ))}
    </>
  )
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  )
}

function StatusPill({ value }) {
  const cls = {
    PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    PAID: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    PROCESSING: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    CANCELED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls[value] || cls.PENDING}`}>{value}</span>
}

export default function App() {
  const [dark, setDark] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  })
  const [mode, setMode] = useState('login') // login | register
  const [view, setView] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])

  const [authForm, setAuthForm] = useState({
    email: 'admin@example.com',
    password: 'Admin@123',
    fullName: ''
  })

  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingProductId, setEditingProductId] = useState(null)
  const [orderForm, setOrderForm] = useState({ productId: '', quantity: 1 })
  const [selectedOrderStatus, setSelectedOrderStatus] = useState({})
  const [selectedRole, setSelectedRole] = useState({})

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (!auth?.token) return
    localStorage.setItem('auth', JSON.stringify(auth))
  }, [auth])

  async function refreshAll() {
    setLoading(true)
    setMessage('')
    try {
      const [productData] = await Promise.all([
        api('/api/products')
      ])
      setProducts(productData)

      if (auth?.token) {
        const role = auth?.user?.role
        if (role === 'ADMIN') {
          const [summaryData, ordersData, usersData] = await Promise.all([
            api('/api/admin/summary', { token: auth.token }),
            api('/api/orders', { token: auth.token }),
            api('/api/users', { token: auth.token })
          ])
          setSummary(summaryData)
          setOrders(ordersData)
          setUsers(usersData)
        } else {
          const ordersData = await api('/api/orders', { token: auth.token })
          setOrders(ordersData)
        }
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token])

  const isAdmin = auth?.user?.role === 'ADMIN'

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) =>
      [p.title, p.description, p.category].join(' ').toLowerCase().includes(term)
    )
  }, [products, search])

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const data = await api(endpoint, { method: 'POST', body: authForm })
      setAuth(data)
      setMessage(mode === 'login' ? 'Đăng nhập thành công' : 'Đăng ký thành công')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('auth')
    setAuth(null)
    setOrders([])
    setUsers([])
    setSummary(null)
    setView('overview')
  }

  async function saveProduct(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (!auth?.token) throw new Error('Bạn cần đăng nhập')
      if (editingProductId) {
        await api(`/api/products/${editingProductId}`, {
          method: 'PUT',
          token: auth.token,
          body: productForm
        })
        setMessage('Đã cập nhật sản phẩm')
      } else {
        await api('/api/products', {
          method: 'POST',
          token: auth.token,
          body: productForm
        })
        setMessage('Đã tạo sản phẩm mới')
      }
      setProductForm(emptyProduct)
      setEditingProductId(null)
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function editProduct(p) {
    setEditingProductId(p.id)
    setProductForm({
      title: p.title,
      description: p.description,
      category: p.category,
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl || '',
      isActive: p.isActive
    })
    setView('products')
  }

  async function deleteProduct(id) {
    if (!confirm('Xóa sản phẩm này?')) return
    setLoading(true)
    try {
      await api(`/api/products/${id}`, { method: 'DELETE', token: auth.token })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveOrder() {
    setLoading(true)
    setMessage('')
    try {
      await api('/api/orders', {
        method: 'POST',
        token: auth.token,
        body: orderForm
      })
      setMessage('Đã tạo đơn hàng')
      setOrderForm({ productId: '', quantity: 1 })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(id, status) {
    setLoading(true)
    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PUT',
        token: auth.token,
        body: { status }
      })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteOrder(id) {
    if (!confirm('Xóa đơn hàng này?')) return
    setLoading(true)
    try {
      await api(`/api/orders/${id}`, { method: 'DELETE', token: auth.token })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(id, role) {
    setLoading(true)
    try {
      await api(`/api/users/${id}/role`, {
        method: 'PUT',
        token: auth.token,
        body: { role }
      })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser(id) {
    if (!confirm('Xóa người dùng này?')) return
    setLoading(true)
    try {
      await api(`/api/users/${id}`, { method: 'DELETE', token: auth.token })
      await refreshAll()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const monthlyRevenue = summary?.monthlyRevenue || []
  const completedRate = summary?.totalOrders ? Math.round((summary.completed / summary.totalOrders) * 100) : 0

  if (!auth?.token) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Shop</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Shop bán account với admin panel, phân quyền và database thật.</p>
              </div>
              <button onClick={() => setDark(v => !v)} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                {dark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex gap-2">
                  <button onClick={() => setMode('login')} className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === 'login' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Đăng nhập</button>
                  <button onClick={() => setMode('register')} className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === 'register' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Đăng ký</button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {mode === 'register' && (
                    <input
                      value={authForm.fullName}
                      onChange={(e) => setAuthForm((v) => ({ ...v, fullName: e.target.value }))}
                      placeholder="Họ tên"
                      className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800"
                    />
                  )}
                  <input
                    value={authForm.email}
                    onChange={(e) => setAuthForm((v) => ({ ...v, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800"
                  />
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm((v) => ({ ...v, password: e.target.value }))}
                    placeholder="Mật khẩu"
                    className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800"
                  />
                  <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
                    {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                  </button>
                </form>

                {message && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{message}</p>}

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <p className="font-semibold text-slate-900 dark:text-white">Tài khoản demo</p>
                  <p className="mt-2">Admin: admin@example.com / Admin@123</p>
                  <p>Customer: customer@example.com / User@12345</p>
                </div>
              </section>

              <section className="grid gap-4">
                <StatCard title="Bảo mật" value="JWT + Roles" sub="Phân quyền ADMIN / USER" />
                <StatCard title="Database" value="PostgreSQL" sub="Quản lý qua Prisma ORM" />
                <StatCard title="Deploy" value="Vercel + Render" sub="Tách frontend và backend rõ ràng" />
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const nav = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex min-h-screen">
          <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/95 p-4 backdrop-blur-xl transition-transform dark:border-slate-800 dark:bg-slate-950/95 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Nova Shop</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isAdmin ? 'Admin Panel' : 'Customer Panel'}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 lg:hidden"><X className="h-5 w-5" /></button>
            </div>

            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon
                const active = view === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-sm font-semibold">{auth.user?.fullName || auth.user?.email}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{auth.user?.role}</div>
              <button onClick={logout} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </aside>

          <div className="flex-1 lg:ml-0">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                <button onClick={() => setSidebarOpen(true)} className="rounded-2xl p-2 lg:hidden"><Menu className="h-5 w-5" /></button>

                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <button onClick={refreshAll} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900" title="Refresh">
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button onClick={() => setDark(v => !v)} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  {dark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
                </button>
                <button className="relative rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
                </button>
              </div>
            </header>

            <main className="p-4 sm:p-6 lg:p-8">
              <div className="mx-auto max-w-7xl space-y-6">
                {message && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                    {message}
                  </div>
                )}

                {view === 'overview' && (
                  <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatCard title="Tổng doanh thu" value={money(summary?.revenue || 0)} sub="Toàn bộ đơn hàng" />
                      <StatCard title="Tổng đơn hàng" value={summary?.totalOrders || orders.length} sub="Đơn theo trạng thái" />
                      <StatCard title="Số người dùng" value={summary?.totalUsers || users.length || 0} sub="Users đã tạo" />
                      <StatCard title="Tỷ lệ hoàn tất" value={`${completedRate}%`} sub="COMPLETED / total" />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-5">
                      <div className="xl:col-span-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Doanh thu theo tháng</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Dữ liệu tổng hợp từ bảng orders</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">Live</span>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyRevenue}>
                              <defs>
                                <linearGradient id="rfill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopOpacity={0.35} />
                                  <stop offset="95%" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                              <XAxis dataKey="month" tickLine={false} axisLine={false} />
                              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}m`} />
                              <Tooltip formatter={(value) => money(value)} />
                              <Area type="monotone" dataKey="revenue" strokeWidth={3} fillOpacity={1} fill="url(#rfill)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-lg font-semibold">Quick actions</h3>
                        <div className="mt-4 space-y-3">
                          <button onClick={() => setView('products')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800">
                            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Quản lý sản phẩm</span>
                            <CirclePlus className="h-4 w-4" />
                          </button>
                          <button onClick={() => setView('orders')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800">
                            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Quản lý đơn hàng</span>
                            <CirclePlus className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setView('users')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800">
                              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Quản lý người dùng</span>
                              <CirclePlus className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-6 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/60">
                          <div className="text-sm text-slate-500 dark:text-slate-400">Số sản phẩm đang hoạt động</div>
                          <div className="mt-2 text-3xl font-semibold">{products.filter((p) => p.isActive).length}</div>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {view === 'products' && (
                  <section className="grid gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{editingProductId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}</h3>
                        {editingProductId && <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Editing</span>}
                      </div>
                      <form onSubmit={saveProduct} className="mt-4 space-y-3">
                        <input value={productForm.title} onChange={(e) => setProductForm((v) => ({ ...v, title: e.target.value }))} placeholder="Tên sản phẩm" className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                        <textarea value={productForm.description} onChange={(e) => setProductForm((v) => ({ ...v, description: e.target.value }))} placeholder="Mô tả" className="min-h-28 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                        <input value={productForm.category} onChange={(e) => setProductForm((v) => ({ ...v, category: e.target.value }))} placeholder="Danh mục" className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={productForm.price} onChange={(e) => setProductForm((v) => ({ ...v, price: Number(e.target.value) }))} placeholder="Giá" className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                          <input type="number" value={productForm.stock} onChange={(e) => setProductForm((v) => ({ ...v, stock: Number(e.target.value) }))} placeholder="Tồn kho" className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                        </div>
                        <input value={productForm.imageUrl} onChange={(e) => setProductForm((v) => ({ ...v, imageUrl: e.target.value }))} placeholder="Image URL" className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input type="checkbox" checked={productForm.isActive} onChange={(e) => setProductForm((v) => ({ ...v, isActive: e.target.checked }))} />
                          Active
                        </label>
                        <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
                          {editingProductId ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                        {editingProductId && (
                          <button type="button" onClick={() => { setEditingProductId(null); setProductForm(emptyProduct) }} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium dark:border-slate-800">
                            Hủy chỉnh sửa
                          </button>
                        )}
                      </form>
                    </div>

                    <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Danh sách sản phẩm</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Hover, edit, delete, toggle active</p>
                        </div>
                        <button onClick={() => setOrderForm((v) => ({ ...v, productId: products[0]?.id || '' }))} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-800">
                          Sync
                        </button>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        {loading && !products.length ? <LoadingRows /> : (
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="px-4 py-3">Tên</th>
                                <th className="px-4 py-3">Danh mục</th>
                                <th className="px-4 py-3">Giá</th>
                                <th className="px-4 py-3">Kho</th>
                                <th className="px-4 py-3">Active</th>
                                <th className="px-4 py-3">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {products.length === 0 ? (
                                <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">Không có sản phẩm</td></tr>
                              ) : (
                                products.map((p) => (
                                  <tr key={p.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    <td className="px-4 py-4">
                                      <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                                      <div className="max-w-sm truncate text-xs text-slate-500 dark:text-slate-400">{p.description}</div>
                                    </td>
                                    <td className="px-4 py-4 text-sm">{p.category}</td>
                                    <td className="px-4 py-4 text-sm font-medium">{money(p.price)}</td>
                                    <td className="px-4 py-4 text-sm">{p.stock}</td>
                                    <td className="px-4 py-4 text-sm">{p.isActive ? 'Yes' : 'No'}</td>
                                    <td className="px-4 py-4">
                                      <div className="flex gap-2">
                                        <button onClick={() => editProduct(p)} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800" title="Edit">
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => deleteProduct(p.id)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-800" title="Delete">
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {view === 'orders' && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-6 xl:grid-cols-3">
                      <div className="xl:col-span-1 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <h3 className="text-lg font-semibold">Tạo đơn hàng</h3>
                        <div className="mt-4 space-y-3">
                          <select value={orderForm.productId} onChange={(e) => setOrderForm((v) => ({ ...v, productId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800">
                            <option value="">Chọn sản phẩm</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                          </select>
                          <input type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm((v) => ({ ...v, quantity: Number(e.target.value) }))} className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-slate-800" />
                          <button onClick={saveOrder} disabled={loading || !orderForm.productId} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
                            Tạo đơn
                          </button>
                        </div>
                      </div>

                      <div className="xl:col-span-2 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                          <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <th className="px-4 py-3">Mã</th>
                              <th className="px-4 py-3">Khách hàng</th>
                              <th className="px-4 py-3">Sản phẩm</th>
                              <th className="px-4 py-3">Tiền</th>
                              <th className="px-4 py-3">Trạng thái</th>
                              <th className="px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {orders.length === 0 ? (
                              <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">Không có đơn hàng</td></tr>
                            ) : (
                              orders.map((o) => (
                                <tr key={o.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="px-4 py-4 text-sm font-medium">{o.id.slice(0, 8)}...</td>
                                  <td className="px-4 py-4 text-sm">{o.customerEmail}</td>
                                  <td className="px-4 py-4 text-sm">{o.productName}</td>
                                  <td className="px-4 py-4 text-sm font-medium">{money(o.amount)}</td>
                                  <td className="px-4 py-4">
                                    <select
                                      value={selectedOrderStatus[o.id] || o.status}
                                      onChange={(e) => setSelectedOrderStatus((v) => ({ ...v, [o.id]: e.target.value }))}
                                      className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
                                    >
                                      {statusOptions.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => updateOrderStatus(o.id, selectedOrderStatus[o.id] || o.status)}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                                      >
                                        Cập nhật
                                      </button>
                                      <button onClick={() => deleteOrder(o.id)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-800">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {view === 'users' && isAdmin && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Tên</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {users.length === 0 ? (
                            <tr><td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">Không có người dùng</td></tr>
                          ) : users.map((u) => (
                            <tr key={u.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-4 text-sm font-medium">{u.email}</td>
                              <td className="px-4 py-4 text-sm">{u.fullName || '-'}</td>
                              <td className="px-4 py-4">
                                <select value={selectedRole[u.id] || u.role} onChange={(e) => setSelectedRole((v) => ({ ...v, [u.id]: e.target.value }))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800">
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="USER">USER</option>
                                </select>
                              </td>
                              <td className="px-4 py-4 text-sm">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <button onClick={() => updateUserRole(u.id, selectedRole[u.id] || u.role)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                                    Lưu role
                                  </button>
                                  <button onClick={() => deleteUser(u.id)} className="rounded-xl border border-slate-200 p-2 text-rose-600 dark:border-slate-800">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {view === 'settings' && (
                  <section className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-lg font-semibold">Cài đặt giao diện</h3>
                      <div className="mt-4 space-y-3">
                        <button onClick={() => setDark((v) => !v)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800">
                          Toggle dark mode
                        </button>
                        <button onClick={refreshAll} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800">
                          Reload data
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-lg font-semibold">Deploy checklist</h3>
                      <ul className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                        <li>• Frontend: Vercel, root = <code>client</code></li>
                        <li>• Backend: Render, root = <code>server</code></li>
                        <li>• Database: PostgreSQL thật</li>
                        <li>• Env: DATABASE_URL, JWT_SECRET, CLIENT_URL</li>
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            </main>
          </div>
        </div>

        {sidebarOpen && <button onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      </div>
    </div>
  )
}
