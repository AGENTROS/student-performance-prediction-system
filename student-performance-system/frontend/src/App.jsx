import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, BarChart3, BookOpen,
  Check, ChevronDown, CircleHelp, GraduationCap, LayoutDashboard, LockKeyhole,
  LogIn, LogOut, Mail, Menu, Moon, MoreHorizontal, Pencil, Plus, Search,
  ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, Upload, UserRound,
  UserPlus, Users, X,
} from 'lucide-react';
import {
  CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';

const API = '/api';
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'prediction', label: 'Prediction', icon: Target },
  { id: 'models', label: 'Model evaluation', icon: BarChart3 },
  { id: 'analytics', label: 'Student analytics', icon: Activity },
];
const COLORS = ['#7c6cf2', '#28a789', '#f0a44b', '#e96878', '#4d91e8'];
const PERFORMANCE_COLORS = {
  'Good Performance': '#7c6cf2',
  'Average Performance': '#28a789',
  'Poor Performance': '#f0a44b',
};

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const type = response.headers.get('content-type') || '';
  if (!response.ok) {
    const body = type.includes('application/json') ? await response.json() : {};
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return type.includes('application/json') ? response.json() : response;
}

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="section-heading">
      <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, caption, icon: Icon, tone }) {
  return (
    <Card className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={19} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-caption">{caption}</div>
    </Card>
  );
}

function HeroBanner({ user }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <section className="hero-banner">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="hero-kicker-dot" /> YOUR ACADEMIC WORKSPACE <span className="hero-date">{today}</span></div>
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'Educator'}</h1>
        <p>Here’s a clear view of your students’ progress and where your support can make a difference.</p>
        <div className="hero-actions"><span><ShieldCheck size={14} /> Private workspace</span><span><Activity size={14} /> Insights update automatically</span></div>
      </div>
      <div className="hero-illustration" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-glass"><GraduationCap size={43} strokeWidth={1.5} /></div><div className="hero-float float-top"><TrendingUp size={15} /> Progress</div><div className="hero-float float-bottom"><span /> On track</div></div>
    </section>
  );
}

