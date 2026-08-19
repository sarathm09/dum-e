import { useConfig } from '../hooks/queries';
import { configPathHint } from '../ui';

export function Settings() {
  const { data: config, isLoading, error } = useConfig();

  if (isLoading) return <div className="dim" style={{ padding: 24 }}>Loading config…</div>;
  if (error || !config)
    return (
      <div className="settings">
        <h3>Settings unavailable</h3>
        <p className="dim">
          Could not load config: {error instanceof Error ? error.message : 'unknown error'}.
        </p>
        <p className="dim">
          Check the server is up to date (rebuild with <code>pnpm build</code>) and that{' '}
          <code>{configPathHint}</code> exists (<code>dum-e init</code>).
        </p>
      </div>
    );

  const agents = config.agents ?? [];
  const models = config.models ?? [];

  return (
    <div className="settings">
      <p className="dim">
        Read-only view of <code>{configPathHint}</code>. Edit the YAML file (or run{' '}
        <code>dum-e config path</code>) and refresh.
      </p>

      <div className="section">
        <h3>Agents</h3>
        <table className="task-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Tool</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.name}
                  {config.defaultAgent === a.id && <span className="badge"> default</span>}
                </td>
                <td className="dim">{a.id}</td>
                <td>{a.tool ?? '—'}</td>
                <td className="dim">{a.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h3>Models</h3>
        <table className="task-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {config.defaultModel === m.id && <span className="badge"> default</span>}
                </td>
                <td className="dim">{m.id}</td>
                <td>{m.provider ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {config.server && (
        <div className="section">
          <h3>Server</h3>
          <p className="dim">
            {config.server.host}:{config.server.port}
          </p>
        </div>
      )}
    </div>
  );
}
