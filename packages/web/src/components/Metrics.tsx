import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS_LABELS, STATUSES } from '../types';
import { useMetrics } from '../hooks/queries';
import { useSelection, statusColor, priorityStyle } from '../ui';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#fb923c',
  urgent: '#f87171',
};

function statusVar(status: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--st-${status}`).trim() || '#888';
}

/** Human-readable duration from milliseconds (e.g. "3d 4h", "12m", "45s"). */
function fmtDuration(ms: number | null): string {
  if (ms == null) return 'n/a';
  if (ms < 1000) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function Metrics() {
  const { data: raw } = useMetrics();
  const { select } = useSelection();
  if (!raw) return <div className="dim" style={{ padding: 24 }}>Loading metrics…</div>;

  // Defensive defaults so a stale/older server payload cannot crash the page.
  const data = {
    ...raw,
    byStatus: raw.byStatus ?? {},
    byPriority: raw.byPriority ?? {},
    byType: raw.byType ?? {},
    stateDurations: raw.stateDurations ?? [],
    taskStats: raw.taskStats ?? [],
    completed: raw.completed ?? 0,
    open: raw.open ?? 0,
    avgCycleMs: raw.avgCycleMs ?? null,
    avgOpenAgeMs: raw.avgOpenAgeMs ?? null,
  };

  const statusData = STATUSES.map((s) => ({
    name: STATUS_LABELS[s] ?? s,
    value: data.byStatus[s] ?? 0,
    fill: statusVar(s),
  }));
  const priorityData = Object.entries(data.byPriority).map(([name, value]) => ({
    name,
    value,
    fill: PRIORITY_COLORS[name] ?? '#888',
  }));
  const typeData = Object.entries(data.byType).map(([name, value]) => ({ name, value }));

  // Average dwell per state, ordered by the canonical lifecycle order.
  const durationData = STATUSES.filter((s) => data.stateDurations.some((d) => d.status === s)).map(
    (s) => {
      const row = data.stateDurations.find((d) => d.status === s);
      return {
        name: STATUS_LABELS[s] ?? s,
        avgMs: row?.avgMs ?? 0,
        avgLabel: fmtDuration(row?.avgMs ?? 0),
        fill: statusVar(s),
      };
    },
  );

  const tip = { background: '#1b2130', border: 'none', borderRadius: 8 } as const;

  return (
    <div className="metrics">
      <div className="metric-cards">
        <div className="metric-card">
          <span className="metric-num">{data.total}</span>
          <span className="dim">Total tasks</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.open}</span>
          <span className="dim">Open</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.completed}</span>
          <span className="dim">Completed</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.byStatus.manual_testing ?? 0}</span>
          <span className="dim">Awaiting review</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{fmtDuration(data.avgCycleMs)}</span>
          <span className="dim">Avg cycle time</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{fmtDuration(data.avgOpenAgeMs)}</span>
          <span className="dim">Avg open age</span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-box">
          <h3>Status distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fill: '#9aa4b2', fontSize: 11 }} interval={0} angle={-20} height={50} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Avg time per state</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={durationData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: '#9aa4b2', fontSize: 11 }} tickFormatter={(v) => fmtDuration(Number(v))} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9aa4b2', fontSize: 11 }} width={100} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={tip}
                formatter={(v: number) => [fmtDuration(Number(v)), 'Avg time']}
              />
              <Bar dataKey="avgMs" radius={[0, 4, 4, 0]}>
                {durationData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>By priority</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={90} label>
                {priorityData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>By type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeData} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9aa4b2', fontSize: 11 }} width={90} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tip} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="metrics-section">
        <h3>Time spent per state</h3>
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Avg time</th>
                <th style={{ textAlign: 'right' }}>Total time</th>
                <th style={{ textAlign: 'right' }}>Visits</th>
              </tr>
            </thead>
            <tbody>
              {STATUSES.map((s) => {
                const row = data.stateDurations.find((d) => d.status === s);
                if (!row) return null;
                return (
                  <tr key={s}>
                    <td>
                      <span style={{ color: statusColor(s) }}>{STATUS_LABELS[s] ?? s}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtDuration(row.avgMs)}</td>
                    <td style={{ textAlign: 'right' }} className="dim">{fmtDuration(row.totalMs)}</td>
                    <td style={{ textAlign: 'right' }} className="dim">{row.visits}</td>
                  </tr>
                );
              })}
              {data.stateDurations.length === 0 && (
                <tr>
                  <td colSpan={4} className="dim" style={{ textAlign: 'center', padding: 20 }}>
                    No transition history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="metrics-section">
        <h3>Per-task stats</h3>
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Age / cycle</th>
                <th style={{ textAlign: 'right' }}>Transitions</th>
              </tr>
            </thead>
            <tbody>
              {data.taskStats
                .slice()
                .sort((a, b) => b.ageMs - a.ageMs)
                .map((t) => (
                  <tr key={t.id} className="clickable" onClick={() => select(t.id)}>
                    <td>{t.title}</td>
                    <td>
                      <span style={{ color: statusColor(t.status) }}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td>
                      <span style={priorityStyle(t.priority)}>{t.priority}</span>
                    </td>
                    <td>{t.type}</td>
                    <td style={{ textAlign: 'right' }}>
                      {fmtDuration(t.ageMs)} {t.completed ? <span className="dim">(cycle)</span> : ''}
                    </td>
                    <td style={{ textAlign: 'right' }} className="dim">{t.transitions}</td>
                  </tr>
                ))}
              {data.taskStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="dim" style={{ textAlign: 'center', padding: 20 }}>
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