function Pill({ children, kind = '' }) {
  return <span className={`pill ${kind || String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>;
}

function Empty({ title, text }) {
  return <div className="empty-state"><div className="empty-icon"><CircleHelp size={20} /></div><strong>{title}</strong><span>{text}</span></div>;
}

function AnalyticsTooltip({ active, payload, axisLabel, dataKey, suffix }) {
  const student = payload?.[0]?.payload;
  if (!active || !student) return null;
  const featureValue = Number(student[dataKey]);
  return (
    <div className="analytics-tooltip">
      <strong>{student.student_name || 'Student record'}</strong>
      <span className="tooltip-student-id">{student.student_id}</span>
      <div className="tooltip-values">
        <span>{axisLabel}: <b>{Number.isFinite(featureValue) ? `${featureValue.toFixed(1)}${suffix}` : '—'}</b></span>
        <span>Final marks: <b>{Number(student.final_marks).toFixed(1)} / 100</b></span>
      </div>
      <div className="tooltip-tags"><Pill>{student.performance_category}</Pill><Pill>{student.academic_risk}</Pill></div>
      <small>Click the point to view this performance group</small>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signup');
  const [values, setValues] = useState({ name: '', workspace_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(`/auth/${signup ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      onAuthenticated(result.user);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return (
    <main className="auth-shell">
      <div className="auth-top-brand"><div className="brand-mark"><GraduationCap size={21} /></div><div className="brand-name">scholar<span>scope</span><small>ACADEMIC ANALYTICS</small></div></div>
      <section className="auth-card">
        <div className="auth-icon">{signup ? <UserPlus size={21} /> : <LogIn size={21} />}</div>
        <div className="eyebrow">{signup ? 'CREATE YOUR WORKSPACE' : 'WELCOME BACK'}</div>
        <h1>{signup ? 'Create your educator account' : 'Sign in to your workspace'}</h1>
        <p className="auth-intro">{signup ? 'Set up a private workspace to manage and review student progress.' : 'Enter your account details to continue to your academic dashboard.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {signup && <>
            <label><span>Full name</span><div className="auth-input"><UserRound size={16} /><input autoComplete="name" required minLength={2} maxLength={80} placeholder="Your name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></div></label>
            <label><span>School or workspace <small>Optional</small></span><div className="auth-input"><GraduationCap size={16} /><input maxLength={100} placeholder="e.g. Northstar Academy" value={values.workspace_name} onChange={(event) => setValues({ ...values, workspace_name: event.target.value })} /></div></label>
          </>}
          <label><span>Email address</span><div className="auth-input"><Mail size={16} /><input type="email" autoComplete="email" required maxLength={254} placeholder="you@school.edu" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></div></label>
          <label><span>Password {signup && <small>At least 8 characters</small>}</span><div className="auth-input"><LockKeyhole size={16} /><input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} maxLength={128} placeholder={signup ? 'Create a secure password' : 'Your password'} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></div></label>
          {error && <div className="auth-error"><AlertTriangle size={15} />{error}</div>}
          <button className="button primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}<ArrowRight size={15} /></button>
        </form>
        <div className="auth-switch">{signup ? 'Already have an account?' : 'New to ScholarScope?'} <button onClick={() => { setError(''); setMode(signup ? 'login' : 'signup'); }}> {signup ? 'Sign in' : 'Create account'}</button></div>
        <div className="auth-security"><ShieldCheck size={14} /> Passwords are securely hashed. Each account has its own student records.</div>
      </section>
      <div className="auth-disclaimer">Synthetic sample records are for demonstration only. Predictions are estimates, not guaranteed results.</div>
    </main>
  );
}

function StudentForm({ initial, onSave, onClose, busy }) {
  const editing = Boolean(initial?.id);
  const [values, setValues] = useState(initial || {
    student_id: '', student_name: '', attendance: '', previous_marks: '', study_hours: '', internal_marks: '',
  });
  const [error, setError] = useState('');
  const fields = [
    ['student_id', 'Student ID', 'text', 'e.g. STU2025001', null],
    ['student_name', 'Student name', 'text', 'Full name', null],
    ['attendance', 'Attendance (%)', 'number', '0–100', 100],
    ['previous_marks', 'Previous marks', 'number', '0–100', 100],
    ['study_hours', 'Study hours / day', 'number', '0–24', 24],
    ['internal_marks', 'Internal marks', 'number', '0–20', 20],
  ];
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await onSave({
        ...values,
        attendance: Number(values.attendance),
        previous_marks: Number(values.previous_marks),
        study_hours: Number(values.study_hours),
        internal_marks: Number(values.internal_marks),
      });
    } catch (reason) { setError(reason.message); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-heading"><div><div className="eyebrow">STUDENT RECORD</div><h2>{editing ? 'Update student' : 'Add student'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="form-grid">
          {fields.map(([key, label, type, placeholder, max]) => (
            <label key={key} className={key.includes('name') || key === 'student_id' ? '' : ''}>
              <span>{label}</span>
              <input required type={type} min={type === 'number' ? 0 : undefined} max={max || undefined} step={type === 'number' ? 'any' : undefined}
                placeholder={placeholder} value={values[key] ?? ''}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
            </label>
          ))}
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add student'}</button></div>
      </form>
    </div>
  );
}

