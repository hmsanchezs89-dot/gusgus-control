import React, { Component, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <div className="panel danger">
            <h1>⚠️ Error controlado</h1>
            <p>La app no quedó en pantalla negra. Copia este mensaje si necesitas revisar:</p>
            <pre>{String(this.state.error?.message || this.state.error)}</pre>
            <button className="primary" onClick={() => location.reload()}>Recargar app</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = rawUrl.replace('/rest/v1/', '').replace(/\/$/, '')
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const defaultProducts = [
  { id: 'demo1', codigo: 'A1', nombre: 'El Para Mí', categoria: 'Alitas', precio_local: 99, precio_whatsapp: 99, precio_didi: 159, precio_uber: 169, costo_base: 36.79 },
  { id: 'demo2', codigo: 'A2', nombre: 'Combo Antojo', categoria: 'Alitas', precio_local: 165, precio_whatsapp: 165, precio_didi: 289, precio_uber: 299, costo_base: 68.15 },
  { id: 'demo3', codigo: 'B1', nombre: 'Obelisco Personal', categoria: 'Boneless', precio_local: 109, precio_whatsapp: 109, precio_didi: 179, precio_uber: 189, costo_base: 50.79 },
]

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function todayOperational() {
  const d = new Date()
  if (d.getHours() >= 0 && d.getHours() < 5) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function price(product, channel) {
  const field = {
    Local: 'precio_local',
    WhatsApp: 'precio_whatsapp',
    Didi: 'precio_didi',
    Uber: 'precio_uber',
  }[channel] || 'precio_local'
  return Number(product?.[field] ?? product?.precio_local ?? 0)
}

function calcCart(items, channel, discount = 0) {
  const subtotal = items.reduce((s, i) => s + price(i, channel) * Number(i.qty || 1), 0)
  const safeDiscount = Math.min(Math.max(Number(discount || 0), 0), subtotal)
  const finalTotal = subtotal - safeDiscount
  const cost = items.reduce((s, i) => s + Number(i.costo_base || 0) * Number(i.qty || 1), 0)
  const commissionPct = channel === 'Didi' ? 30 : channel === 'Uber' ? 35 : 0
  const commission = finalTotal * commissionPct / 100
  const iva = finalTotal * 0.16
  const resico = finalTotal * 0.0625
  const before = finalTotal - cost - commission - iva - resico
  const reinvest = Math.max(0, before * 0.20)
  const profit = before - reinvest
  const locked = iva + resico + reinvest
  return { subtotal, discount: safeDiscount, finalTotal, cost, commission, iva, resico, reinvest, profit, locked }
}

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToThursday = (day >= 4) ? day - 4 : day + 3
  const start = new Date(now)
  start.setDate(now.getDate() - diffToThursday)
  const end = new Date(start)
  end.setDate(start.getDate() + 4)
  return {
    start: start.toISOString().slice(0,10),
    end: end.toISOString().slice(0,10),
  }
}

function App() {
  const [tab, setTab] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [saleItems, setSaleItems] = useState([])
  const [expenses, setExpenses] = useState([])
  const [inventory, setInventory] = useState([])
  const [purchases, setPurchases] = useState([])
  const [waste, setWaste] = useState([])
  const [cart, setCart] = useState([])
  const [channel, setChannel] = useState('Local')
  const [payment, setPayment] = useState('Efectivo')
  const [discount, setDiscount] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [newProduct, setNewProduct] = useState({ codigo:'', nombre:'', categoria:'General', precio_local:'', precio_whatsapp:'', precio_didi:'', precio_uber:'', costo_base:'' })
  const [newExpense, setNewExpense] = useState({ categoria:'', monto:'', descripcion:'' })
  const [newPurchase, setNewPurchase] = useState({ ingrediente:'', cantidad:'', unidad:'g', costo_total:'', proveedor:'' })
  const [newWaste, setNewWaste] = useState({ producto:'', cantidad:'', unidad:'g', motivo:'', perdida:'' })
  const [newInventory, setNewInventory] = useState({ nombre:'', unidad:'pza', stock_actual:'', stock_minimo:'', costo_unitario:'', proveedor:'' })

  const cartSummary = useMemo(() => calcCart(cart, channel, discount), [cart, channel, discount])

  async function query(label, promise, fallback=[]) {
    try {
      const res = await promise
      if (res.error) {
        setMessage(m => `${m ? m + ' | ' : ''}${label}: ${res.error.message}`)
        return fallback
      }
      return res.data || fallback
    } catch (err) {
      setMessage(m => `${m ? m + ' | ' : ''}${label}: ${err.message}`)
      return fallback
    }
  }

  async function loadAll() {
    setMessage('')
    if (!supabase) {
      setProducts(defaultProducts)
      setMessage('Faltan variables de Supabase. La app está en modo demo.')
      return
    }

    setLoading(true)
    const [p, s, si, e, inv, pur, w] = await Promise.all([
      query('Productos', supabase.from('products').select('*').eq('activo', true).order('codigo'), defaultProducts),
      query('Ventas', supabase.from('sales').select('*').order('created_at', { ascending:false }).limit(300), []),
      query('Detalle ventas', supabase.from('sale_items').select('*').order('created_at', { ascending:false }).limit(500), []),
      query('Gastos', supabase.from('expenses').select('*').order('created_at', { ascending:false }).limit(300), []),
      query('Inventario', supabase.from('inventory').select('*').order('nombre'), []),
      query('Compras', supabase.from('purchases').select('*').order('created_at', { ascending:false }).limit(300), []),
      query('Mermas', supabase.from('waste').select('*').order('created_at', { ascending:false }).limit(300), []),
    ])

    setProducts(p.length ? p : defaultProducts)
    setSales(s)
    setSaleItems(si)
    setExpenses(e)
    setInventory(inv)
    setPurchases(pur)
    setWaste(w)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function addToCart(product) {
    const found = cart.find(i => i.id === product.id)
    if (found) setCart(cart.map(i => i.id === product.id ? { ...i, qty: Number(i.qty || 1) + 1 } : i))
    else setCart([...cart, { ...product, qty: 1 }])
  }

  function setQty(id, delta) {
    setCart(cart.map(i => i.id === id ? { ...i, qty: Math.max(1, Number(i.qty || 1) + delta) } : i))
  }

  async function charge() {
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    if (!cart.length) return

    setLoading(true)
    setMessage('Guardando venta...')
    const salePayload = {
      fecha_operativa: todayOperational(),
      fecha_real: new Date().toISOString(),
      canal: channel,
      metodo_pago: payment,
      subtotal: cartSummary.subtotal,
      descuento: cartSummary.discount,
      motivo_descuento: discountReason,
      total_final: cartSummary.finalTotal,
      costo_total: cartSummary.cost,
      iva: cartSummary.iva,
      resico: cartSummary.resico,
      comision: cartSummary.commission,
      reinversion: cartSummary.reinvest,
      utilidad_real: cartSummary.profit,
      no_tocar: cartSummary.locked,
    }

    const { data: sale, error } = await supabase.from('sales').insert(salePayload).select().single()
    if (error) {
      setMessage('Error venta: ' + error.message)
      setLoading(false)
      return
    }

    const items = cart.map(i => ({
      sale_id: sale.id,
      product_id: String(i.id).startsWith('demo') ? null : i.id,
      cantidad: Number(i.qty || 1),
      precio_unitario: price(i, channel),
      costo_unitario: Number(i.costo_base || 0),
      nombre_producto: i.nombre,
      codigo_producto: i.codigo,
    }))

    const detail = await supabase.from('sale_items').insert(items)
    if (detail.error) setMessage('Venta guardada, detalle falló: ' + detail.error.message)
    else setMessage('✅ Venta guardada correctamente.')

    setCart([])
    setDiscount(0)
    setDiscountReason('')
    await loadAll()
    setLoading(false)
  }

  async function saveProduct(e) {
    e.preventDefault()
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    const payload = {
      codigo: newProduct.codigo.trim(),
      nombre: newProduct.nombre.trim(),
      categoria: newProduct.categoria.trim() || 'General',
      precio_local: Number(newProduct.precio_local || 0),
      precio_whatsapp: Number(newProduct.precio_whatsapp || newProduct.precio_local || 0),
      precio_didi: Number(newProduct.precio_didi || 0),
      precio_uber: Number(newProduct.precio_uber || 0),
      costo_base: Number(newProduct.costo_base || 0),
      activo: true,
    }
    if (!payload.codigo || !payload.nombre) return setMessage('Código y nombre son obligatorios.')
    setLoading(true)
    const { error } = await supabase.from('products').insert(payload)
    if (error) setMessage('Error producto: ' + error.message)
    else {
      setMessage('✅ Producto guardado.')
      setNewProduct({ codigo:'', nombre:'', categoria:'General', precio_local:'', precio_whatsapp:'', precio_didi:'', precio_uber:'', costo_base:'' })
      await loadAll()
    }
    setLoading(false)
  }

  async function saveExpense(e) {
    e.preventDefault()
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    setLoading(true)
    const { error } = await supabase.from('expenses').insert({
      categoria: newExpense.categoria || 'General',
      monto: Number(newExpense.monto || 0),
      descripcion: newExpense.descripcion || '',
      fecha: todayOperational()
    })
    if (error) setMessage('Error gasto: ' + error.message)
    else {
      setMessage('✅ Gasto guardado.')
      setNewExpense({ categoria:'', monto:'', descripcion:'' })
      await loadAll()
    }
    setLoading(false)
  }

  async function savePurchase(e) {
    e.preventDefault()
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    setLoading(true)
    const { error } = await supabase.from('purchases').insert({
      ingrediente: newPurchase.ingrediente || 'Sin nombre',
      cantidad: Number(newPurchase.cantidad || 0),
      unidad: newPurchase.unidad || 'pza',
      costo_total: Number(newPurchase.costo_total || 0),
      proveedor: newPurchase.proveedor || '',
      fecha: todayOperational()
    })
    if (error) setMessage('Error compra: ' + error.message)
    else {
      setMessage('✅ Compra guardada.')
      setNewPurchase({ ingrediente:'', cantidad:'', unidad:'g', costo_total:'', proveedor:'' })
      await loadAll()
    }
    setLoading(false)
  }

  async function saveWaste(e) {
    e.preventDefault()
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    setLoading(true)
    const { error } = await supabase.from('waste').insert({
      producto: newWaste.producto || 'Sin nombre',
      cantidad: Number(newWaste.cantidad || 0),
      unidad: newWaste.unidad || 'pza',
      motivo: newWaste.motivo || '',
      perdida: Number(newWaste.perdida || 0),
      fecha: todayOperational()
    })
    if (error) setMessage('Error merma: ' + error.message)
    else {
      setMessage('✅ Merma guardada.')
      setNewWaste({ producto:'', cantidad:'', unidad:'g', motivo:'', perdida:'' })
      await loadAll()
    }
    setLoading(false)
  }

  async function saveInventory(e) {
    e.preventDefault()
    if (!supabase) return setMessage('No hay conexión a Supabase.')
    setLoading(true)
    const { error } = await supabase.from('inventory').insert({
      nombre: newInventory.nombre || 'Sin nombre',
      unidad: newInventory.unidad || 'pza',
      stock_actual: Number(newInventory.stock_actual || 0),
      stock_minimo: Number(newInventory.stock_minimo || 0),
      costo_unitario: Number(newInventory.costo_unitario || 0),
      proveedor: newInventory.proveedor || '',
    })
    if (error) setMessage('Error inventario: ' + error.message)
    else {
      setMessage('✅ Inventario guardado.')
      setNewInventory({ nombre:'', unidad:'pza', stock_actual:'', stock_minimo:'', costo_unitario:'', proveedor:'' })
      await loadAll()
    }
    setLoading(false)
  }

  const today = todayOperational()
  const week = weekRange()
  const salesToday = sales.filter(v => v.fecha_operativa === today)
  const salesWeek = sales.filter(v => v.fecha_operativa >= week.start && v.fecha_operativa <= week.end)
  const sum = (arr, field) => arr.reduce((s, i) => s + Number(i[field] || 0), 0)
  const expensesToday = expenses.filter(x => x.fecha === today)
  const wasteToday = waste.filter(x => x.fecha === today)
  const purchasesToday = purchases.filter(x => x.fecha === today)

  const topProducts = Object.values(saleItems.reduce((acc, item) => {
    const key = item.codigo_producto || item.nombre_producto
    if (!acc[key]) acc[key] = { name: item.nombre_producto, qty: 0, total: 0 }
    acc[key].qty += Number(item.cantidad || 0)
    acc[key].total += Number(item.precio_unitario || 0) * Number(item.cantidad || 0)
    return acc
  }, {})).sort((a,b) => b.qty - a.qty).slice(0,5)

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="sub">GUS GUS CONTROL PRO</p>
          <h1>🍗 Wings & Snacks</h1>
          <small>Ventas · Inventario · SAT · Cortes · Compras · Mermas</small>
        </div>
        <button className="primary" onClick={loadAll}>{loading ? 'Cargando...' : 'Actualizar'}</button>
      </header>

      {message && <div className="message">{message}</div>}

      <nav className="nav">
        {[
          ['dashboard','🏠 Inicio'],
          ['caja','💵 Caja'],
          ['ventas','📈 Ventas'],
          ['productos','🍗 Productos'],
          ['inventario','📦 Inventario'],
          ['compras','🛒 Compras'],
          ['mermas','⚠️ Mermas'],
          ['gastos','💸 Gastos'],
          ['sat','🧾 SAT'],
        ].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{label}</button>
        ))}
      </nav>

      <section className="stats">
        <div><span>Ventas hoy</span><b>{money(sum(salesToday,'subtotal'))}</b></div>
        <div><span>Utilidad hoy</span><b>{money(sum(salesToday,'utilidad_real'))}</b></div>
        <div><span>No tocar hoy</span><b>{money(sum(salesToday,'no_tocar'))}</b></div>
        <div><span>Gastos hoy</span><b>{money(sum(expensesToday,'monto'))}</b></div>
      </section>

      {tab === 'dashboard' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Resumen semanal jueves-lunes</h2>
            <p className="muted">Periodo: {week.start} → {week.end}</p>
            <div className="cards2">
              <div><span>Ventas semana</span><b>{money(sum(salesWeek,'subtotal'))}</b></div>
              <div><span>Utilidad semana</span><b>{money(sum(salesWeek,'utilidad_real'))}</b></div>
              <div><span>SAT / No tocar</span><b>{money(sum(salesWeek,'no_tocar'))}</b></div>
              <div><span>Órdenes semana</span><b>{salesWeek.length}</b></div>
            </div>
            <h3>Top productos</h3>
            {topProducts.length === 0 ? <p className="muted">Aún no hay ventas suficientes.</p> : topProducts.map(p => (
              <div className="row" key={p.name}><b>{p.name}</b><span>{p.qty} vendidos</span><span>{money(p.total)}</span></div>
            ))}
          </section>
          <aside className="panel">
            <h2>Alertas</h2>
            {inventory.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).map(i => (
              <div className="alert" key={i.id}>⚠️ {i.nombre} bajo: {i.stock_actual} {i.unidad}</div>
            ))}
            {inventory.length === 0 && <p className="muted">Agrega inventario para ver alertas.</p>}
            <div className="alert">📅 Corte operativo: jueves a lunes</div>
            <div className="alert">🌙 Madrugada cuenta al día anterior hasta las 5 AM</div>
          </aside>
        </main>
      )}

      {tab === 'caja' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Caja rápida</h2>
            <div className="chips">{['Local','WhatsApp','Didi','Uber'].map(c => <button key={c} onClick={() => setChannel(c)} className={channel === c ? 'on' : ''}>{c}</button>)}</div>
            <div className="productGrid">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}>
                  <strong>{p.codigo}</strong>
                  <b>{p.nombre}</b>
                  <span>{channel}: {money(price(p, channel))}</span>
                  <small>Costo {money(p.costo_base)}</small>
                </button>
              ))}
            </div>
          </section>
          <aside className="panel">
            <h2>Carrito</h2>
            {cart.length === 0 && <p className="muted">Agrega productos.</p>}
            {cart.map(i => (
              <div className="cartItem" key={i.id}>
                <div>
                  <b>{i.codigo} {i.nombre}</b>
                  <small>{money(price(i, channel))} c/u</small>
                </div>
                <div className="cartControls">
                  <button type="button" onClick={() => setQty(i.id, -1)}>-1</button>
                  <span>{i.qty}</span>
                  <button type="button" onClick={() => setQty(i.id, 1)}>+1</button>
                  <button
                    type="button"
                    className="deleteItem"
                    onClick={() => setCart(cart.filter(x => x.id !== i.id))}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <button
                type="button"
                className="clearCart"
                onClick={() => {
                  setCart([])
                  setDiscount(0)
                  setDiscountReason('')
                }}
              >
                Vaciar carrito
              </button>
            )}
            <div className="discountBox">
              <h3>Descuento en pesos</h3>
              <div className="quickDiscounts">
                {[10, 20, 30, 50].map(d => (
                  <button key={d} onClick={() => setDiscount(Number(discount || 0) + d)}>-${d}</button>
                ))}
                <button onClick={() => setDiscount(cartSummary.subtotal)}>Gratis</button>
                <button onClick={() => setDiscount(0)}>Quitar</button>
              </div>
              <input
                placeholder="Descuento manual en pesos"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
              />
              <input
                placeholder="Motivo: envío, cortesía, promoción..."
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
              />
            </div>

            <div className="summary">
              <p><span>Subtotal</span><b>{money(cartSummary.subtotal)}</b></p>
              <p className="dangerText"><span>Descuento</span><b>-{money(cartSummary.discount)}</b></p>
              <p><span>Total final</span><b>{money(cartSummary.finalTotal)}</b></p>
              <p><span>Costo</span><b>{money(cartSummary.cost)}</b></p>
              <p><span>Comisión</span><b>{money(cartSummary.commission)}</b></p>
              <p><span>IVA</span><b>{money(cartSummary.iva)}</b></p>
              <p><span>RESICO</span><b>{money(cartSummary.resico)}</b></p>
              <p><span>Reinversión</span><b>{money(cartSummary.reinvest)}</b></p>
              <p className="dangerText"><span>No tocar</span><b>{money(cartSummary.locked)}</b></p>
              <p className="okText"><span>Utilidad real</span><b>{money(cartSummary.profit)}</b></p>
            </div>
            <div className="chips">{['Efectivo','Transferencia','Tarjeta'].map(m => <button key={m} onClick={() => setPayment(m)} className={payment === m ? 'on' : ''}>{m}</button>)}</div>
            <button className="charge" onClick={charge} disabled={cart.length === 0 || loading}>COBRAR {money(cartSummary.finalTotal)}</button>
          </aside>
        </main>
      )}

      {tab === 'ventas' && (
        <section className="panel">
          <h2>Ventas guardadas</h2>
          {sales.map(v => (
            <div className="row" key={v.id}>
              <span>{v.fecha_operativa}</span><span>{v.canal}</span><span>{v.metodo_pago}</span><b>{money(v.total_final || v.subtotal)}</b><span>Desc. {money(v.descuento)}</span><b className="okText">{money(v.utilidad_real)}</b><b className="dangerText">{money(v.no_tocar)}</b>
            </div>
          ))}
        </section>
      )}

      {tab === 'productos' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Productos</h2>
            {products.map(p => (
              <div className="row" key={p.id}><b>{p.codigo}</b><span>{p.nombre}</span><span>{p.categoria}</span><span>Local {money(p.precio_local)}</span><span>Didi {money(p.precio_didi)}</span><span>Costo {money(p.costo_base)}</span></div>
            ))}
          </section>
          <form className="panel form" onSubmit={saveProduct}>
            <h2>Nuevo producto</h2>
            {Object.keys(newProduct).map(k => <input key={k} placeholder={k} value={newProduct[k]} onChange={e => setNewProduct({...newProduct, [k]: e.target.value})} />)}
            <button className="charge">Guardar producto</button>
          </form>
        </main>
      )}

      {tab === 'inventario' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Inventario</h2>
            {inventory.map(i => (
              <div className="row" key={i.id}><b>{i.nombre}</b><span>{i.stock_actual} {i.unidad}</span><span>Mínimo {i.stock_minimo}</span><span>Costo {money(i.costo_unitario)}</span><span>{i.proveedor}</span></div>
            ))}
          </section>
          <form className="panel form" onSubmit={saveInventory}>
            <h2>Nuevo inventario</h2>
            {Object.keys(newInventory).map(k => <input key={k} placeholder={k} value={newInventory[k]} onChange={e => setNewInventory({...newInventory, [k]: e.target.value})} />)}
            <button className="charge">Guardar inventario</button>
          </form>
        </main>
      )}

      {tab === 'compras' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Compras</h2>
            <div className="cards2">
              <div><span>Compras hoy</span><b>{money(sum(purchasesToday,'costo_total'))}</b></div>
              <div><span>Registros</span><b>{purchases.length}</b></div>
            </div>
            {purchases.map(p => <div className="row" key={p.id}><span>{p.fecha}</span><b>{p.ingrediente}</b><span>{p.cantidad} {p.unidad}</span><span>{p.proveedor}</span><b>{money(p.costo_total)}</b></div>)}
          </section>
          <form className="panel form" onSubmit={savePurchase}>
            <h2>Nueva compra</h2>
            {Object.keys(newPurchase).map(k => <input key={k} placeholder={k} value={newPurchase[k]} onChange={e => setNewPurchase({...newPurchase, [k]: e.target.value})} />)}
            <button className="charge">Guardar compra</button>
          </form>
        </main>
      )}

      {tab === 'mermas' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Mermas y cortesías</h2>
            <div className="cards2">
              <div><span>Pérdida hoy</span><b>{money(sum(wasteToday,'perdida'))}</b></div>
              <div><span>Registros</span><b>{waste.length}</b></div>
            </div>
            {waste.map(w => <div className="row" key={w.id}><span>{w.fecha}</span><b>{w.producto}</b><span>{w.cantidad} {w.unidad}</span><span>{w.motivo}</span><b className="dangerText">{money(w.perdida)}</b></div>)}
          </section>
          <form className="panel form" onSubmit={saveWaste}>
            <h2>Nueva merma</h2>
            {Object.keys(newWaste).map(k => <input key={k} placeholder={k} value={newWaste[k]} onChange={e => setNewWaste({...newWaste, [k]: e.target.value})} />)}
            <button className="charge">Guardar merma</button>
          </form>
        </main>
      )}

      {tab === 'gastos' && (
        <main className="grid">
          <section className="panel wide">
            <h2>Gastos</h2>
            {expenses.map(g => <div className="row" key={g.id}><span>{g.fecha}</span><b>{g.categoria}</b><span>{g.descripcion}</span><b className="dangerText">{money(g.monto)}</b></div>)}
          </section>
          <form className="panel form" onSubmit={saveExpense}>
            <h2>Nuevo gasto</h2>
            {Object.keys(newExpense).map(k => <input key={k} placeholder={k} value={newExpense[k]} onChange={e => setNewExpense({...newExpense, [k]: e.target.value})} />)}
            <button className="charge">Guardar gasto</button>
          </form>
        </main>
      )}

      {tab === 'sat' && (
        <section className="panel">
          <h2>SAT / Dinero no tocar</h2>
          <div className="cards2">
            <div><span>IVA hoy</span><b>{money(sum(salesToday,'iva'))}</b></div>
            <div><span>RESICO hoy</span><b>{money(sum(salesToday,'resico'))}</b></div>
            <div><span>Reinversión hoy</span><b>{money(sum(salesToday,'reinversion'))}</b></div>
            <div><span>Total no tocar</span><b>{money(sum(salesToday,'no_tocar'))}</b></div>
          </div>
          <p className="notice">Estimación operativa. Valídalo con tu contador antes de declarar.</p>
        </section>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>)
