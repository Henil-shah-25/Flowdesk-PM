import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { migrateExistingDataIfNeeded, backfillStageColorsIfNeeded } from './lib/stages';
import { repairEmptyProjects } from './lib/projectAutoSetup';

// Run migrations for stages data, color backfill & auto-setup repair
migrateExistingDataIfNeeded();
backfillStageColorsIfNeeded();
repairEmptyProjects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
