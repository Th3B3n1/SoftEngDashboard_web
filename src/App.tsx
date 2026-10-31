import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { hasToken } from './moodle/auth';
import { LoginPage } from './pages/Login';
import { DashboardProvider } from './contexts/DashboardContext';
import { LanguageProvider } from './contexts/LanguageContext';

export function App() {
  return (
    <LanguageProvider>
      {!hasToken() ? (
        <LoginPage />
      ) : (
        <DashboardProvider>
          <RouterProvider router={router} />
        </DashboardProvider>
      )}
    </LanguageProvider>
  );
}
