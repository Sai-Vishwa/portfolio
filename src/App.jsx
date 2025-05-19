import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LightBulb from './components/Bulb/Bulb'

function App() {

  const [theme , setTheme ] = useState(false)

  return (
    <div className={`w-screen h-screen ${!theme?'bg-blue-900 ':'bg-blue-200 '} ${!theme?'text-blue-200':'text-blue-700'} text-white text-6xl flex justify-center items-center`}>
        Hey Inga Paaru !!!
        <LightBulb 
        theme={setTheme}/>
    </div>
  )
}

export default App
