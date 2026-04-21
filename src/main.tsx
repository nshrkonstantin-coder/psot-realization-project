import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            await reg.unregister();
        }
        navigator.serviceWorker.register('/sw.js').then(
            () => { console.log('ServiceWorker registration successful'); },
            (err) => { console.log('ServiceWorker registration failed: ', err); }
        );
    });
}

createRoot(document.getElementById("root")!).render(<App />);