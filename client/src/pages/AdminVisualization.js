import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './AdminVisualization.css';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const AdminVisualization = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [interns, setInterns] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectedInterns, setSelectedInterns] = useState([]);
  const [metricLevel, setMetricLevel] = useState('main');
  const [data, setData] = useState([]);
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const formsRes = await api.get('/forms/active');
        setForms(formsRes.data || []);
        const internsRes = await api.get('/interns');
        setInterns(internsRes.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const toggleSelectForm = (id) => {
    setSelectedForms((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const toggleSelectIntern = (id) => {
    setSelectedInterns((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await api.post('/visualizations/data', {
        formIds: selectedForms,
        internIds: selectedInterns,
        metricType: metricLevel,
      });
      setData(res.data.data);
      setTutor(res.data.tutor);
    } catch (err) {
      alert(err.response?.data?.msg || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const sortTable = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortedMetrics = (metrics) => {
    if (!sortConfig.key) return metrics;
    const sorted = { ...metrics };
    const entries = Object.entries(sorted);
    entries.sort(([aKey, aVal], [bKey, bVal]) =>
      sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    );
    return Object.fromEntries(entries);
  };

  const renderTable = (form) => (
    <div key={form.formId} className="table-container">
      <h4>{form.formName}</h4>
      <table>
        <thead>
          <tr>
            <th>Intern</th>
            {Object.keys(form.avgMetrics).map((metric) => (
              <th
                key={metric}
                className="sortable"
                onClick={() => sortTable(metric)}
              >
                {metric}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {form.interns.map((intern) => {
            const metrics = getSortedMetrics(intern.metrics);
            return (
              <tr key={intern.internId}>
                <td>{intern.internName}</td>
                {Object.keys(metrics).map((metric) => (
                  <td key={metric}>{metrics[metric]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderRadarChart = (metrics, title) => {
    const chartData = Object.keys(metrics).map((m) => ({
      metric: m,
      value: metrics[m],
    }));
    return (
      <div className="chart-container" style={{ height: 400 }}>
        <h4 style={{ marginBottom: 8 }}>{title}</h4>
        <ResponsiveContainer>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={30} domain={[0, 10]} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderLineChart = (formData) => {
    const combined = formData.map((form) => ({
      formName: form.formName,
      ...form.avgMetrics,
    }));

    const keys = Object.keys(formData[0].avgMetrics);

    return (
      <div className="chart-container" style={{ height: 400 }}>
        <h4>Performance Trends Across Forms</h4>
        <ResponsiveContainer>
          <LineChart data={combined}>
            <XAxis dataKey="formName" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Legend />
            {keys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke="#2563eb"
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="admin-visualization-page">
      <div className="vis-header">
        <div>
          <h2>Visualizations</h2>
          <p className="muted">Explore form-based intern evaluations</p>
        </div>
        <button onClick={() => navigate('/admin')} className="btn-secondary">
          ← Back to Admin
        </button>
      </div>

      <div className="tutor-info">
        {tutor ? (
          <span>
            <strong>Tutor:</strong> {tutor.name} ({tutor.email})
          </span>
        ) : (
          <span>Select filters and apply to see tutor info</span>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-card">
          <label>Forms</label>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {forms.map((f) => (
              <label key={f._id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={selectedForms.includes(f._id)}
                  onChange={() => toggleSelectForm(f._id)}
                />
                {f.formName}
              </label>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={() => setSelectedForms([])}
            style={{ marginTop: 6 }}
          >
            Clear
          </button>
        </div>

        <div className="filter-card">
          <label>Interns</label>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {interns.map((i) => (
              <label key={i._id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={selectedInterns.includes(i._id)}
                  onChange={() => toggleSelectIntern(i._id)}
                />
                {i.name}
              </label>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={() => setSelectedInterns([])}
            style={{ marginTop: 6 }}
          >
            Clear
          </button>
        </div>

        <div className="filter-card">
          <label>Metric Type</label>
          <select
            value={metricLevel}
            onChange={(e) => setMetricLevel(e.target.value)}
            style={{ width: '100%', marginTop: 8 }}
          >
            <option value="main">Main Metrics</option>
            <option value="sub">Sub Metrics</option>
          </select>
          <button
            className="btn-primary"
            onClick={handleApply}
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Visualizations */}
      <div className="visualization-output">
        {data.length === 0 ? (
          <div className="chart-container">No data to display.</div>
        ) : (
          data.map((form) => (
            <div key={form.formId} style={{ marginBottom: 24 }}>
              {renderTable(form)}
              {renderRadarChart(form.avgMetrics, `Radar - ${form.formName}`)}
            </div>
          ))
        )}

        {/* Case 3: Multiple forms, single intern */}
        {data.length > 1 && selectedInterns.length === 1 && (
          <>{renderLineChart(data)}</>
        )}
      </div>
    </div>
  );
};

export default AdminVisualization;
