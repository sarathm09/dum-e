import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './query';
import { router } from './router';
import { SelectionProvider } from './ui';
import { useSSE } from './hooks/useSSE';
import { applyTheme, getStoredTheme } from './theme';
import './styles.css';

applyTheme(getStoredTheme());

/** Lives inside QueryClientProvider so useSSE can reach the query cache. */
function App() {
  useSSE();
  return <RouterProvider router={router} />;
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing from index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SelectionProvider>
        <App />
      </SelectionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
