import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@/app/globals.css'

if (!document.documentElement.lang) {
  document.documentElement.lang = 'zh-CN'
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
