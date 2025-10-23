import React from 'react';
import './Settings.css';
import { Cog } from 'lucide-react';

const Settings = () => {
  return (
    <div className="settings-page">
      <header className='settings-header'>
        <Cog size={20}/>
        <h4>Settings</h4>
      </header>

      <div className="settings-body">
        <p>Basic settings placeholder. (Brand: RAINY)</p>
      </div>
    </div>
  )
}

export default Settings;
