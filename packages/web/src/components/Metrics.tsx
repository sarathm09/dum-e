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

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#fb923c',
  urgent: '#f87171',
};

function statusVar(status: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--st-${status}`).trim() || '#888';
}

export function Metrics() {
  const { data } = useMetrics();
  if (!data) return <div className="dim" style={{ padding: 24 }}>Loading metrics…</div>;

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

  return (
    <div className="metrics">
      <div className="metric-cards">
        <div className="metric-card">
          <span className="metric-num">{data.total}</span>
          <span className="dim">Total tasks</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.byStatus.completed ?? 0}</span>
          <span className="dim">Completed</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.byStatus.manual_testing ?? 0}</span>
          <span className="dim">Awaiting review</span>
        </div>
        <div className="metric-card">
          <span className="metric-num">{data.byStatus.in_progress ?? 0}</span>
          <span className="dim">In progress</span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-box">
          <h3>Status distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fill: '#9aa4b2', fontSize: 11 }} interval={0} angle={-20} height={50} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1b2130', border: 'none' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((d) => (
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
              <Tooltip contentStyle={{ background: '#1b2130', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>By type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeData} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9aa4b2', fontSize: 11 }} width={90} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1b2130', border: 'none' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