function Dashboard({ data, students, navigate, user, onPerformanceSelect }) {
  const performance = data?.performance_distribution || [];
  const risk = data?.risk_distribution || [];
  return (
    <>
      <HeroBanner user={user} />
      <div className="section-heading dashboard-section-heading"><div><div className="eyebrow">YOUR COHORT AT A GLANCE</div><h2>Class overview</h2></div><span className="updated-note"><span className="live-dot" /> Live student insights</span></div>
      <div className="metric-grid">
        <MetricCard label="Total students" value={data?.total_students ?? '—'} caption="Student records in your workspace" icon={Users} tone="violet" />
        <MetricCard label="Average marks" value={data ? `${data.average_marks}%` : '—'} caption="Recorded final examination marks" icon={TrendingUp} tone="green" />
        <MetricCard label="High risk students" value={data?.high_risk_students ?? '—'} caption="May benefit from early support" icon={AlertTriangle} tone="amber" />
        <MetricCard label="Average attendance" value={data ? `${data.average_attendance}%` : '—'} caption="Across all student records" icon={Activity} tone="blue" />
      </div>
      <div className="dashboard-grid">
        <Card className="chart-card">
          <div className="card-title-row"><div><div className="eyebrow">CLASS PROFILE</div><h3>Performance distribution</h3></div><button className="subtle-button" onClick={() => navigate('analytics')}>Analytics <ArrowRight size={14} /></button></div>
          {performance.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={performance} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={4} stroke="none">{performance.map((entry, index) => <Cell key={entry.name} fill={PERFORMANCE_COLORS[entry.name] || COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{data.total_students}</strong><span>students</span></div></div><div className="legend-list">{performance.map((item, index) => <button type="button" className="legend-row legend-button" key={item.name} onClick={() => onPerformanceSelect(item.name)} aria-label={`View ${item.value} ${item.name} students`}><span className="legend-dot" style={{ background: PERFORMANCE_COLORS[item.name] || COLORS[index % COLORS.length] }} /><span>{item.name}</span><strong>{item.value}</strong></button>)}</div></div> : <Empty title="No student records yet" text="Add a student to start seeing class insights." />}
        </Card>
        <Card className="chart-card">
          <div className="card-title-row"><div><div className="eyebrow">EARLY SUPPORT</div><h3>Academic risk profile</h3></div><ShieldCheck size={19} className="muted-icon" /></div>
          {risk.length ? <div className="risk-list">{risk.map((item) => { const pct = data.total_students ? Math.round(item.value / data.total_students * 100) : 0; const tone = item.name === 'High Risk' ? 'red' : item.name === 'Medium Risk' ? 'orange' : 'green'; return <div className="risk-item" key={item.name}><div className="risk-row"><Pill kind={tone}>{item.name}</Pill><span>{item.value} students <b>{pct}%</b></span></div><div className="progress-track"><div className={`progress-fill ${tone}`} style={{ width: `${pct}%` }} /></div></div>; })}<div className="support-note"><Sparkles size={16} /><span>Use risk as a conversation starter—not a fixed judgment.</span></div></div> : <Empty title="Risk profile will appear here" text="Import or add student data to get started." />}
        </Card>
      </div>
      <Card className="table-card">
        <div className="card-title-row"><div><div className="eyebrow">LATEST ACTIVITY</div><h3>Recently added students</h3></div><button className="subtle-button" onClick={() => navigate('students')}>View all <ArrowRight size={14} /></button></div>
        <StudentTable rows={(data?.recent_students || []).slice(0, 5)} compact />
      </Card>
    </>
  );
}

function StudentTable({ rows, compact = false, onEdit, onDelete }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>ATTENDANCE</th><th>PREVIOUS MARKS</th>{!compact && <th>STUDY HOURS</th>}<th>FINAL MARKS</th><th>PERFORMANCE</th><th>ACADEMIC RISK</th>{onEdit && <th />}</tr></thead>
    <tbody>{rows.length ? rows.map((row) => <tr key={row.id || row.student_id}><td><div className="student-cell"><span className="avatar">{(row.student_name || 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><strong>{row.student_name}</strong><small><span className="student-id-label">ID</span> {row.student_id}{row.is_demo && <span className="sample-tag"> · demo sample</span>}</small></div></div></td><td><span className="table-number">{row.attendance}%</span></td><td><span className="table-number">{row.previous_marks}<small> / 100</small></span></td>{!compact && <td><span className="table-number">{row.study_hours}<small> hrs</small></span></td>}<td><strong className="final-mark">{row.final_marks == null ? '—' : row.final_marks}<small> / 100</small></strong></td><td>{row.performance_category ? <Pill>{row.performance_category}</Pill> : <span className="muted-text">Awaiting result</span>}</td><td>{row.academic_risk ? <Pill>{row.academic_risk}</Pill> : <span className="muted-text">—</span>}</td>{onEdit && <td><div className="row-actions">{row.is_demo ? <button className="icon-button small" title="Copy sample to your student list" onClick={() => onEdit({ ...row, id: null, student_id: `${row.student_id}-copy` })}><Plus size={15} /></button> : <><button className="icon-button small" title="Edit student" onClick={() => onEdit(row)}><Pencil size={15} /></button><button className="icon-button small danger-hover" title="Delete student" onClick={() => onDelete(row)}><Trash2 size={15} /></button></>}</div></td>}</tr>) : <tr><td colSpan={onEdit ? 8 : 7}><Empty title="No students in this category" text="Try another performance filter or search." /></td></tr>}</tbody>
    </table></div>
  );
}

function StudentsPage({ rows, refresh, toast, selectedCategory, onCategoryChange }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const counts = useMemo(() => ({
    All: rows.length,
    Good: rows.filter((row) => row.performance_category === 'Good Performance').length,
    Average: rows.filter((row) => row.performance_category === 'Average Performance').length,
    Poor: rows.filter((row) => row.performance_category === 'Poor Performance').length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter((item) => {
    const matchesSearch = `${item.student_id} ${item.student_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.performance_category === `${selectedCategory} Performance`;
    return matchesSearch && matchesCategory;
  }), [rows, search, selectedCategory]);
  async function save(values) {
    setBusy(true);
    try {
      const url = modal?.id ? `${API}/students/${modal.id}` : `${API}/students`;
      await api(url, { method: modal?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      setModal(null);
      toast(modal?.id ? 'Student record updated' : 'Student added successfully');
      await refresh();
    } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete ${row.student_name}'s record? This cannot be undone.`)) return;
    try { await api(`${API}/students/${row.id}`, { method: 'DELETE' }); toast('Student deleted'); await refresh(); }
    catch (error) { toast(error.message, 'error'); }
  }
  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try { const result = await api('/students/import', { method: 'POST', body }); toast(result.message); await refresh(); }
    catch (error) { toast(error.message, 'error'); }
    event.target.value = '';
  }
  return (
    <>
      <SectionHeading eyebrow="STUDENT DIRECTORY" title="Student names & performance" action={<button className="button primary" onClick={() => setModal({})}><Plus size={16} /> Add student</button>} />
      <Card className="table-card">
        <div className="performance-filters" aria-label="Filter students by performance category">
          {['All', 'Good', 'Average', 'Poor'].map((category) => <button key={category} className={`performance-filter ${selectedCategory === category ? 'active' : ''} ${category.toLowerCase()}`} onClick={() => onCategoryChange(category)}><span>{category === 'All' ? 'All students' : `${category} performers`}</span><strong>{counts[category]}</strong></button>)}
        </div>
        <div className="toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search student name or ID…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="toolbar-actions"><label className="button secondary upload-button"><Upload size={15} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} hidden /></label><a className="button secondary" href={`${API}/students/sample.csv`}><ArrowDownToLine size={15} /> Sample CSV</a></div></div>
        <StudentTable rows={filtered} onEdit={(row) => setModal(row)} onDelete={remove} />
        <div className="table-footer">Showing <strong>{filtered.length}</strong> matching records from <strong>{rows.length}</strong> total records</div>
      </Card>
      {modal && <StudentForm initial={modal.student_name ? modal : undefined} onSave={save} onClose={() => setModal(null)} busy={busy} />}
    </>
  );
}

function PredictionPage({ toast, refresh }) {
  const [values, setValues] = useState({ student_id: '', student_name: '', attendance: '', previous_marks: '', study_hours: '', internal_marks: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const fields = [
    ['student_id', 'Student ID', 'text', 'STU2025001', ''],
    ['student_name', 'Student name', 'text', 'Enter full name', ''],
    ['attendance', 'Attendance', 'number', '0–100%', 100],
    ['previous_marks', 'Previous marks', 'number', '0–100', 100],
    ['study_hours', 'Study hours per day', 'number', '0–24 hours', 24],
    ['internal_marks', 'Internal marks', 'number', '0–20', 20],
  ];
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api('/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, attendance: Number(values.attendance), previous_marks: Number(values.previous_marks), study_hours: Number(values.study_hours), internal_marks: Number(values.internal_marks) }),
      });
      setResult(response);
      toast('Prediction generated');
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  }
  function useExample() { setValues({ student_id: 'DEMO001', student_name: 'Sample Student', attendance: '78', previous_marks: '68', study_hours: '2.5', internal_marks: '14' }); setResult(null); }
  return (
    <>
      <SectionHeading eyebrow="INDIVIDUAL ASSESSMENT" title="Performance prediction" />
      <div className="prediction-layout">
        <Card className="prediction-form-card">
          <div className="card-title-row"><div><div className="eyebrow">STUDENT INPUT</div><h3>Academic profile</h3></div><button className="subtle-button" type="button" onClick={useExample}>Use example</button></div>
          <form onSubmit={submit}>
            <div className="form-grid prediction-fields">{fields.map(([key, label, type, placeholder, max]) => <label key={key}><span>{label}</span><input required type={type} min={type === 'number' ? 0 : undefined} max={max || undefined} step={type === 'number' ? 'any' : undefined} placeholder={placeholder} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}</div>
            <button className="button primary full-button" disabled={busy}>{busy ? 'Analyzing academic profile…' : <><Sparkles size={16} /> Predict performance</>}</button>
          </form>
          <div className="form-hint"><ShieldCheck size={15} /> Student values are validated before prediction.</div>
        </Card>
        <Card className="result-card">
          {!result ? <div className="prediction-empty"><div className="result-orb"><Target size={25} /></div><h3>Your student insight will appear here</h3><p>Enter the academic details to get an estimated final mark, performance category, risk level, and practical suggestions.</p><div className="mini-list"><span><Check size={14} /> Model-based marks estimate</span><span><Check size={14} /> Performance and risk insight</span><span><Check size={14} /> Personalized next steps</span></div></div> : <div className="result-content"><div className="eyebrow">PREDICTION RESULT</div><h3>{result.student_name}</h3><div className="result-mark"><strong>{result.predicted_final_marks}</strong><span>/ 100 marks</span></div><div className="result-pills"><Pill>{result.performance_category}</Pill><Pill>{result.academic_risk}</Pill></div><div className="result-meter"><div className="risk-row"><span>Estimated marks</span><strong>{result.predicted_final_marks}%</strong></div><div className="progress-track"><div className="progress-fill violet" style={{ width: `${result.predicted_final_marks}%` }} /></div></div><div className="insight-block"><strong>Attendance</strong><p>{result.attendance_analysis}</p></div><div className="insight-block"><strong>Study habits</strong><p>{result.study_habit_analysis}</p></div><div className="recommendations"><strong>Suggested next steps</strong>{result.recommendations.map((item) => <div className="recommendation" key={item}><Sparkles size={14} />{item}</div>)}</div><div className="disclaimer">{result.disclaimer}</div><button className="button secondary full-button" onClick={async () => { try { await api('/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, attendance: Number(values.attendance), previous_marks: Number(values.previous_marks), study_hours: Number(values.study_hours), internal_marks: Number(values.internal_marks), ...result }) }); toast('Prediction saved to student records'); await refresh(); } catch (error) { toast(error.message, 'error'); } }}>Save student to records</button></div>}
        </Card>
      </div>
    </>
  );
}

function ModelsPage({ metrics }) {
  const regressions = Object.entries(metrics?.regression || {});
  const classifiers = Object.entries(metrics?.classification || {});
  return (
    <>
      <SectionHeading eyebrow="MODEL QUALITY" title="Model evaluation" action={<span className="model-note">Held-out test data · computed metrics</span>} />
      <div className="info-banner"><ShieldCheck size={17} /><span>Metrics are calculated from the generated training/test split. Synthetic demonstration results are not a guarantee of real-world accuracy.</span></div>
      <Card className="table-card"><div className="card-title-row"><div><div className="eyebrow">REGRESSION</div><h3>Final marks estimation</h3></div><span className="metric-count">{regressions.length} models</span></div><div className="table-wrap"><table><thead><tr><th>Algorithm</th><th>MAE ↓</th><th>MSE ↓</th><th>RMSE ↓</th><th>R² ↑</th></tr></thead><tbody>{regressions.map(([name, row]) => <tr key={name}><td><strong>{name}</strong></td><td>{row.MAE}</td><td>{row.MSE}</td><td>{row.RMSE}</td><td><span className="score-value">{row.R2}</span></td></tr>)}</tbody></table></div></Card>
      <Card className="table-card"><div className="card-title-row"><div><div className="eyebrow">CLASSIFICATION</div><h3>Student category and risk</h3></div><span className="metric-count">{classifiers.length} models</span></div><div className="table-wrap"><table><thead><tr><th>Algorithm / task</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1 score</th></tr></thead><tbody>{classifiers.map(([name, row]) => <tr key={name}><td><strong>{name}</strong><small className="subcell">{name.includes('Neighbors') ? 'Performance classification' : 'Academic risk classification'}</small></td><td>{row.Accuracy}</td><td>{row.Precision}</td><td>{row.Recall}</td><td><span className="score-value">{row.F1}</span></td></tr>)}</tbody></table></div></Card>
      <div className="confusion-grid">{classifiers.map(([name, row]) => <Card className="confusion-card" key={name}><div className="eyebrow">CONFUSION MATRIX</div><h3>{name}</h3><div className="confusion-label">Actual rows · Predicted columns</div><div className="confusion-table"><div className="confusion-corner" />{row.labels.map((label) => <div className="confusion-head" key={`top-${label}`}>{label.replace(' Performance', '')}</div>)}{row.confusion_matrix.map((values, i) => <div className="confusion-row" key={`row-${i}`}><div className="confusion-side">{row.labels[i].replace(' Performance', '')}</div>{values.map((value, j) => <div className={`confusion-cell ${i === j ? 'diagonal' : ''}`} key={`${i}-${j}`}>{value}</div>)}</div>)}</div></Card>)}</div>
      <Card className="chart-card"><div className="card-title-row"><div><div className="eyebrow">REGRESSION CHECK</div><h3>Actual vs predicted marks</h3></div><span className="model-note">Closer to the diagonal = closer predictions</span></div><div className="actual-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="actual" type="number" domain={[0, 100]} name="Actual" label={{ value: 'Actual marks', position: 'insideBottom', offset: -4 }} /><YAxis dataKey="predicted" type="number" domain={[0, 100]} name="Predicted" label={{ value: 'Predicted marks', angle: -90, position: 'insideLeft' }} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#d5d4de" strokeDasharray="5 4" /><Scatter data={(regressions[1]?.[1]?.actual || []).map((actual, i) => ({ actual, predicted: regressions[1][1].predicted[i] }))} fill="#7c6cf2" fillOpacity={0.65} /></ScatterChart></ResponsiveContainer></div></Card>
    </>
  );
}

function AnalyticsPage({ rows, onPerformanceSelect }) {
  const [category, setCategory] = useState('All');
  const charts = [
    ['attendance', 'Attendance (%)', [0, 100], '%'],
    ['study_hours', 'Study hours/day', [0, 12], ' hrs'],
    ['previous_marks', 'Previous semester marks', [0, 100], '%'],
    ['internal_marks', 'Internal examination marks', [0, 20], ' / 20'],
  ];
  const categories = ['Good Performance', 'Average Performance', 'Poor Performance'];
  const visibleRows = category === 'All' ? rows : rows.filter((row) => row.performance_category === category);
  const averageMarks = visibleRows.length
    ? visibleRows.reduce((total, row) => total + Number(row.final_marks || 0), 0) / visibleRows.length
    : 0;
  const categoryRows = (name) => visibleRows.filter((row) => row.performance_category === name);
  return (
    <>
      <SectionHeading eyebrow="ACADEMIC PATTERNS" title="Student analytics" action={<span className="model-note">Explore {rows.length} student records</span>} />
      <div className="analytics-overview">
        <div className="analytics-stat"><span>Students in view</span><strong>{visibleRows.length.toLocaleString()}</strong><small>{category === 'All' ? 'All performance groups' : category}</small></div>
        <div className="analytics-stat"><span>Average final marks</span><strong>{visibleRows.length ? `${averageMarks.toFixed(1)}%` : '—'}</strong><small>For the selected group</small></div>
        <div className="analytics-stat"><span>Chart guide</span><strong className="chart-guide-title">Hover · click · filter</strong><small>Hover points for student details</small></div>
      </div>
      <div className="analytics-filter-bar" role="group" aria-label="Filter charts by performance">
        <span className="filter-label">SHOW</span>
        <button type="button" className={`analytics-filter ${category === 'All' ? 'active' : ''}`} onClick={() => setCategory('All')}>All groups <b>{rows.length}</b></button>
        {categories.map((name) => <button type="button" className={`analytics-filter ${category === name ? 'active' : ''} ${name.toLowerCase().split(' ')[0]}`} key={name} onClick={() => setCategory(name)}><i />{name.replace(' Performance', '')}<b>{rows.filter((row) => row.performance_category === name).length}</b></button>)}
      </div>
      <div className="scatter-grid">{charts.map(([key, label, domain, suffix]) => <Card className="scatter-card" key={key}>
        <div className="scatter-card-heading"><div><div className="eyebrow">FEATURE RELATIONSHIP</div><h3>{label} <span>vs final marks</span></h3></div><span className="scatter-count">{visibleRows.length} pts</span></div>
        <div className="scatter-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -12 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey={key} type="number" name={label} domain={domain} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tickCount={5} />
          <YAxis dataKey="final_marks" type="number" name="Final marks" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} tickCount={5} />
          <Tooltip content={<AnalyticsTooltip axisLabel={label} dataKey={key} suffix={suffix} />} cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '4 4' }} />
          {categories.map((name) => <Scatter key={name} name={name} data={categoryRows(name)} fill={PERFORMANCE_COLORS[name]} fillOpacity={0.72} shape="circle" onClick={(point) => { if (point?.payload?.performance_category) onPerformanceSelect(point.payload.performance_category); }} animationDuration={400} />)}
        </ScatterChart></ResponsiveContainer></div>
        <div className="chart-axis-caption"><span>{label}</span><span>Final marks · 0–100</span></div>
      </Card>)}</div>
      <Card className="chart-card"><div className="card-title-row"><div><div className="eyebrow">COHORT SUMMARY</div><h3>Performance category distribution</h3></div><span className="model-note">Select a row or count to view student names</span></div><div className="category-bars">{['Good Performance', 'Average Performance', 'Poor Performance'].map((name) => { const amount = rows.filter((row) => row.performance_category === name).length; const pct = rows.length ? amount / rows.length * 100 : 0; const color = PERFORMANCE_COLORS[name]; return <button type="button" className="category-bar-row category-bar-button" key={name} onClick={() => onPerformanceSelect(name)} aria-label={`View ${amount} ${name} students`}><span className="category-name"><i style={{ background: color }} />{name}</span><div className="progress-track"><div className="progress-fill" style={{ background: color, width: `${pct}%` }} /></div><strong>{amount}</strong></button>; })}</div><p className="footnote">Patterns are descriptive only; association does not establish cause. Use student data responsibly.</p></Card>
    </>
  );
}

function AboutPage() {
  const algorithms = [
    ['01', 'Linear Regression', 'Single-input mark estimate using previous semester marks.'],
    ['02', 'Multiple Linear Regression', 'Final-mark estimation from attendance, previous marks, study hours, and internal marks.'],
    ['03', 'Polynomial Regression', 'Degree-2 feature expansion to demonstrate non-linear academic relationships.'],
    ['04', 'K-Nearest Neighbors', 'Classifies students as Good, Average, or Poor performance.'],
    ['05', 'Logistic Regression', 'Classifies academic risk as Low, Medium, or High.'],
  ];
  return <><SectionHeading eyebrow="PROJECT INFORMATION" title="About this project" /><Card className="about-hero"><div className="about-symbol"><GraduationCap size={27} /></div><div className="eyebrow">ACADEMIC MINI PROJECT</div><h2>Machine Learning Based Student Academic Performance Prediction and Risk Analysis System</h2><p>A learning-focused analytics tool to estimate academic outcomes from a small set of student indicators and help educators identify where an early supportive conversation may be useful.</p><div className="info-banner"><AlertTriangle size={17} /><span>Demonstration only: generated sample records are synthetic and do not represent real students. Predictions are estimates, not guaranteed results.</span></div></Card><div className="algorithm-grid">{algorithms.map(([number, name, description]) => <Card className="algorithm-card" key={name}><span className="algorithm-number">{number}</span><h3>{name}</h3><p>{description}</p></Card>)}</div><Card className="about-details"><h3>Methodology and data</h3><p>Training and evaluation use separate data partitions. Median imputation, feature scaling, and polynomial expansion are fitted within training pipelines. Final marks are the prediction target only and are excluded from input features. Performance labels use 75/50 mark thresholds; risk labels use 70/45.</p><p>Model scores are calculated on the held-out test data and should be interpreted with care, especially for smaller or imbalanced classes. This prototype is not a production decision system.</p></Card></>;
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('student-theme') === 'dark');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    window.setTimeout(() => setToastMessage(null), 3600);
  }, []);
  const refresh = useCallback(async () => {
    setError('');
    try {
      const [overview, studentRows, modelData, analyticsRows] = await Promise.all([
        api('/dashboard'), api('/students'), api('/models'), api('/analytics'),
      ]);
      setDashboard(overview); setStudents(studentRows); setMetrics(modelData); setAnalytics(analyticsRows);
    } catch (reason) {
      if (reason.message === 'Please sign in to continue.') {
        setUser(null);
        setError('');
      } else setError(reason.message);
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    api('/auth/me').then((result) => {
      if (result.authenticated) {
        setUser(result.user);
        refresh();
      } else {
        setLoading(false);
        setAuthLoading(false);
      }
    }).catch((reason) => {
      setLoading(false);
      setAuthLoading(false);
      setError(reason.message);
    });
  }, [refresh]);
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [user, refresh]);
  useEffect(() => {
    if (user) setAuthLoading(false);
  }, [user]);
  useEffect(() => { localStorage.setItem('student-theme', dark ? 'dark' : 'light'); }, [dark]);
  const title = NAV_ITEMS.find((item) => item.id === page)?.label || 'About project';
  function showPerformanceCategory(category) {
    const shortName = category === 'All' ? 'All' : category.replace(' Performance', '');
    setSelectedCategory(shortName);
    setPage('students');
  }

  if (authLoading) {
    return <main className="auth-shell"><div className="loading-panel"><div className="spinner" /><strong>Opening your secure workspace…</strong></div></main>;
  }
  if (!user) {
    return <div className={dark ? 'dark' : ''}><AuthScreen onAuthenticated={(authenticatedUser) => { setUser(authenticatedUser); setLoading(true); setError(''); refresh(); }} /></div>;
  }
  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setStudents([]);
      setDashboard(null);
      setMetrics(null);
      setAnalytics([]);
      setPage('dashboard');
    } catch (reason) { showToast(reason.message, 'error'); }
  }

  return (
    <div className={dark ? 'app-shell dark' : 'app-shell'}>
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={21} /></div><div className="brand-name">scholar<span>scope</span><small>ACADEMIC ANALYTICS</small></div><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch"><div className="workspace-avatar">{(user.workspace || 'W').slice(0, 1).toUpperCase()}</div><div><strong>{user.workspace}</strong><small>{user.email}</small></div><ChevronDown size={15} /></div>
        <div className="nav-label">MENU</div>
        <nav className="main-nav">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(id); setMobileMenu(false); }}><Icon size={17} /><span>{label}</span>{id === 'students' && <span className="nav-count">{students.length}</span>}</button>)}</nav>
        <div className="nav-label project-label">PROJECT</div>
        <nav className="main-nav"><button className={page === 'about' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('about'); setMobileMenu(false); }}><BookOpen size={17} /><span>About project</span></button></nav>
        <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-mark"><Sparkles size={16} /></div><strong>Academic support, thoughtfully.</strong><p>Use insights to guide supportive conversations.</p><button onClick={() => setPage('about')}>Learn about this project <ArrowRight size={13} /></button></div><div className="profile-row"><div className="profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><small>Educator account</small></div><button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={16} /></button></div></div>
      </aside>
      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={19} /></button><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div><div className="topbar-right"><span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="icon-button theme-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><div className="top-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div></div></header>
        <div className="page-content">
          {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Could not load the application data</strong><span>{error}. Check that the backend is running, then retry.</span></div><button className="button secondary" onClick={refresh}>Retry</button></div>}
          {loading && !error ? <div className="loading-panel"><div className="spinner" /><strong>Preparing your academic workspace…</strong><span>Loading student records and model insights</span></div> : <>
            {page === 'dashboard' && <Dashboard data={dashboard} students={students} navigate={setPage} user={user} onPerformanceSelect={showPerformanceCategory} />}
            {page === 'students' && <StudentsPage rows={students} refresh={refresh} toast={showToast} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />}
            {page === 'prediction' && <PredictionPage toast={showToast} refresh={refresh} />}
            {page === 'models' && (metrics ? <ModelsPage metrics={metrics} /> : <Empty title="Model metrics are unavailable" text="Retry after the backend has loaded its trained models." />)}
            {page === 'analytics' && <AnalyticsPage rows={analytics} onPerformanceSelect={showPerformanceCategory} />}
            {page === 'about' && <AboutPage />}
          </>}
          <footer className="page-footer"><span>ScholarScope · Student academic analytics</span><span><span className="live-dot" /> Local workspace <span className="footer-separator">·</span> Predictions are estimates, not guarantees</span></footer>
        </div>
      </main>
      {toastMessage && <div className={`toast ${toastMessage.type}`}><span className="toast-check">{toastMessage.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}</span>{toastMessage.message}<button className="toast-close" onClick={() => setToastMessage(null)}><X size={15} /></button></div>}
    </div>
  );
}
