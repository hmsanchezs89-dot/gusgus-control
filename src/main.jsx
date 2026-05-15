import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = rawUrl.replace('/rest/v1/', '').replace(/\/$/, '')
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const config = {
  iva: 16,
  resico: 6.25,
  comisionDidi: 30,
  comisionUber: 35,
  reinversion: 20,
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function precioPorCanal(producto, canal) {
  const map = {
    Local: 'precio_local',
    WhatsApp: 'precio_whatsapp',
    Didi: 'precio_didi',
    Uber: 'precio_uber',
  }
  return Number(producto[map[canal]] || producto.precio_local || 0)
}

function fechaOperativa() {
  const d = new Date()
  const h = d.getHours()
  if (h >= 0 && h < 5) d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function calcularResumen(items, canal) {
  const subtotal = items.reduce((s, i) => s + precioPorCanal(i, canal) * i.cantidad, 0)
  const costo = items.reduce((s, i) => s + Number(i.costo_base || 0) * i.cantidad, 0)
  const comisionPct = canal === 'Didi' ? config.comisionDidi : canal === 'Uber' ? config.comisionUber : 0
  const comision = subtotal * (comisionPct / 100)
  const iva = subtotal * (config.iva / 100)
  const resico = subtotal * (config.resico / 100)
  const antesReparto = subtotal - costo - comision - iva - resico
  const reinversion = Math.max(0, antesReparto * (config.reinversion / 100))
  const utilidad = antesReparto - reinversion
  const noTocar = iva + resico + reinversion
  return { subtotal, costo, comision, iva, resico, reinversion, utilidad, noTocar }
}

function App() {
  const [tab, setTab] = useState('caja')
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [canal, setCanal] = useState('Local')
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: '',
    nombre: '',
    categoria: 'General',
    precio_local: '',
    precio_whatsapp: '',
    precio_didi: '',
    precio_uber: '',
    costo_base: '',
  })
  const [nuevoGasto, setNuevoGasto] = useState({
    categoria: '',
    monto: '',
    descripcion: '',
  })

  const resumen = useMemo(() => calcularResumen(carrito, canal), [carrito, canal])

  async function cargarTodo() {
    if (!supabase) {
      setMensaje('Faltan variables de Supabase en Vercel.')
      return
    }
    setLoading(true)
    const [p, v, g] = await Promise.all([
      supabase.from('products').select('*').eq('activo', true).order('codigo'),
      supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    if (p.error) setMensaje('Error productos: ' + p.error.message)
    else setProductos(p.data || [])

    if (v.error) setMensaje('Error ventas: ' + v.error.message)
    else setVentas(v.data || [])

    if (g.error) setMensaje('Error gastos: ' + g.error.message)
    else setGastos(g.data || [])

    setLoading(false)
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  function agregarProducto(producto) {
    const existe = carrito.find((i) => i.id === producto.id)
    if (existe) {
      setCarrito(carrito.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }])
    }
  }

  function cambiarCantidad(id, delta) {
    setCarrito(carrito.map((i) => i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i))
  }

  function quitar(id) {
    setCarrito(carrito.filter((i) => i.id !== id))
  }

  async function cobrar() {
    if (!supabase || carrito.length === 0) return
    setLoading(true)
    setMensaje('Guardando venta...')

    const ventaPayload = {
      fecha_operativa: fechaOperativa(),
      fecha_real: new Date().toISOString(),
      canal,
      metodo_pago: metodoPago,
      subtotal: resumen.subtotal,
      costo_total: resumen.costo,
      iva: resumen.iva,
      resico: resumen.resico,
      comision: resumen.comision,
      utilidad_real: resumen.utilidad,
      no_tocar: resumen.noTocar,
    }

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert(ventaPayload)
      .select()
      .single()

    if (saleError) {
      setMensaje('Error al guardar venta: ' + saleError.message)
      setLoading(false)
      return
    }

    const items = carrito.map((i) => ({
      sale_id: sale.id,
      product_id: i.id,
      cantidad: i.cantidad,
      precio_unitario: precioPorCanal(i, canal),
      costo_unitario: Number(i.costo_base || 0),
      nombre_producto: i.nombre,
      codigo_producto: i.codigo,
    }))

    const { error: itemsError } = await supabase.from('sale_items').insert(items)
    if (itemsError) {
      setMensaje('Venta guardada, pero error en detalle: ' + itemsError.message)
    } else {
      setMensaje('✅ Venta guardada correctamente.')
      setCarrito([])
    }

    await cargarTodo()
    setLoading(false)
  }

  async function crearProducto(e) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    const payload = {
      ...nuevoProducto,
      precio_local: Number(nuevoProducto.precio_local || 0),
      precio_whatsapp: Number(nuevoProducto.precio_whatsapp || nuevoProducto.precio_local || 0),
      precio_didi: Number(nuevoProducto.precio_didi || 0),
      precio_uber: Number(nuevoProducto.precio_uber || 0),
      costo_base: Number(nuevoProducto.costo_base || 0),
    }
    const { error } = await supabase.from('products').insert(payload)
    if (error) setMensaje('Error producto: ' + error.message)
    else {
      setMensaje('✅ Producto creado.')
      setNuevoProducto({ codigo: '', nombre: '', categoria: 'General', precio_local: '', precio_whatsapp: '', precio_didi: '', precio_uber: '', costo_base: '' })
      await cargarTodo()
    }
    setLoading(false)
  }

  async function crearGasto(e) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    const { error } = await supabase.from('expenses').insert({
      categoria: nuevoGasto.categoria,
      monto: Number(nuevoGasto.monto || 0),
      descripcion: nuevoGasto.descripcion,
      fecha: new Date().toISOString().split('T')[0],
    })
    if (error) setMensaje('Error gasto: ' + error.message)
    else {
      setMensaje('✅ Gasto guardado.')
      setNuevoGasto({ categoria: '', monto: '', descripcion: '' })
      await cargarTodo()
    }
    setLoading(false)
  }

  const ventasHoy = ventas
    .filter((v) => v.fecha_operativa === fechaOperativa())
    .reduce((s, v) => s + Number(v.subtotal || 0), 0)

  const utilidadHoy = ventas
    .filter((v) => v.fecha_operativa === fechaOperativa())
    .reduce((s, v) => s + Number(v.utilidad_real || 0), 0)

  const noTocarHoy = ventas
    .filter((v) => v.fecha_operativa === fechaOperativa())
    .reduce((s, v) => s + Number(v.no_tocar || 0), 0)

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="brand-sub">GUS GUS CONTROL</p>
          <h1>🍗 Wings & Snacks</h1>
          <p className="muted">App funcional en nube · Supabase + Vercel</p>
        </div>
        <button className="refresh" onClick={cargarTodo} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </header>

      {mensaje && <div className="message">{mensaje}</div>}

      <nav className="nav">
        {[
          ['caja', '💵 Caja'],
          ['ventas', '📈 Ventas'],
          ['productos', '🍗 Productos'],
          ['gastos', '💸 Gastos'],
          ['sat', '🧾 SAT'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{label}</button>
        ))}
      </nav>

      <section className="cards">
        <div className="card"><span>Ventas hoy</span><b>{money(ventasHoy)}</b></div>
        <div className="card"><span>Utilidad hoy</span><b>{money(utilidadHoy)}</b></div>
        <div className="card"><span>No tocar</span><b>{money(noTocarHoy)}</b></div>
        <div className="card"><span>Ventas guardadas</span><b>{ventas.length}</b></div>
      </section>

      {tab === 'caja' && (
        <main className="layout">
          <section className="panel wide">
            <h2>Caja rápida</h2>
            <div className="channels">
              {['Local', 'WhatsApp', 'Didi', 'Uber'].map((c) => (
                <button key={c} onClick={() => setCanal(c)} className={canal === c ? 'selected' : ''}>{c}</button>
              ))}
            </div>

            <div className="product-grid">
              {productos.map((p) => (
                <button key={p.id} className="product" onClick={() => agregarProducto(p)}>
                  <span className="code">{p.codigo}</span>
                  <b>{p.nombre}</b>
                  <small>{canal}: {money(precioPorCanal(p, canal))}</small>
                  <small>Costo: {money(p.costo_base)}</small>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel cart">
            <h2>Carrito</h2>
            {carrito.length === 0 && <p className="muted">Agrega productos.</p>}
            {carrito.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <b>{item.codigo} {item.nombre}</b>
                  <small>{money(precioPorCanal(item, canal))} c/u</small>
                </div>
                <div className="qty">
                  <button onClick={() => cambiarCantidad(item.id, -1)}>-</button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.id, 1)}>+</button>
                  <button onClick={() => quitar(item.id)}>×</button>
                </div>
              </div>
            ))}

            <div className="summary">
              <p><span>Subtotal</span><b>{money(resumen.subtotal)}</b></p>
              <p><span>Costo</span><b>{money(resumen.costo)}</b></p>
              <p><span>Comisión</span><b>{money(resumen.comision)}</b></p>
              <p><span>IVA</span><b>{money(resumen.iva)}</b></p>
              <p><span>RESICO</span><b>{money(resumen.resico)}</b></p>
              <p className="red"><span>No tocar</span><b>{money(resumen.noTocar)}</b></p>
              <p className="green"><span>Utilidad</span><b>{money(resumen.utilidad)}</b></p>
            </div>

            <div className="channels">
              {['Efectivo', 'Transferencia', 'Tarjeta'].map((m) => (
                <button key={m} onClick={() => setMetodoPago(m)} className={metodoPago === m ? 'selected' : ''}>{m}</button>
              ))}
            </div>

            <button className="charge" onClick={cobrar} disabled={loading || carrito.length === 0}>
              COBRAR {money(resumen.subtotal)}
            </button>
          </aside>
        </main>
      )}

      {tab === 'ventas' && (
        <main className="panel">
          <h2>Ventas guardadas en Supabase</h2>
          <div className="table">
            {ventas.map((v) => (
              <div className="row" key={v.id}>
                <span>{v.fecha_operativa}</span>
                <span>{v.canal}</span>
                <span>{v.metodo_pago}</span>
                <b>{money(v.subtotal)}</b>
                <span className="green">{money(v.utilidad_real)}</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {tab === 'productos' && (
        <main className="layout">
          <section className="panel wide">
            <h2>Productos</h2>
            <div className="table">
              {productos.map((p) => (
                <div className="row" key={p.id}>
                  <span>{p.codigo}</span>
                  <b>{p.nombre}</b>
                  <span>{p.categoria}</span>
                  <span>Local {money(p.precio_local)}</span>
                  <span>Didi {money(p.precio_didi)}</span>
                  <span>Costo {money(p.costo_base)}</span>
                </div>
              ))}
            </div>
          </section>

          <form className="panel form" onSubmit={crearProducto}>
            <h2>Nuevo producto</h2>
            {['codigo', 'nombre', 'categoria', 'precio_local', 'precio_whatsapp', 'precio_didi', 'precio_uber', 'costo_base'].map((key) => (
              <input
                key={key}
                placeholder={key}
                value={nuevoProducto[key]}
                onChange={(e) => setNuevoProducto({ ...nuevoProducto, [key]: e.target.value })}
              />
            ))}
            <button className="charge">Guardar producto</button>
          </form>
        </main>
      )}

      {tab === 'gastos' && (
        <main className="layout">
          <section className="panel wide">
            <h2>Gastos guardados</h2>
            <div className="table">
              {gastos.map((g) => (
                <div className="row" key={g.id}>
                  <span>{g.fecha}</span>
                  <b>{g.categoria}</b>
                  <span>{g.descripcion}</span>
                  <span className="red">{money(g.monto)}</span>
                </div>
              ))}
            </div>
          </section>

          <form className="panel form" onSubmit={crearGasto}>
            <h2>Nuevo gasto</h2>
            <input placeholder="Categoría" value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })} />
            <input placeholder="Monto" value={nuevoGasto.monto} onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })} />
            <input placeholder="Descripción" value={nuevoGasto.descripcion} onChange={(e) => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })} />
            <button className="charge">Guardar gasto</button>
          </form>
        </main>
      )}

      {tab === 'sat' && (
        <main className="panel">
          <h2>SAT / Dinero no tocar</h2>
          <div className="cards">
            <div className="card"><span>IVA estimado hoy</span><b>{money(ventas.filter(v => v.fecha_operativa === fechaOperativa()).reduce((s,v)=>s+Number(v.iva||0),0))}</b></div>
            <div className="card"><span>RESICO hoy</span><b>{money(ventas.filter(v => v.fecha_operativa === fechaOperativa()).reduce((s,v)=>s+Number(v.resico||0),0))}</b></div>
            <div className="card"><span>No tocar hoy</span><b>{money(noTocarHoy)}</b></div>
          </div>
          <p className="notice">Recuerda validar estos cálculos con tu contador. Esta pantalla es una estimación operativa.</p>
        </main>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
