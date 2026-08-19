import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { configPath } from './paths.js';

export { attachmentsDir, configDir, configPath, dbPath } from './paths.js';

const AgentDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  tool: z.string().optional(),
});

const ModelDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().optional(),
});

export const ConfigSchema = z.object({
  /** Predefined agents selectable per task. */
  agents: z.array(AgentDefSchema).default([]),
  /** Predefined models selectable per task or as the default. */
  models: z.array(ModelDefSchema).default([]),
  defaultAgent: z.string().nullish(),
  defaultModel: z.string().nullish(),
  server: z
    .object({
      host: z.string().default('127.0.0.1'),
      port: z.number().int().positive().default(4319),
    })
    .default({}),
  ui: z
    .object({
      theme: z.enum(['dark', 'light', 'system']).default('system'),
      defaultView: z.enum(['board', 'table']).default('board'),
    })
    .default({}),
});

export type DumeConfig = z.infer<typeof ConfigSchema>;

const DEFAULT_CONFIG: DumeConfig = ConfigSchema.parse({
  agents: [
    { id: 'default', name: 'Default Agent', description: 'General-purpose coding agent' },
  ],
  models: [
    { id: 'opus-4-8', name: 'Claude Opus 4.8', provider: 'anthropic' },
    { id: 'sonnet-5', name: 'Claude Sonnet 5', provider: 'anthropic' },
    { id: 'fable-5', name: 'Claude Fable 5', provider: 'anthropic' },
    { id: 'gpt-5-6-sol', name: 'GPT 5.6 Sol', provider: 'openai' },
  ],
  defaultAgent: 'default',
  defaultModel: 'opus-4-8',
});

/** Loads/saves the YAML config, writing defaults on first use rather than failing. */
export class ConfigLoader {
  private cache: DumeConfig | null = null;

  constructor(private readonly path: string = configPath()) {}

  load(createIfMissing = true): DumeConfig {
    if (this.cache) return this.cache;
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        if (!createIfMissing) throw err;
        this.writeDefault();
        raw = readFileSync(this.path, 'utf8');
      } else {
        throw err;
      }
    }
    this.cache = ConfigSchema.parse(parseYaml(raw) ?? {});
    return this.cache;
  }

  save(config: DumeConfig): void {
    const validated = ConfigSchema.parse(config);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, stringifyYaml(validated), 'utf8');
    this.cache = validated;
  }

  private writeDefault(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, stringifyYaml(DEFAULT_CONFIG), 'utf8');
  }

  reload(): DumeConfig {
    this.cache = null;
    return this.load();
  }
}

export { DEFAULT_CONFIG };
