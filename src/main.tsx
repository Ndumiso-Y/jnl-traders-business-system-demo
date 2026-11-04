import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './styles/app.css';
import { routes } from './app/routes';

// HashRouter: GitHub Pages serves static files only, so client-side routes
// must live in the URL fragment to survive hard refresh and deep links.
const router = createHashRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
