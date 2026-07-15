import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/routes/AppRouter';
import '@/styles/global.css';
import '@/styles/fiscal-screens.css';
import '@/styles/erp-workbench.css';
import '@/styles/system-update.css';
import { SystemUpdateGate } from '@/components/system/SystemUpdateGate';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SystemUpdateGate>
        <AppRouter />
      </SystemUpdateGate>
    </QueryClientProvider>
  </React.StrictMode>
);
