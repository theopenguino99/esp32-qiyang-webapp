// This file is the entry point - it starts your whole React app
// Think of it like the "main()" function in C

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // Import global styles
import App from './App.tsx'  // Import the main App component

// Find the <div id="root"></div> in index.html
// Render the App component inside it
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* StrictMode checks for bugs during development */}
    <App />
  </StrictMode>,
)
