import React, { Component, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state={error:null} }
  static getDerivedStateFromError(error){ return {error} }
  render(){
    if(this.state.error){
      return <div className="app"><div className="panel danger"><h1>⚠️ Error controlado</h1><pre>{String(this.state.error?.message || this.state.error)}</pre><button className="primary" onClick={()=>location.reload()}>Recargar</button></div></div>
    }
    return this.props.children
  }
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = rawUrl.replace('/rest/v1/', '').replace(/\/$/, '')
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const defaultProducts = [
  { id:'demo1', codigo:'A1', nombre:'El Para Mí', categoria:'Alitas', precio_local:99, precio_whatsapp:99, precio_didi:159, precio_uber:169, costo_base:36.79 },
  { id:'demo2', codigo:'A2', nombre:'Combo Antojo', categoria:'Alitas', precio_local:165, precio_whatsapp:165, precio_didi:289, precio_uber:299, costo_base:68.15 },
]

const money = n => `$${Number(n || 0).toFixed(2)}`

function todayOperational(){
  const d = new Date()
  if(d.getHours() >= 0 && d.getHours() < 5) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0,10)
}

function price(p, channel){
  const field = {Local:'precio_local', WhatsApp:'precio_whatsapp', Didi:'precio_didi', Uber:'precio_uber'}[channel] || 'precio_local'
  return Number(p?.[field] ?? p?.precio_local ?? 0)
}

function calcCart(items, channel, discount=0){
  const subtotal = items.reduce((s,i)=>s+price(i,channel)*Number(i.qty||1),0)
  const safeDiscount = Math.min(Math.max(Number(discount||0),0), subtotal)
  const total = subtotal - safeDiscount
  const cost = items.reduce((s,i)=>s+Number(i.costo_base||0)*Number(i.qty||1),0)
  const commissionPct = channel === 'Didi' ? 30 : channel === 'Uber' ? 35 : 0
  const commission = total * commissionPct / 100
  const iva = total * .16
  const resico = total * .0625
  const before = total - cost - commission - iva - resico
  const reinvest = Math.max(0, before * .20)
  const profit = before - reinvest
  const locked = iva + resico + reinvest
  return { subtotal, discount:safeDiscount, total, cost, commission, iva, resico, reinvest, profit, locked }
}

function weekRange(){
  const now = new Date()
  const day = now.getDay()
  const diff = day >= 4 ? day - 4 : day + 3
  const start = new Date(now)
  start.setDate(now.getDate() - diff)
  const end = new Date(start)
  end.setDate(start.getDate()+4)
  return {start:start.toISOString().slice(0,10), end:end.toISOString().slice(0,10)}
}

const emptyProduct = { codigo:'', nombre:'', categoria:'General', precio_local:'', precio_whatsapp:'', precio_didi:'', precio_uber:'', costo_base:'' }
const emptyInventory = { nombre:'', unidad:'pza', stock_actual:'', stock_minimo:'', costo_unitario:'', proveedor:'' }
const emptyPurchase = { ingrediente:'', cantidad:'', unidad:'g', costo_total:'', proveedor:'' }
const emptyWaste = { producto:'', cantidad:'', unidad:'g', motivo:'', perdida:'' }
const emptyExpense = { categoria:'', monto:'', descripcion:'' }

