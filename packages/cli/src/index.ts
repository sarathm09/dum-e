import { Command } from 'commander';
import { DumeError } from '@dum-e/core';
import { fail, setJson } from './format.js';
import { initCommand } from './commands/init.js';
import { projectAdd, projectList } from './commands/project.js';
import {
  taskAdd,
  taskComment,
  taskList,
  taskMove,
  taskNext,
  taskShow,
  taskUpdate,
} from './commands/task.js';
import { configPathCommand, configShow } from './commands/config.js';
import { agentRules } from './commands/rules.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('dum-e')
    .description(
      'dum-e: AI task manager. Drive tasks through the lifecycle from the terminal,\n' +
        'a REST API, or an MCP server, all over one shared local core (SQLite).',
    )
    .version('0.1.0', '-v, --version', 'print version')
    .option('--json', 'machine-readable JSON output (scriptable / pipeable)', false)
    .showHelpAfterError('(run `dum-e --help` or `dum-e <command> --help`)')
    .showSuggestionAfterError(true)
    .configureHelp({ sortSubcommands: true });

  // Global --json is read once before any action runs.
  program.hook('preAction', () => setJson(Boolean(program.opts().json)));

  program.addHelpText(
    'after',
    `
Lifecycle:
  todo → in_progress → ai_testing → manual_testing → deployment → completed
  Every transition requires a comment. Rejecting from manual_testing/deployment
  bumps priority + flags the task so the agent picks it up first.

Examples:
  $ dum-e init                              # create ~/.config/dum-e/{config.yaml,db}
  $ dum-e project add "Web App" -k WEB      # new project
  $ dum-e task add "Fix login" --type bug --priority high
  $ dum-e task next -m "starting"           # claim highest-priority queued task
  $ dum-e task move <id> ai_testing -m "unit tests green"
  $ dum-e task ls --status manual_testing   # what awaits my review
  $ dum-e task ls --json | jq '.[].id'      # scriptable output
  $ dum-e serve --open                      # REST API + web UI, opens browser
  $ dum-e mcp                               # MCP server on stdio (for agents)

Storage: ~/.config/dum-e/  (override with $DUM_E_HOME)`,
  );

  program
    .command('init')
    .summary('create config + database')
    .description('create the config file + SQLite database if they do not exist (idempotent)')
    .action(initCommand);

  const project = program.command('project').description('manage projects');
  project
    .command('add <name>')
    .description('create a project')
    .option('-k, --key <key>', 'short key, e.g. WEB')
    .option('-r, --repo <repo>', 'repository')
    .option('-b, --branch <branch>', 'default branch')
    .action(projectAdd);
  project.command('ls').alias('list').description('list projects').action(projectList);

  const task = program.command('task').description('manage tasks');
  task
    .command('add <title>')
    .summary('create a task')
    .description('create a task in the queue (agents claim these with `task next`)')
    .option('-p, --project <idOrKey>', 'target project (default: first, else auto Inbox)')
    .option('-d, --details <text>', 'task details (markdown)')
    .option('--priority <priority>', 'low | medium | high | urgent', 'medium')
    .option('--type <type>', 'bug | feature | documentation | chore', 'feature')
    .option('--agent <id>', 'preferred agent id')
    .option('--model <id>', 'preferred model id')
    .option('-r, --repo <repo>', 'repository')
    .option('-b, --branch <branch>', 'branch')
    .option('--assignee <kind>', 'human | agent', 'agent')
    .addHelpText(
      'after',
      '\nExample:\n  $ dum-e task add "Add dark mode" --type feature --priority high -p WEB',
    )
    .action(taskAdd);
  task
    .command('ls')
    .alias('list')
    .description('list tasks')
    .option('-p, --project <idOrKey>', 'filter by project')
    .option('-s, --status <status>', 'filter by status')
    .option('--priority <priority>', 'filter by priority')
    .option('--type <type>', 'filter by type')
    .option('--agent <id>', 'filter by agent')
    .option('--search <query>', 'full-text search title/details')
    .action(taskList);
  task.command('show <id>').description('show a task with comments + history').action(taskShow);
  task
    .command('update <id>')
    .description('update task fields')
    .option('-t, --title <title>')
    .option('-d, --details <text>')
    .option('--priority <priority>')
    .option('--type <type>')
    .option('--agent <id>')
    .option('--model <id>')
    .option('-r, --repo <repo>')
    .option('-b, --branch <branch>')
    .option('--assignee <kind>')
    .action(taskUpdate);
  task
    .command('next')
    .description('claim the highest-priority queued task')
    .option('-p, --project <idOrKey>', 'restrict to a project')
    .option('-m, --message <comment>', 'transition comment')
    .action(taskNext);
  task
    .command('move <id> <status>')
    .summary('transition a task (comment required)')
    .description(
      'transition a task to a new status. A comment is mandatory and recorded in history.\n' +
        'Valid next states depend on the current one (see the lifecycle in `dum-e --help`).',
    )
    .option('-m, --message <comment>', 'why this transition (required)')
    .option('--actor <actor>', 'human | agent | system', 'human')
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  $ dum-e task move abc123 ai_testing -m "unit tests pass"\n' +
        '  $ dum-e task move abc123 in_progress -m "reject: button misaligned"  # bumps priority',
    )
    .action(taskMove);
  task
    .command('comment <id>')
    .description('add a comment')
    .option('-m, --message <text>', 'comment body (required)')
    .option('--author <author>', 'human|agent|system', 'human')
    .action(taskComment);

  const config = program.command('config').description('configuration');
  config.command('show').description('print effective config').action(configShow);
  config.command('path').description('print config file path').action(configPathCommand);

  program
    .command('agent-rules')
    .description('print the instruction snippet for AI agents')
    .action(agentRules);

  program
    .command('serve')
    .summary('start the REST API + web UI')
    .description('start the Hono REST API (with SSE) and serve the built web UI, if present')
    .option('-p, --port <port>', 'port (default: from config, 4319)')
    .option('-H, --host <host>', 'host (default: from config, 127.0.0.1)')
    .option('-o, --open', 'open the web UI in the default browser', false)
    .addHelpText('after', '\nExample:\n  $ dum-e serve --open --port 4319')
    .action(async (opts) => {
      const mod = await loadOptional('@dum-e/server', 'serve');
      await mod.startServer({ host: opts.host, port: opts.port });
      if (opts.open) openBrowser(`http://${opts.host ?? '127.0.0.1'}:${opts.port ?? 4319}`);
    });

  program
    .command('mcp')
    .summary('start the MCP server on stdio')
    .description('start the Model Context Protocol server on stdio (register with any agent)')
    .addHelpText(
      'after',
      '\nRegister with a Claude Code / MCP client as command: `dum-e mcp` (see README).',
    )
    .action(async () => {
      const mod = await loadOptional('@dum-e/mcp', 'mcp');
      await mod.startMcp();
    });

  return program;
}

/** Best-effort open a URL in the OS default browser; never throws. */
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  import('node:child_process')
    .then(({ spawn }) => {
      spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' })
        .on('error', () => {})
        .unref();
    })
    .catch(() => {});
}

async function loadOptional(pkg: string, cmd: string): Promise<any> {
  try {
    return await import(pkg);
  } catch {
    throw new DumeError(
      `\`dum-e ${cmd}\` needs ${pkg}, which is not built yet. Run \`pnpm build\` from the repo root.`,
      'not_available',
    );
  }
}

export async function run(argv: string[]): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof DumeError) {
      fail(err.message);
      process.exitCode = 1;
    } else {
      throw err;
    }
  }
}

run(process.argv).catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
