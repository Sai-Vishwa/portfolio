import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LightBulb from './components/Bulb/Bulb'

function App() {

  const [theme , setTheme ] = useState(false)

  return (
    <div className={`max-w-screen h-[100vh] overflow-x-hidden ${!theme?'bg-[#1c1c1c] ':'bg-[#fefde9] '} ${!theme?'text-[#66ff6e]':'text-[#ff0000]'}  text-6xl flex`}>
        <LightBulb 
        theme={setTheme}/>
        <div className='w-3/4 flex items-center justify-start'>

        <p> 
          Hey inga paaru
        </p>

        </div>
        <div className='w-1/4 '>

          

        </div>
          
        
        
    </div>
  )
}

export default App
