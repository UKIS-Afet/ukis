import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { FontSizeProvider } from './components/FontSizeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="ukis-theme-light">
      <FontSizeProvider defaultSize="normal" storageKey="ukis-fontsize">
        <App />
      </FontSizeProvider>
    </ThemeProvider>
  </StrictMode>,
);
