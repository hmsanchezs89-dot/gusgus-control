
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

function Card({ title, value }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  )
}

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>🍗 GUS GUS CONTROL</h1>
        <span>Sistema en la nube</span>
      </header>

      <div className="grid">
        <Card title="Ventas del día" value="$2,450 MXN" />
        <Card title="Pedidos" value="18 pedidos" />
        <Card title="Inventario" value="Todo correcto" />
        <Card title="Corte semanal" value="Jueves → Lunes" />
      </div>

      <div className="panel">
        <h2>Panel principal</h2>
        <ul>
          <li>✅ Caja y ventas</li>
          <li>✅ Inventario</li>
          <li>✅ Control de gastos</li>
          <li>✅ Base de datos conectable a Supabase</li>
          <li>✅ Compatible con celular y PC</li>
        </ul>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