function App(){
  const [tab,setTab]=useState('dashboard')
  const [products,setProducts]=useState([])
  const [sales,setSales]=useState([])
  const [saleItems,setSaleItems]=useState([])
  const [expenses,setExpenses]=useState([])
  const [inventory,setInventory]=useState([])
  const [purchases,setPurchases]=useState([])
  const [waste,setWaste]=useState([])
  const [cart,setCart]=useState([])
  const [channel,setChannel]=useState('Local')
  const [payment,setPayment]=useState('Efectivo')
  const [discount,setDiscount]=useState(0)
  const [discountReason,setDiscountReason]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  const [newProduct,setNewProduct]=useState(emptyProduct)
  const [editingProduct,setEditingProduct]=useState(null)
  const [newInventory,setNewInventory]=useState(emptyInventory)
  const [editingInventory,setEditingInventory]=useState(null)
  const [newPurchase,setNewPurchase]=useState(emptyPurchase)
  const [editingPurchase,setEditingPurchase]=useState(null)
  const [newWaste,setNewWaste]=useState(emptyWaste)
  const [editingWaste,setEditingWaste]=useState(null)
  const [newExpense,setNewExpense]=useState(emptyExpense)

  const cartSummary = useMemo(()=>calcCart(cart,channel,discount),[cart,channel,discount])

  async function query(label,promise,fallback=[]){
    try{
      const res=await promise
      if(res.error){ setMessage(m=>`${m?m+' | ':''}${label}: ${res.error.message}`); return fallback }
      return res.data || fallback
    }catch(e){ setMessage(m=>`${m?m+' | ':''}${label}: ${e.message}`); return fallback }
  }

  async function loadAll(){
    setMessage('')
    if(!supabase){ setProducts(defaultProducts); setMessage('Modo demo: faltan variables Supabase.'); return }
    setLoading(true)
    const [p,s,si,e,inv,pur,w]=await Promise.all([
      query('Productos', supabase.from('products').select('*').eq('activo',true).order('codigo'), defaultProducts),
      query('Ventas', supabase.from('sales').select('*').order('created_at',{ascending:false}).limit(300), []),
      query('Detalle ventas', supabase.from('sale_items').select('*').order('created_at',{ascending:false}).limit(500), []),
      query('Gastos', supabase.from('expenses').select('*').order('created_at',{ascending:false}).limit(300), []),
      query('Inventario', supabase.from('inventory').select('*').order('nombre'), []),
      query('Compras', supabase.from('purchases').select('*').order('created_at',{ascending:false}).limit(300), []),
      query('Mermas', supabase.from('waste').select('*').order('created_at',{ascending:false}).limit(300), []),
    ])
    setProducts(p.length?p:defaultProducts); setSales(s); setSaleItems(si); setExpenses(e); setInventory(inv); setPurchases(pur); setWaste(w); setLoading(false)
  }
  useEffect(()=>{loadAll()},[])

  function addToCart(p){
    const found=cart.find(i=>i.id===p.id)
    if(found) setCart(cart.map(i=>i.id===p.id?{...i,qty:Number(i.qty||1)+1}:i))
    else setCart([...cart,{...p,qty:1}])
  }
  function setQty(id,d){ setCart(cart.map(i=>i.id===id?{...i,qty:Math.max(1,Number(i.qty||1)+d)}:i)) }

  async function charge(){
    if(!supabase) return setMessage('No hay conexión Supabase.')
    if(!cart.length) return
    setLoading(true); setMessage('Guardando venta...')
    const salePayload={fecha_operativa:todayOperational(),fecha_real:new Date().toISOString(),canal:channel,metodo_pago:payment,subtotal:cartSummary.subtotal,descuento:cartSummary.discount,motivo_descuento:discountReason,total_final:cartSummary.total,costo_total:cartSummary.cost,iva:cartSummary.iva,resico:cartSummary.resico,comision:cartSummary.commission,reinversion:cartSummary.reinvest,utilidad_real:cartSummary.profit,no_tocar:cartSummary.locked}
    const {data:sale,error}=await supabase.from('sales').insert(salePayload).select().single()
    if(error){setMessage('Error venta: '+error.message); setLoading(false); return}
    const items=cart.map(i=>({sale_id:sale.id,product_id:String(i.id).startsWith('demo')?null:i.id,cantidad:i.qty,precio_unitario:price(i,channel),costo_unitario:Number(i.costo_base||0),nombre_producto:i.nombre,codigo_producto:i.codigo}))
    const detail=await supabase.from('sale_items').insert(items)
    if(detail.error) setMessage('Venta guardada, detalle falló: '+detail.error.message)
    else setMessage('✅ Venta guardada.')
    setCart([]); setDiscount(0); setDiscountReason(''); await loadAll(); setLoading(false)
  }

  async function saveProduct(e){
    e.preventDefault(); if(!supabase) return
    const payload={codigo:newProduct.codigo.trim(),nombre:newProduct.nombre.trim(),categoria:newProduct.categoria||'General',precio_local:Number(newProduct.precio_local||0),precio_whatsapp:Number(newProduct.precio_whatsapp||newProduct.precio_local||0),precio_didi:Number(newProduct.precio_didi||0),precio_uber:Number(newProduct.precio_uber||0),costo_base:Number(newProduct.costo_base||0),activo:true}
    if(!payload.codigo||!payload.nombre) return setMessage('Código y nombre son obligatorios.')
    setLoading(true)
    const res=editingProduct?await supabase.from('products').update(payload).eq('id',editingProduct):await supabase.from('products').insert(payload)
    if(res.error) setMessage('Error producto: '+res.error.message)
    else{setMessage(editingProduct?'✅ Producto modificado.':'✅ Producto guardado.'); setNewProduct(emptyProduct); setEditingProduct(null); await loadAll()}
    setLoading(false)
  }
  async function deleteProduct(id){
    if(!confirm('¿Eliminar este platillo?')) return
    setLoading(true)
    const res=await supabase.from('products').update({activo:false}).eq('id',id)
    if(res.error) setMessage('Error eliminar producto: '+res.error.message)
    else{setMessage('✅ Platillo eliminado.'); await loadAll()}
    setLoading(false)
  }
  function editProduct(p){setEditingProduct(p.id); setNewProduct({codigo:p.codigo,nombre:p.nombre,categoria:p.categoria,precio_local:p.precio_local,precio_whatsapp:p.precio_whatsapp,precio_didi:p.precio_didi,precio_uber:p.precio_uber,costo_base:p.costo_base}); setTab('productos')}

  async function upsert(table,data,editing,setEditing,reset,msg){
    setLoading(true)
    const res=editing?await supabase.from(table).update(data).eq('id',editing):await supabase.from(table).insert(data)
    if(res.error) setMessage('Error: '+res.error.message)
    else{setMessage(msg); setEditing(null); reset(); await loadAll()}
    setLoading(false)
  }
  async function remove(table,id,label){
    if(!confirm(`¿Eliminar ${label}?`)) return
    setLoading(true)
    const res=await supabase.from(table).delete().eq('id',id)
    if(res.error) setMessage('Error eliminar: '+res.error.message)
    else{setMessage('✅ Eliminado.'); await loadAll()}
    setLoading(false)
  }

  const today=todayOperational(); const week=weekRange()
  const salesToday=sales.filter(v=>v.fecha_operativa===today)
  const salesWeek=sales.filter(v=>v.fecha_operativa>=week.start&&v.fecha_operativa<=week.end)
  const sum=(arr,field)=>arr.reduce((s,i)=>s+Number(i[field]||0),0)
  const expensesToday=expenses.filter(x=>x.fecha===today)

  const topProducts=Object.values(saleItems.reduce((acc,item)=>{const k=item.codigo_producto||item.nombre_producto;if(!acc[k])acc[k]={name:item.nombre_producto,qty:0,total:0};acc[k].qty+=Number(item.cantidad||0);acc[k].total+=Number(item.precio_unitario||0)*Number(item.cantidad||0);return acc},{})).sort((a,b)=>b.qty-a.qty).slice(0,5)

  return <div className="app">
    <header className="hero"><div><p className="sub">GUS GUS CONTROL ADMIN</p><h1>🍗 Wings & Snacks</h1><small>Ventas · Inventario · SAT · Edición completa</small></div><button className="primary" onClick={loadAll}>{loading?'Cargando...':'Actualizar'}</button></header>
    {message&&<div className="message">{message}</div>}
    <nav className="nav">{[['dashboard','🏠 Inicio'],['caja','💵 Caja'],['ventas','📈 Ventas'],['productos','🍗 Productos'],['inventario','📦 Inventario'],['compras','🛒 Compras'],['mermas','⚠️ Mermas'],['gastos','💸 Gastos'],['sat','🧾 SAT']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}>{label}</button>)}</nav>

    <section className="stats"><div><span>Ventas hoy</span><b>{money(sum(salesToday,'total_final')||sum(salesToday,'subtotal'))}</b></div><div><span>Utilidad hoy</span><b>{money(sum(salesToday,'utilidad_real'))}</b></div><div><span>No tocar hoy</span><b>{money(sum(salesToday,'no_tocar'))}</b></div><div><span>Gastos hoy</span><b>{money(sum(expensesToday,'monto'))}</b></div></section>

    {tab==='dashboard'&&<main className="grid"><section className="panel wide"><h2>Resumen semanal jueves-lunes</h2><p className="muted">{week.start} → {week.end}</p><div className="cards2"><div><span>Ventas semana</span><b>{money(sum(salesWeek,'total_final')||sum(salesWeek,'subtotal'))}</b></div><div><span>Utilidad semana</span><b>{money(sum(salesWeek,'utilidad_real'))}</b></div><div><span>No tocar</span><b>{money(sum(salesWeek,'no_tocar'))}</b></div><div><span>Órdenes</span><b>{salesWeek.length}</b></div></div><h3>Top productos</h3>{topProducts.length?topProducts.map(p=><div className="row" key={p.name}><b>{p.name}</b><span>{p.qty} vendidos</span><span>{money(p.total)}</span></div>):<p className="muted">Aún no hay ventas suficientes.</p>}</section><aside className="panel"><h2>Alertas</h2>{inventory.filter(i=>Number(i.stock_actual)<=Number(i.stock_minimo)).map(i=><div className="alert" key={i.id}>⚠️ {i.nombre} bajo: {i.stock_actual} {i.unidad}</div>)}<div className="alert">📅 Corte operativo: jueves a lunes</div><div className="alert">🌙 Madrugada cuenta al día anterior hasta 5 AM</div></aside></main>}

    {tab==='caja'&&<main className="grid"><section className="panel wide"><h2>Caja rápida</h2><div className="chips">{['Local','WhatsApp','Didi','Uber'].map(c=><button key={c} onClick={()=>setChannel(c)} className={channel===c?'on':''}>{c}</button>)}</div><div className="productGrid">{products.map(p=><button key={p.id} onClick={()=>addToCart(p)}><strong>{p.codigo}</strong><b>{p.nombre}</b><span>{channel}: {money(price(p,channel))}</span><small>Costo {money(p.costo_base)}</small></button>)}</div></section><aside className="panel"><h2>Carrito</h2>{!cart.length&&<p className="muted">Agrega productos.</p>}{cart.map(i=><div className="cartItem" key={i.id}><div><b>{i.codigo} {i.nombre}</b><small>{money(price(i,channel))} c/u</small></div><div className="cartControls"><button onClick={()=>setQty(i.id,-1)}>-1</button><span>{i.qty}</span><button onClick={()=>setQty(i.id,1)}>+1</button><button className="deleteItem" onClick={()=>setCart(cart.filter(x=>x.id!==i.id))}>Eliminar</button></div></div>)}{cart.length>0&&<button className="clearCart" onClick={()=>{setCart([]);setDiscount(0);setDiscountReason('')}}>Vaciar carrito</button>}<div className="discountBox"><h3>Descuento en pesos</h3><div className="quickDiscounts">{[10,20,30,50].map(d=><button key={d} onClick={()=>setDiscount(Number(discount||0)+d)}>-${d}</button>)}<button onClick={()=>setDiscount(cartSummary.subtotal)}>Gratis</button><button onClick={()=>setDiscount(0)}>Quitar</button></div><input placeholder="Descuento manual" value={discount} onChange={e=>setDiscount(e.target.value)}/><input placeholder="Motivo descuento" value={discountReason} onChange={e=>setDiscountReason(e.target.value)}/></div><div className="summary"><p><span>Subtotal</span><b>{money(cartSummary.subtotal)}</b></p><p className="dangerText"><span>Descuento</span><b>-{money(cartSummary.discount)}</b></p><p><span>Total final</span><b>{money(cartSummary.total)}</b></p><p><span>Costo</span><b>{money(cartSummary.cost)}</b></p><p><span>Comisión</span><b>{money(cartSummary.commission)}</b></p><p><span>IVA</span><b>{money(cartSummary.iva)}</b></p><p><span>RESICO</span><b>{money(cartSummary.resico)}</b></p><p><span>Reinversión</span><b>{money(cartSummary.reinvest)}</b></p><p className="dangerText"><span>No tocar</span><b>{money(cartSummary.locked)}</b></p><p className="okText"><span>Utilidad real</span><b>{money(cartSummary.profit)}</b></p></div><div className="chips">{['Efectivo','Transferencia','Tarjeta'].map(m=><button key={m} onClick={()=>setPayment(m)} className={payment===m?'on':''}>{m}</button>)}</div><button className="charge" onClick={charge} disabled={!cart.length||loading}>COBRAR {money(cartSummary.total)}</button></aside></main>}

    {tab==='ventas'&&<section className="panel"><h2>Ventas guardadas</h2>{sales.map(v=><div className="row" key={v.id}><span>{v.fecha_operativa}</span><span>{v.canal}</span><span>{v.metodo_pago}</span><b>{money(v.total_final||v.subtotal)}</b><span>Desc. {money(v.descuento)}</span><b className="okText">{money(v.utilidad_real)}</b><b className="dangerText">{money(v.no_tocar)}</b></div>)}</section>}

    {tab==='productos'&&<main className="grid"><section className="panel wide"><h2>Productos</h2>{products.map(p=><div className="row" key={p.id}><b>{p.codigo}</b><span>{p.nombre}</span><span>{p.categoria}</span><span>Local {money(p.precio_local)}</span><span>Didi {money(p.precio_didi)}</span><span>Costo {money(p.costo_base)}</span><button onClick={()=>editProduct(p)}>Modificar</button><button className="deleteBtn" onClick={()=>deleteProduct(p.id)}>Eliminar</button></div>)}</section><form className="panel form" onSubmit={saveProduct}><h2>{editingProduct?'Modificar producto':'Nuevo producto'}</h2>{Object.keys(newProduct).map(k=><input key={k} placeholder={k} value={newProduct[k]} onChange={e=>setNewProduct({...newProduct,[k]:e.target.value})}/>)}<button className="charge">{editingProduct?'Guardar cambios':'Guardar producto'}</button>{editingProduct&&<button type="button" className="secondaryBtn" onClick={()=>{setEditingProduct(null);setNewProduct(emptyProduct)}}>Cancelar edición</button>}</form></main>}

    {tab==='inventario'&&<main className="grid"><section className="panel wide"><h2>Inventario</h2>{inventory.map(i=><div className="row" key={i.id}><b>{i.nombre}</b><span>{i.stock_actual} {i.unidad}</span><span>Mínimo {i.stock_minimo}</span><span>Costo {money(i.costo_unitario)}</span><span>{i.proveedor}</span><button onClick={()=>{setEditingInventory(i.id);setNewInventory({nombre:i.nombre,unidad:i.unidad,stock_actual:i.stock_actual,stock_minimo:i.stock_minimo,costo_unitario:i.costo_unitario,proveedor:i.proveedor||''})}}>Modificar</button><button className="deleteBtn" onClick={()=>remove('inventory',i.id,'inventario')}>Eliminar</button></div>)}</section><form className="panel form" onSubmit={e=>{e.preventDefault();upsert('inventory',{...newInventory,stock_actual:Number(newInventory.stock_actual||0),stock_minimo:Number(newInventory.stock_minimo||0),costo_unitario:Number(newInventory.costo_unitario||0)},editingInventory,setEditingInventory,()=>setNewInventory(emptyInventory),editingInventory?'✅ Inventario modificado.':'✅ Inventario guardado.')}}><h2>{editingInventory?'Modificar inventario':'Nuevo inventario'}</h2>{Object.keys(newInventory).map(k=><input key={k} placeholder={k} value={newInventory[k]} onChange={e=>setNewInventory({...newInventory,[k]:e.target.value})}/>)}<button className="charge">{editingInventory?'Guardar cambios':'Guardar inventario'}</button>{editingInventory&&<button type="button" className="secondaryBtn" onClick={()=>{setEditingInventory(null);setNewInventory(emptyInventory)}}>Cancelar edición</button>}</form></main>}

    {tab==='compras'&&<main className="grid"><section className="panel wide"><h2>Compras</h2>{purchases.map(p=><div className="row" key={p.id}><span>{p.fecha}</span><b>{p.ingrediente}</b><span>{p.cantidad} {p.unidad}</span><span>{p.proveedor}</span><b>{money(p.costo_total)}</b><button onClick={()=>{setEditingPurchase(p.id);setNewPurchase({ingrediente:p.ingrediente,cantidad:p.cantidad,unidad:p.unidad,costo_total:p.costo_total,proveedor:p.proveedor||''})}}>Modificar</button><button className="deleteBtn" onClick={()=>remove('purchases',p.id,'compra')}>Eliminar</button></div>)}</section><form className="panel form" onSubmit={e=>{e.preventDefault();upsert('purchases',{...newPurchase,cantidad:Number(newPurchase.cantidad||0),costo_total:Number(newPurchase.costo_total||0),fecha:today},editingPurchase,setEditingPurchase,()=>setNewPurchase(emptyPurchase),editingPurchase?'✅ Compra modificada.':'✅ Compra guardada.')}}><h2>{editingPurchase?'Modificar compra':'Nueva compra'}</h2>{Object.keys(newPurchase).map(k=><input key={k} placeholder={k} value={newPurchase[k]} onChange={e=>setNewPurchase({...newPurchase,[k]:e.target.value})}/>)}<button className="charge">{editingPurchase?'Guardar cambios':'Guardar compra'}</button>{editingPurchase&&<button type="button" className="secondaryBtn" onClick={()=>{setEditingPurchase(null);setNewPurchase(emptyPurchase)}}>Cancelar edición</button>}</form></main>}

    {tab==='mermas'&&<main className="grid"><section className="panel wide"><h2>Mermas y cortesías</h2>{waste.map(w=><div className="row" key={w.id}><span>{w.fecha}</span><b>{w.producto}</b><span>{w.cantidad} {w.unidad}</span><span>{w.motivo}</span><b className="dangerText">{money(w.perdida)}</b><button onClick={()=>{setEditingWaste(w.id);setNewWaste({producto:w.producto,cantidad:w.cantidad,unidad:w.unidad,motivo:w.motivo||'',perdida:w.perdida})}}>Modificar</button><button className="deleteBtn" onClick={()=>remove('waste',w.id,'merma')}>Eliminar</button></div>)}</section><form className="panel form" onSubmit={e=>{e.preventDefault();upsert('waste',{...newWaste,cantidad:Number(newWaste.cantidad||0),perdida:Number(newWaste.perdida||0),fecha:today},editingWaste,setEditingWaste,()=>setNewWaste(emptyWaste),editingWaste?'✅ Merma modificada.':'✅ Merma guardada.')}}><h2>{editingWaste?'Modificar merma':'Nueva merma'}</h2>{Object.keys(newWaste).map(k=><input key={k} placeholder={k} value={newWaste[k]} onChange={e=>setNewWaste({...newWaste,[k]:e.target.value})}/>)}<button className="charge">{editingWaste?'Guardar cambios':'Guardar merma'}</button>{editingWaste&&<button type="button" className="secondaryBtn" onClick={()=>{setEditingWaste(null);setNewWaste(emptyWaste)}}>Cancelar edición</button>}</form></main>}

    {tab==='gastos'&&<main className="grid"><section className="panel wide"><h2>Gastos</h2>{expenses.map(g=><div className="row" key={g.id}><span>{g.fecha}</span><b>{g.categoria}</b><span>{g.descripcion}</span><b className="dangerText">{money(g.monto)}</b><button className="deleteBtn" onClick={()=>remove('expenses',g.id,'gasto')}>Eliminar</button></div>)}</section><form className="panel form" onSubmit={e=>{e.preventDefault();upsert('expenses',{categoria:newExpense.categoria||'General',monto:Number(newExpense.monto||0),descripcion:newExpense.descripcion||'',fecha:today},null,()=>{},()=>setNewExpense(emptyExpense),'✅ Gasto guardado.')}}><h2>Nuevo gasto</h2>{Object.keys(newExpense).map(k=><input key={k} placeholder={k} value={newExpense[k]} onChange={e=>setNewExpense({...newExpense,[k]:e.target.value})}/>)}<button className="charge">Guardar gasto</button></form></main>}

    {tab==='sat'&&<section className="panel"><h2>SAT / Dinero no tocar</h2><div className="cards2"><div><span>IVA hoy</span><b>{money(sum(salesToday,'iva'))}</b></div><div><span>RESICO hoy</span><b>{money(sum(salesToday,'resico'))}</b></div><div><span>Reinversión hoy</span><b>{money(sum(salesToday,'reinversion'))}</b></div><div><span>Total no tocar</span><b>{money(sum(salesToday,'no_tocar'))}</b></div></div><p className="notice">Estimación operativa. Valídalo con tu contador.</p></section>}
  </div>
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>)
