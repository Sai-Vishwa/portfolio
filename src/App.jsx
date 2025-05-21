import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LightBulb from './components/Bulb/Bulb'

function App() {

  const [theme , setTheme ] = useState(false)

  return (
    <div className={`w-screen h-screen ${!theme?'bg-blue-900 ':'bg-blue-900 '} ${!theme?'text-blue-900':'text-blue-200'}  text-6xl flex justify-center items-center`}>
        <p>
          Hey Check this out !!!
        </p>
        <LightBulb 
        theme={setTheme}/>
    </div>
  )
}

export default App
