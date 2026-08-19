import { useConfig } from '../hooks/queries';
import { configPathHint } from '../ui';

export function Settings() {
  const { data: config } = useConfig();
  if (!config) return <div className="dim" style={{ padding: 24 }}>Loading config…</div>;

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
            {config.agents.map((a) => (
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
            {config.models.map((m) => (
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
