import { useState } from 'react';
import { useConfig } from '../hooks/queries';
import { configPathHint } from '../ui';
import { THEMES, getStoredTheme, setTheme, type ThemeName } from '../theme';

export function Settings() {
  const { data: config, isLoading, error } = useConfig();
  const [theme, setThemeState] = useState<ThemeName>(getStoredTheme());

  const onTheme = (next: ThemeName) => {
    setThemeState(next);
    setTheme(next);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
      </div>

      <div className="settings-sections">
        {/* Appearance: client-side, persisted to localStorage */}
        <section className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Appearance</h3>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <label className="setting-label" htmlFor="s-theme">
                Theme
              </label>
              <span className="setting-hint">Applied instantly and saved to this browser.</span>
            </div>
            <div className="setting-control">
              <select
                id="s-theme"
                className="setting-select"
                value={theme}
                onChange={(e) => onTheme(e.target.value as ThemeName)}
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Config: read-only view of the YAML file */}
        <section className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Configuration</h3>
          </div>
          <div className="setting-row" style={{ borderTop: 'none' }}>
            <div className="setting-info">
              <span className="setting-label">Source</span>
              <span className="setting-hint">
                Read-only. Edit the YAML file (<code>dum-e config path</code>) and refresh.
              </span>
            </div>
            <div className="setting-control">
              <code>{configPathHint}</code>
            </div>
          </div>

          {isLoading && <p className="dim">Loading config…</p>}
          {error && (
            <p className="dim">
              Could not load config: {error instanceof Error ? error.message : 'unknown error'}.
            </p>
          )}
        </section>

        {config && (
          <>
            <section className="settings-section">
              <div className="section-header">
                <h3 className="section-title">Agents</h3>
              </div>
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
                  {(config.agents ?? []).map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.name}
                        {config.defaultAgent === a.id && <span className="badge"> default</span>}
                      </td>
                      <td className="dim">{a.id}</td>
                      <td>{a.tool ?? <span className="dim">none</span>}</td>
                      <td className="dim">{a.description ?? 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="settings-section">
              <div className="section-header">
                <h3 className="section-title">Models</h3>
              </div>
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Id</th>
                    <th>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {(config.models ?? []).map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.name}
                        {config.defaultModel === m.id && <span className="badge"> default</span>}
                      </td>
                      <td className="dim">{m.id}</td>
                      <td>{m.provider ?? <span className="dim">none</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {config.server && (
              <section className="settings-section">
                <div className="section-header">
                  <h3 className="section-title">Server</h3>
                </div>
                <div className="setting-row" style={{ borderTop: 'none' }}>
                  <div className="setting-info">
                    <span className="setting-label">Address</span>
                  </div>
                  <div className="setting-control">
                    <code>
                      {config.server.host}:{config.server.port}
                    </code>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
