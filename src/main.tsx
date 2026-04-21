import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
            reg.unregister();
        }
    });
}

createRoot(document.getElementById("root")!).render(<App />);
