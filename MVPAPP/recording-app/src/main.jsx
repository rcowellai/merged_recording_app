import React from 'react'
import ReactDOM from 'react-dom/client'
import LandingScreen from './components/screens/LandingScreen.jsx'

// Import design system styles
import './styles/design-system.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LandingScreen />
  </React.StrictMode>,
)