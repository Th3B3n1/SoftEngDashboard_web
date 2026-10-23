import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { OverviewPage } from './pages/Overview';
import { SignaturePage } from './pages/Signature';
import { GradePage } from './pages/Grade';
import { LevelsPage } from './pages/Levels';
import { TasksPage } from './pages/Tasks';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <Navigate to="/" replace />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'signature', element: <SignaturePage /> },
      { path: 'grade', element: <GradePage /> },
      { path: 'levels', element: <LevelsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);

