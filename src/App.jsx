import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Lanyard from './components/Bulb/Bulb'

function App() {

  return (
    <div className='w-screen h-screen bg-red-800 text-white text-6xl flex justify-center items-center'>
        
        <Lanyard />
    </div>
  )
}

export default App
