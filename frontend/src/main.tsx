import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RideProvider } from './context/RideContext';
import App from './App';
import './index.css';
import './styles/phone-shell.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RideProvider>
        <App />
      </RideProvider>
    </BrowserRouter>
  </StrictMode>,
);
