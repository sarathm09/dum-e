import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { Layout } from './components/Layout';
import { Board } from './components/Board';
import { TaskTable } from './components/TaskTable';
import { Metrics } from './components/Metrics';
import { Settings } from './components/Settings';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
});

const boardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: () => <Board />,
});

const tableRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/table',
  component: () => <TaskTable />,
});

const metricsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/metrics',
  component: Metrics,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([boardRoute, tableRoute, metricsRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
