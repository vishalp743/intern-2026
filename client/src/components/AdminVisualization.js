import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import api from '../services/api';
import './AdminVisualization.css';

// --- CONSTANTS ---
const COLORS = [
    '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f',
    '#1abc9c', '#e67e22', '#34495e', '#c0392b', '#2980b9'
];

const MAIN_METRICS = [
    'Technical Skill', 'Communication', 'Problem Solving', 'Teamwork', 'Professionalism',
];

const METRIC_COLOR_MAP = MAIN_METRICS.reduce((acc, metric, index) => {
    acc[metric] = COLORS[index];
    return acc;
}, {});

// --- HELPERS ---
const renderCustomRadarTick = (props) => {
    const { x, y, payload } = props;
    const baseMetricName = payload.value.split(' / ')[0];
    const color = METRIC_COLOR_MAP[baseMetricName] || '#333';
    const textLabel = payload.value.includes(' / ') ? payload.value.split(' / ')[1] : payload.value;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fill={color} fontSize={10}>{textLabel}</text>
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <p className="label" style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '5px' }}>{`${label}`}</p>
        {payload.map((p, index) => (
          <p key={index} style={{ color: p.color, margin: '2px 0' }}>{`${p.name}: ${typeof p.value === 'number' ? p.value.toFixed(2) : p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const getMetricScores = (evaluation, metricType, formDefinition) => {
    const scores = {};
    const metrics = [];
    const allFields = [...(formDefinition.commonFields || []), ...(formDefinition.customFields || [])];

    for (const field of evaluation.fieldScores) {
        const fieldName = field.fieldName;
        if (metricType === 'Main Metric') {
            scores[fieldName] = field.score;
            metrics.push(fieldName);
        } else {
            const definition = allFields.find(f => f.fieldName === fieldName);
            if (definition?.subFields?.length > 0) {
                for (const subScore of field.subScores || []) {
                    const subMetricKey = `${fieldName} / ${subScore.subFieldName}`;
                    const subDef = definition.subFields.find(sf => sf.subFieldName === subScore.subFieldName);
                    const rawScore = subScore.score; 
                    const maxScore = subDef?.maxValue || 5; 
                    scores[subMetricKey] = maxScore > 0 ? (rawScore / maxScore) * 10 : 0;
                    metrics.push(subMetricKey);
                }
            } else {
                 scores[fieldName] = field.score;
                 metrics.push(fieldName);
            }
        }
    }
    return { scores, metrics };
};

const exportToCSV = (data, filename) => {
  if (!data.length) return;
  const flattenedData = data.map(row => {
      const flatRow = { ...row };
      if (flatRow.metricScores) {
          Object.entries(flatRow.metricScores).forEach(([key, val]) => flatRow[key] = val);
          delete flatRow.metricScores;
      }
      delete flatRow.evaluations; 
      return flatRow;
  });
  const headers = Object.keys(flattenedData[0]).join(',');
  const rows = flattenedData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

const getScoreColor = (score) => {
    if (score >= 9) return '#27ae60'; 
    if (score >= 7.5) return '#2980b9'; 
    if (score >= 6) return '#f39c12'; 
    return '#c0392b'; 
};

// Reusing the grade logic for dynamic rows
const getGradeLabel = (score) => {
    if (score >= 9.0) return 'Excellent';
    if (score >= 7.5) return 'Good';
    if (score >= 6.0) return 'Average';
    if (score >= 4.0) return 'Improvement Required';
    return 'Unsatisfactory';
};

// --- COMPONENT ---
const AdminVisualization = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ranking'); 
  const [loading, setLoading] = useState(false);
  
  // Visualizations Tab Data
  const [allForms, setAllForms] = useState([]);
  const [allInterns, setAllInterns] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectedInterns, setSelectedInterns] = useState([]);
  const [metricLevel, setMetricLevel] = useState('Main Metric');
  const [tableData, setTableData] = useState([]);
  const [radarData, setRadarData] = useState([]); 
  const [lineChartData, setLineChartData] = useState([]); 
  const [barChartData, setBarChartData] = useState([]); 
  const [dataMetrics, setDataMetrics] = useState([]); 
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // Ranking & Comments Data
  const [studentsData, setStudentsData] = useState([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState(null); 
  const [selectedRankForm, setSelectedRankForm] = useState(null); // ✅ NEW: Selected form for ranking
  const [selectedMetricSort, setSelectedMetricSort] = useState({ value: 'averageScore', label: 'Average Final Score' });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Comments Tab Specific
  const [selectedCommentStudent, setSelectedCommentStudent] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const [formsRes, internsRes] = await Promise.all([
        api.get('/forms'), 
        api.get('/interns'),
      ]);
      setAllForms(formsRes.data.map(f => ({ value: f.formName, label: `${f.formName}`, _id: f._id, definition: f, createdAt: f.createdAt })));
      setAllInterns(internsRes.data.map(i => ({ value: i._id, label: `${i.name} (${i.email})`, name: i.name })));
    } catch (error) { console.error('Error fetching initial data:', error); }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
      // Fetch data for both Ranking and Comments tab if not present
      if ((activeTab === 'ranking' || activeTab === 'comments') && studentsData.length === 0) {
          const fetchAnalytics = async () => {
              setLoading(true);
              try {
                  const res = await api.get('/evaluations/global-analytics');
                  setStudentsData(res.data);
              } catch (error) { console.error("Error fetching analytics:", error); } finally { setLoading(false); }
          };
          fetchAnalytics();
      }
  }, [activeTab, studentsData.length]);

  // --- LOGIC TAB 1 (VISUALIZATION) ---
  const handleApplyFilters = async () => {
    if (selectedForms.length === 0 || selectedInterns.length === 0) { alert('Please select form and intern.'); return; }
    setLoading(true); setTableData([]); setRadarData([]); setLineChartData([]); setBarChartData([]); setDataMetrics([]);
    try {
      const fetchPromises = selectedForms.map(form => api.get(`/evaluations/${form.value}`).then(res => ({ formName: form.value, formDef: form.definition, evaluations: res.data, formCreatedAt: form.createdAt })));
      const results = await Promise.all(fetchPromises);
      const selectedInternIds = selectedInterns.map(i => i.value);
      let newTableData = []; let allMetrics = new Set();
      
      for (const result of results) {
        const filteredEvals = result.evaluations.filter(evalItem => selectedInternIds.includes(evalItem.intern._id));
        for (const evalItem of filteredEvals) {
            const internName = allInterns.find(i => i.value === evalItem.intern._id)?.name || 'Unknown';
            const { scores, metrics } = getMetricScores(evalItem, metricLevel, result.formDef);
            metrics.forEach(m => allMetrics.add(m));
            newTableData.push({ internId: evalItem.intern._id, internName: internName, formName: result.formName, ...scores, finalGrade: evalItem.finalGrade, date: new Date(evalItem.createdAt).toLocaleDateString(), createdAt: evalItem.createdAt, formCreatedAt: result.formCreatedAt });
        }
      }
      const metricsArray = Array.from(allMetrics).sort();
      setDataMetrics(metricsArray);
      setTableData(newTableData);
      
      const numForms = selectedForms.length; const numInterns = selectedInterns.length;
      if (numForms === 1 && numInterns === 1 && newTableData.length > 0) {
        const radarBase = newTableData[0];
        const chartData = metricsArray.map(metric => ({ subject: metric, [radarBase.internName]: radarBase[metric] || 0, fullMark: 10 }));
        setRadarData(chartData);
      } else if (numForms === 1 && numInterns > 1 && newTableData.length > 0) {
        const barChartData = metricsArray.map(metric => {
            const dataPoint = { name: metric };
            newTableData.forEach(row => { dataPoint[row.internName] = row[metric] || 0; });
            return dataPoint;
        });
        setBarChartData(barChartData);
      } else if (numForms > 1 && numInterns === 1 && newTableData.length > 0) {
        const sortedDataForCharts = newTableData.sort((a, b) => new Date(a.formCreatedAt) - new Date(b.formCreatedAt));
        const radarCharts = sortedDataForCharts.map(item => ({ title: `${item.formName} (${item.date})`, data: metricsArray.map(metric => ({ subject: metric, score: item[metric] || 0, fullMark: 10 })) }));
        setRadarData(radarCharts);
        setLineChartData(sortedDataForCharts.map((item) => { const row = { name: item.formName }; metricsArray.forEach(metric => { row[metric] = item[metric]; }); return row; }));
      } else if (numForms > 1 && numInterns > 1 && newTableData.length > 0) {
        const avgScoresByForm = {};
        metricsArray.forEach(metric => avgScoresByForm[metric] = {});
        newTableData.forEach(row => {
            metricsArray.forEach(metric => {
                const formName = row.formName; const score = row[metric] || 0;
                if (!avgScoresByForm[metric][formName]) avgScoresByForm[metric][formName] = { sum: 0, count: 0 };
                avgScoresByForm[metric][formName].sum += score; avgScoresByForm[metric][formName].count += 1;
            });
        });
        const barChartData = metricsArray.map(metric => {
            const dataPoint = { name: metric };
            selectedForms.forEach(form => {
                const formName = form.value;
                const { sum, count } = avgScoresByForm[metric][formName] || { sum: 0, count: 0 };
                dataPoint[formName] = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
            });
            return dataPoint;
        });
        setBarChartData(barChartData);
      } else { setRadarData([]); setLineChartData([]); setBarChartData([]); }
    } catch (error) { console.error('Error fetching/processing data:', error); } finally { setLoading(false); }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const sortedTableData = React.useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (typeof a[sortConfig.key] === 'number' && typeof b[sortConfig.key] === 'number') {
            return sortConfig.direction === 'ascending' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
        }
        return sortConfig.direction === 'ascending' ? String(a[sortConfig.key]).localeCompare(String(b[sortConfig.key])) : String(b[sortConfig.key]).localeCompare(String(a[sortConfig.key]));
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const renderVisualizationTable = () => {
    if (tableData.length === 0) return null;
    const headers = [];
    if (selectedForms.length > 1) headers.push({ key: 'formName', label: 'Form' });
    if (selectedInterns.length >= 1) headers.push({ key: 'internName', label: 'Intern' });
    headers.push(...dataMetrics.map(m => ({ key: m, label: m })));
    if (metricLevel === 'Main Metric') headers.push({ key: 'finalGrade', label: 'Final Grade'});
    const getSortIcon = (key) => sortConfig.key !== key ? null : (sortConfig.direction === 'ascending' ? '▲' : '▼');
    return (
      <div className="data-table-container">
        <h3>Evaluation Data Table (Normalized 0-10)</h3>
        <table className="data-table">
          <thead><tr>{headers.map(header => <th key={header.key} onClick={() => requestSort(header.key)}>{header.label} <span className="sort-icon">{getSortIcon(header.key)}</span></th>)}</tr></thead>
          <tbody>{sortedTableData.map((row, i) => <tr key={i}>{headers.map(header => <td key={header.key}>{typeof row[header.key] === 'number' ? parseFloat(row[header.key]).toFixed(2) : row[header.key]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  };

  const renderRadarChart = () => {
      const numForms = selectedForms.length; const numInterns = selectedInterns.length;
      if ((numForms === 1 && numInterns === 1) || (numForms > 1 && numInterns === 1)) {
          const title = numForms === 1 ? `Radar: ${selectedForms[0].value}` : `Radar by Form: ${selectedInterns[0].name}`;
          const chartDataSets = numForms === 1 ? [{ title: selectedInterns[0].name, data: radarData }] : radarData;
          return (
              <div className="chart-container"><h3>{title}</h3><div className="radar-charts-section">
                  {chartDataSets.map((chart, i) => (
                    <div key={chart.title} className="radar-chart-card"><h4>{chart.title}</h4>
                      <ResponsiveContainer width="100%" height={300}><RadarChart outerRadius="70%" data={chart.data}><PolarGrid stroke="#e0e0e0" /><PolarAngleAxis dataKey="subject" stroke="#333" tick={renderCustomRadarTick} /><Tooltip content={<CustomTooltip />} /><Radar name={chart.title} dataKey={numForms === 1 ? selectedInterns[0].name : 'score'} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />{numForms === 1 && <Legend />}</RadarChart></ResponsiveContainer>
                    </div>))}</div></div>
          );
      }
      return null;
  };

  const renderGroupedCharts = () => {
    const numForms = selectedForms.length; const numInterns = selectedInterns.length;
    if (numForms === 1 && numInterns > 1 && barChartData.length > 0) {
        return (<div className="chart-container"><h3>Grouped Bar Chart</h3><ResponsiveContainer width="100%" height={400}><BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} stroke="#333" /><YAxis domain={[0, 10]} /><Tooltip content={<CustomTooltip />} /><Legend />{selectedInterns.map((intern, i) => <Bar key={intern.name} dataKey={intern.name} fill={COLORS[i % COLORS.length]} />)}</BarChart></ResponsiveContainer></div>);
    } 
    if (numForms > 1 && numInterns > 1 && barChartData.length > 0) {
        return (<div className="chart-container"><h3>Average Score Comparison</h3><ResponsiveContainer width="100%" height={400}><BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} stroke="#333" /><YAxis domain={[0, 10]} /><Tooltip content={<CustomTooltip />} /><Legend />{selectedForms.map((form, i) => <Bar key={form.value} dataKey={form.value} fill={COLORS[i % COLORS.length]} />)}</BarChart></ResponsiveContainer></div>);
    }
    return null;
  };

  const renderLineChart = () => {
      if (metricLevel === 'Sub Metric') return null;
      if (selectedForms.length > 1 && selectedInterns.length === 1 && lineChartData.length > 0) {
        return (<div className="chart-container"><h3>Progress Trend</h3><ResponsiveContainer width="100%" height={300}><LineChart data={lineChartData} margin={{ top: 15, right: 20, left: 10, bottom: 50 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" height={80} /><YAxis domain={[0, 10]} /><Tooltip content={<CustomTooltip />} /><Legend />{dataMetrics.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />)}</LineChart></ResponsiveContainer></div>);
      }
      return null;
  };

  // --- LOGIC TAB 2 (RANKING) ---
  const filteredAndSortedStudents = useMemo(() => {
    let processed = [];

    // ✅ NEW: Logic for Form-Specific Ranking
    if (selectedRankForm) {
        studentsData.forEach(student => {
            // Find the evaluation for the selected form
            const relevantEval = student.evaluations.find(ev => ev.formName === selectedRankForm.value);
            
            if (relevantEval) {
                // Transform fieldScores array into an object { "Metric Name": 9.0 }
                const formMetricScores = {};
                relevantEval.fieldScores.forEach(f => {
                    formMetricScores[f.fieldName] = f.score;
                });

                processed.push({
                    ...student,
                    // OVERRIDE global averages with form-specific data for this view
                    averageScore: parseFloat(relevantEval.finalScore),
                    metricScores: formMetricScores,
                    // Keep original history for detail view
                });
            }
        });
    } else {
        // Default: Use Global Data
        processed = [...studentsData];
    }

    // Filter by Student (Dropdown)
    if (selectedStudentFilter) {
      processed = processed.filter(s => s.id === selectedStudentFilter.value);
    }

    // Sorting Logic
    processed.sort((a, b) => {
      const metric = selectedMetricSort.value;
      const scoreA = metric === 'averageScore' ? a.averageScore : (a.metricScores[metric] || 0);
      const scoreB = metric === 'averageScore' ? b.averageScore : (b.metricScores[metric] || 0);
      return scoreB - scoreA; 
    });

    return processed.map((s, index) => ({ ...s, currentRank: index + 1 }));
  }, [studentsData, selectedStudentFilter, selectedMetricSort, selectedRankForm]); // Dependency on selectedRankForm

  const metricOptions = useMemo(() => {
    const base = [{ value: 'averageScore', label: 'Average Final Score' }];
    const mainOptions = MAIN_METRICS.map(m => ({ value: m, label: m }));
    
    const customMetrics = new Set();
    if (studentsData.length > 0) {
        studentsData.forEach(s => Object.keys(s.metricScores).forEach(k => {
            if (!MAIN_METRICS.includes(k)) customMetrics.add(k);
        }));
    }
    const customOptions = Array.from(customMetrics).map(m => ({ value: m, label: m }));
    
    return [...base, ...mainOptions, ...customOptions];
  }, [studentsData]);

  // --- LOGIC TAB 3 (COMMENTS) ---
  const allCommentsData = useMemo(() => {
      const commentsList = [];
      studentsData.forEach(student => {
          student.evaluations.forEach(ev => {
              commentsList.push({
                  id: student.id + ev.formId, // pseudo unique id
                  studentId: student.id,
                  studentName: student.name,
                  formName: ev.formName,
                  date: new Date(ev.date).toLocaleDateString(),
                  comment: ev.comment || "No comment"
              });
          });
      });
      return commentsList;
  }, [studentsData]);

  const filteredComments = useMemo(() => {
      if (selectedCommentStudent) {
          return allCommentsData.filter(c => c.studentId === selectedCommentStudent.value);
      }
      return allCommentsData;
  }, [allCommentsData, selectedCommentStudent]);


  // --- STUDENT DETAIL PANEL ---
  const StudentDetailView = ({ student, selectedMetric }) => {
    if (!student) return null;

    const isOverall = selectedMetric.value === 'averageScore';
    const metricLabel = isOverall ? 'Overall' : selectedMetric.label;
    
    const displayAvgScore = isOverall 
        ? student.averageScore 
        : (student.metricScores[selectedMetric.value] || 0);

    return (
      <div className="student-detail-panel">
        <div className="detail-header"><h3>🎓 {student.name} - Report Card</h3><button className="close-btn" onClick={() => setSelectedStudentId(null)}>Close</button></div>
        <div className="detail-summary">
          <div className="summary-card">
              <span>Rank ({metricLabel})</span>
              <strong>#{student.currentRank}</strong>
          </div>
          <div className="summary-card">
              <span>Score ({metricLabel})</span>
              <strong style={{ color: getScoreColor(displayAvgScore) }}>{displayAvgScore}</strong>
          </div>
          <div className="summary-card"><span>Forms</span><strong>{student.totalForms}</strong></div>
        </div>
        
        <h4>📋 Evaluation History ({metricLabel})</h4>
        <table className="history-table">
          <thead>
              <tr>
                  <th>Form Name</th>
                  <th>Date</th>
                  <th>Grade</th>
                  <th>Score</th>
              </tr>
          </thead>
          <tbody>
            {student.evaluations.map((ev, idx) => {
                let displayScore = 0;
                let displayGrade = 'N/A';

                if (isOverall) {
                    displayScore = parseFloat(ev.finalScore);
                    displayGrade = ev.finalGrade;
                } else {
                    const field = ev.fieldScores.find(f => f.fieldName === selectedMetric.value);
                    displayScore = field ? field.score : 0;
                    displayGrade = getGradeLabel(displayScore);
                }

                return (
                  <tr key={idx}>
                    <td>{ev.formName}</td>
                    <td>{new Date(ev.date).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${displayGrade.toLowerCase().replace(/\s+/g, '-')}`}>{displayGrade}</span></td>
                    <td><strong>{displayScore.toFixed(2)}</strong></td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const isCase2 = selectedForms.length === 1 && selectedInterns.length > 1;
  const isCase4 = selectedForms.length > 1 && selectedInterns.length > 1;

  return (
    <div className="visualization-page">
      <div className="vis-header">
        <div className="header-top"><h1>📊 Analytics Dashboard</h1><button onClick={() => navigate('/admin')} className="apply-btn" style={{ maxWidth: '200px', marginLeft: 'auto', backgroundColor: '#3498db' }}>← Dashboard</button></div>
        <div className="view-tabs">

          <button className={`tab-toggle ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>🏆 Rankings & Details</button>
          <button className={`tab-toggle ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>💬 Comments</button>
                    <button className={`tab-toggle ${activeTab === 'visualization' ? 'active' : ''}`} onClick={() => setActiveTab('visualization')}>📈 Visualizations</button>
        </div>
      </div>

      {loading && <div className="loading-spinner">Processing Data...</div>}

      {/* TAB 1: VISUALIZATIONS */}
      {!loading && activeTab === 'visualization' && (
        <div className="filter-section-wrapper">
            <div className="filter-section">
                <div className="filter-group"><label>Form Selector *</label><Select options={allForms} isMulti onChange={setSelectedForms} placeholder="Select forms..." value={selectedForms} /></div>
                <div className="filter-group"><label>Intern Selector *</label><Select options={allInterns} isMulti onChange={setSelectedInterns} placeholder="Select interns..." value={selectedInterns} /></div>
                <div className="filter-group"><label>Metric Level</label><Select options={[{ value: 'Main Metric', label: 'Main Metric' }, { value: 'Sub Metric', label: 'Sub Metric' }]} defaultValue={{ value: metricLevel, label: 'Main Metric' }} onChange={(option) => setMetricLevel(option.value)} /></div>
                <button className="apply-btn" onClick={handleApplyFilters} disabled={loading || selectedForms.length === 0 || selectedInterns.length === 0}>Apply Filters</button>
            </div>
            {!loading && tableData.length > 0 && <div className="visualization-content">{renderVisualizationTable()}{renderGroupedCharts()}{renderLineChart()}{renderRadarChart()}{(isCase2 || isCase4) && <div className="message-info">ℹ️ Radar and Line charts are hidden for multi-select comparisons.</div>}</div>}
            {!loading && tableData.length === 0 && (selectedForms.length > 0 || selectedInterns.length > 0) && <div className="message-info">No data found for selection.</div>}
        </div>
      )}

      {/* TAB 2: RANKING */}
      {!loading && activeTab === 'ranking' && (
        <div className="ranking-content">
          <div className="ranking-controls">
            
            {/* ✅ NEW: Form Filter Dropdown */}
            <div className="control-group" style={{ minWidth: '250px' }}>
                <Select 
                    options={allForms} // Reusing allForms list
                    value={selectedRankForm}
                    onChange={setSelectedRankForm}
                    placeholder="📄 Filter by Form (Optional)"
                    isClearable={true} // Allow clearing to go back to global rank
                />
            </div>

            <div className="control-group" style={{ minWidth: '300px' }}>
                <Select 
                    options={allInterns} 
                    value={selectedStudentFilter}
                    onChange={(val) => {
                        setSelectedStudentFilter(val);
                        // Auto-open detail view if a student is selected
                        if (val) setSelectedStudentId(val.value);
                    }}
                    placeholder="🔍 Select or Search Student..."
                    isClearable={true}
                />
            </div>
            <div className="control-group" style={{ minWidth: '250px' }}>
                <Select options={metricOptions} value={selectedMetricSort} onChange={setSelectedMetricSort} placeholder="Sort by Metric..." />
            </div>
            <button className="export-btn" onClick={() => exportToCSV(filteredAndSortedStudents, 'rankings.csv')}>📥 Export CSV</button>
          </div>

          <div className="ranking-layout">
            <div className="ranking-table-container">
              <table className="ranking-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Student Name</th>
                        {/* Dynamic Header */}
                        <th>{selectedMetricSort.label === 'Average Final Score' ? 'Avg Score' : selectedMetricSort.label}</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStudents.map((student) => {
                    // Calculate display score based on selection
                    const displayScore = selectedMetricSort.value === 'averageScore' 
                        ? student.averageScore 
                        : (student.metricScores[selectedMetricSort.value] || 0);

                    return (
                    <tr key={student.id} className={selectedStudentId === student.id ? 'selected-row' : ''} onClick={() => setSelectedStudentId(student.id)}>
                      <td className="rank-cell">#{student.currentRank}</td>
                      <td><div className="student-name">{student.name}</div><div className="student-email">{student.email}</div></td>
                      <td>
                          <span className="score-badge" style={{ backgroundColor: getScoreColor(displayScore) }}>
                              {displayScore}
                          </span>
                      </td>
                      <td><button className="view-btn">View Details</button></td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            {selectedStudentId && (
              <div className="detail-view-wrapper">
                <StudentDetailView 
                    student={filteredAndSortedStudents.find(s => s.id === selectedStudentId)} 
                    selectedMetric={selectedMetricSort} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMMENTS */}
      {!loading && activeTab === 'comments' && (
          <div className="ranking-content">
              <div className="ranking-controls">
                  <div className="control-group" style={{ minWidth: '350px' }}>
                      <label style={{display:'block', marginBottom:'5px', fontWeight:'600'}}>Filter by Student:</label>
                      <Select 
                          options={allInterns} 
                          value={selectedCommentStudent}
                          onChange={setSelectedCommentStudent}
                          placeholder="All Students"
                          isClearable={true}
                      />
                  </div>
              </div>
              <div className="data-table-container" style={{backgroundColor:'#fff', borderRadius:'8px', overflow:'hidden'}}>
                  <table className="ranking-table">
                      <thead>
                          <tr>
                              <th style={{width:'150px'}}>Student Name</th>
                              <th style={{width:'200px'}}>Form Name</th>
                              <th style={{width:'100px'}}>Date</th>
                              <th>Comment</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredComments.length > 0 ? filteredComments.map((item, idx) => (
                              <tr key={idx}>
                                  <td><strong>{item.studentName}</strong></td>
                                  <td>{item.formName}</td>
                                  <td>{item.date}</td>
                                  <td style={{lineHeight:'1.5', color:'#555'}}>{item.comment}</td>
                              </tr>
                          )) : (
                              <tr><td colSpan="4" style={{textAlign:'center', padding:'30px', color:'#777'}}>No comments found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminVisualization;