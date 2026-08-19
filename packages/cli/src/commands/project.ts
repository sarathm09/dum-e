import { getKernel } from '../kernel.js';
import { emit, ok, table } from '../format.js';

interface AddOpts {
  key?: string;
  repo?: string;
  branch?: string;
}

export async function projectAdd(name: string, opts: AddOpts): Promise<void> {
  const kernel = getKernel();
  const project = await kernel.projects.create({
    name,
    key: opts.key,
    repo: opts.repo ?? null,
    defaultBranch: opts.branch ?? null,
  });
  emit(project, () => ok(`created project ${project.key} (${project.id}): ${project.name}`));
}

export function projectList(): void {
  const kernel = getKernel();
  const projects = kernel.projects.list();
  emit(projects, () => {
    if (projects.length === 0) {
      console.log('no projects yet, run: dum-e project add <name>');
      return;
    }
    console.log(
      table(
        ['KEY', 'ID', 'NAME', 'REPO'],
        projects.map((p) => [p.key, p.id, p.name, p.repo ?? 'none']),
      ),
    );
  });
}
