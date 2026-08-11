import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

if (import.meta.env.VITE_ENABLE_WEB_VITALS === 'true') {
  import('./metrics/webVitals.js').then(({ loadWebVitals }) => loadWebVitals()).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

