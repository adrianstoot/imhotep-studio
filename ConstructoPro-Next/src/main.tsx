import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConstructoProApp } from './ui/ConstructoProApp';
import { EditorProvider } from './state/EditorStore';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorProvider>
      <ConstructoProApp />
    </EditorProvider>
  </StrictMode>,
);
