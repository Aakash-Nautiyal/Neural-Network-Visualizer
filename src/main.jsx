import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// main.jsx  (located in src/)
import './styles/index.css';   // ✅ relative path

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
