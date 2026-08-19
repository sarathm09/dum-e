import type { EventBus } from '../bus/index.js';
import { CreateProjectSchema, type CreateProjectInput } from '../domain/schemas.js';
import type { Project } from '../domain/types.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { newId, now } from '../id.js';
import type { Store } from '../store/index.js';

function deriveKey(name: string): string {
  const letters = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (letters.slice(0, 4) || 'PROJ').padEnd(2, 'X');
}

export class ProjectService {
  constructor(
    private readonly store: Store,
    private readonly bus: EventBus,
  ) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const parsed = CreateProjectSchema.parse(input);
    let key = (parsed.key ?? deriveKey(parsed.name)).toUpperCase();
    if (this.store.getProjectByKey(key)) {
      // Disambiguate a derived collision with a numeric suffix.
      let n = 2;
      while (this.store.getProjectByKey(`${key}${n}`)) n++;
      key = `${key}${n}`;
    }
    const project: Project = {
      id: newId(),
      name: parsed.name,
      key,
      repo: parsed.repo ?? null,
      defaultBranch: parsed.defaultBranch ?? null,
      stateMachine: parsed.stateMachine ?? null,
      createdAt: now(),
    };
    this.store.insertProject(project);
    await this.bus.emit('project:created', { projectId: project.id });
    return project;
  }

  get(id: string): Project {
    const p = this.store.getProject(id);
    if (!p) throw new NotFoundError('project', id);
    return p;
  }

  list(): Project[] {
    return this.store.listProjects();
  }

  /** Resolve a project by id or key; used by CLI/MCP where either is convenient. */
  resolve(idOrKey: string): Project {
    const byId = this.store.getProject(idOrKey);
    if (byId) return byId;
    const byKey = this.store.getProjectByKey(idOrKey.toUpperCase());
    if (byKey) return byKey;
    throw new NotFoundError('project', idOrKey);
  }

  requireDefault(): Project {
    const all = this.store.listProjects();
    if (all.length === 0) {
      throw new ValidationError('no projects exist; create one first (dum-e project add <name>)');
    }
    return all[0]!;
  }
}
