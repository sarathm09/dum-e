import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useParams,
} from '@tanstack/react-router';
import { Layout } from './components/Layout';
import { Board } from './components/Board';
import { Projects } from './components/Projects';
import { Metrics } from './components/Metrics';
import { Settings } from './components/Settings';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
});

const projectsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: Projects,
});

const boardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/projects/$projectId',
  component: ProjectBoard,
});

function ProjectBoard() {
  const { projectId } = useParams({ from: '/layout/projects/$projectId' });
  return <Board projectId={projectId} />;
}

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
  layoutRoute.addChildren([projectsRoute, boardRoute, metricsRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
