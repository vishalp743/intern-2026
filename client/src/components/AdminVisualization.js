import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import api from '../services/api';
import './AdminVisualization.css';

// Helper to assign distinct colors for charts (up to 10 entities)
const COLORS = [
    '#3498db', // 0: Blue (Technical Skill)
    '#e74c3c', // 1: Red (Communication)
    '#2ecc71', // 2: Green (Problem Solving)
    '#9b59b6', // 3: Purple (Teamwork)
    '#f1c40f', // 4: Yellow (Professionalism)
    '#1abc9c', 
    '#e67e22', 
    '#34495e', 
    '#c0392b', 
    '#2980b9'
];

// Define the colors for the 5 main default metrics based on the array order (from FormDefinition.js)
const MAIN_METRICS = [
    'Technical Skill',
    'Communication',
    'Problem Solving',
    'Teamwork',
    'Professionalism',
];

const METRIC_COLOR_MAP = MAIN_METRICS.reduce((acc, metric, index) => {
    acc[metric] = COLORS[index];
    return acc;
}, {});

// Helper function to render colored ticks on the PolarAngleAxis
const renderCustomRadarTick = (props) => {
    const { x, y, payload } = props;
    
    // Extract the base metric name (removes the " / Submetric Name" part)
    const baseMetricName = payload.value.split(' / ')[0];
    const color = METRIC_COLOR_MAP[baseMetricName] || '#333';
    
    // Display only the sub-metric name if it's too long
    const textLabel = payload.value.length > 20 ? `${payload.value.split(' / ')[1] || payload.value}` : payload.value;

    return (
        <g transform={`translate(${x},${y})`}>
            <text 
                x={0} 
                y={0} 
                dy={10} 
                textAnchor="middle" 
                fill={color} 
                fontSize={10}
            >
                {textLabel}
            </text>
        </g>
    );
};


// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <p className="label" style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '5px' }}>{`${label}`}</p>
        {payload.map((p, index) => (
          <p key={index} style={{ color: p.color, margin: '2px 0' }}>
            {`${p.name}: ${typeof p.value === 'number' ? p.value.toFixed(2) : p.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Function to safely extract metric scores from an evaluation object
const getMetricScores = (evaluation, metricType, formDefinition) => {
    const allFields = [
        ...(formDefinition.commonFields || []), 
        ...(formDefinition.customFields || [])
    ];
    
    const scores = {};
    const metrics = [];

    // Iterate over the actual saved scores (fieldScores)
    for (const field of evaluation.fieldScores) {
        const fieldName = field.fieldName;
        
        if (metricType === 'Main Metric') {
            // Case 1: Main Metric
            scores[fieldName] = field.score;
            metrics.push(fieldName);
        } else {
            // Case 2: Sub Metric - Get the sub-metrics that actually have subScores
            const definition = allFields.find(f => f.fieldName === fieldName);
            
            if (definition?.subFields?.length > 0) {
                // Ensure field.subScores exists and iterate over them
                for (const subScore of field.subScores || []) {
                    const subMetricKey = `${fieldName} / ${subScore.subFieldName}`;
                    scores[subMetricKey] = subScore.score;
                    metrics.push(subMetricKey);
                }
            } else {
                 // For fields defined without subfields, use the main score and its name
                 scores[fieldName] = field.score;
                 metrics.push(fieldName);
            }
        }
    }
    return { scores, metrics };
};


// --- COMPONENT START ---
const AdminVisualization = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allForms, setAllForms] = useState([]);
  const [allInterns, setAllInterns] = useState([]);

  // Filter States
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectedInterns, setSelectedInterns] = useState([]);
  const [metricLevel, setMetricLevel] = useState('Main Metric');

  // Processed Data States
  const [tableData, setTableData] = useState([]);
  const [radarData, setRadarData] = useState([]); // Case 1 or Case 3
  const [lineChartData, setLineChartData] = useState([]); // Case 3 only
  const [barChartData, setBarChartData] = useState([]); // Case 2 (Grouped) & Case (Average/Distribution)
  const [dataMetrics, setDataMetrics] = useState([]); // The list of metrics (table columns)
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // --- DATA FETCHING ---
  const fetchInitialData = useCallback(async () => {
    try {
      // Admin must fetch ALL forms defined in the system
      const [formsRes, internsRes] = await Promise.all([
        api.get('/forms'), // Admin fetches ALL forms
        api.get('/interns'),
      ]);
      
      setAllForms(formsRes.data.map(f => ({ 
        value: f.formName, 
        label: `${f.formName} (Tutor: ${f.tutor.name})`, 
        _id: f._id, 
        definition: f,
        createdAt: f.createdAt // Keep creation date for sorting if needed
      })));
      setAllInterns(internsRes.data.map(i => ({ 
        value: i._id, 
        label: `${i.name} (${i.email})`, 
        name: i.name 
      })));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- DATA PROCESSING & AGGREGATION ---
  const handleApplyFilters = async () => {
    if (selectedForms.length === 0 || selectedInterns.length === 0) {
      alert('Please select at least one form and one intern.');
      return;
    }

    setLoading(true);
    setTableData([]);
    setRadarData([]);
    setLineChartData([]);
    setBarChartData([]);
    setDataMetrics([]);

    try {
      // 1. Fetch all evaluations for the selected forms concurrently
      const fetchPromises = selectedForms.map(form => 
        api.get(`/evaluations/${form.value}`).then(res => ({
          formName: form.value,
          formDef: form.definition,
          evaluations: res.data,
          formCreatedAt: form.createdAt,
        }))
      );
      
      const results = await Promise.all(fetchPromises);
      const selectedInternIds = selectedInterns.map(i => i.value);
      
      let newTableData = [];
      let allMetrics = new Set();
      
      // 2. Process fetched evaluations
      for (const result of results) {
        const { formName, formDef, evaluations, formCreatedAt } = result;
        
        // Filter evaluations by the selected interns for table and main charts
        const filteredEvals = evaluations.filter(evalItem => 
          selectedInternIds.includes(evalItem.intern._id)
        );

        // Map filtered evaluation data to table rows
        for (const evalItem of filteredEvals) {
            const internName = allInterns.find(i => i.value === evalItem.intern._id)?.name || 'Unknown';
            const { scores, metrics } = getMetricScores(evalItem, metricLevel, formDef);
            
            metrics.forEach(m => allMetrics.add(m));
            
            newTableData.push({
                internId: evalItem.intern._id,
                internName: internName,
                formName: formName,
                ...scores,
                date: new Date(evalItem.createdAt).toLocaleDateString(),
                createdAt: evalItem.createdAt, // For chronological sorting
                formCreatedAt: formCreatedAt
            });
        }
      }
      
      // 3. Update core states
      const metricsArray = Array.from(allMetrics).sort();
      setDataMetrics(metricsArray);
      setTableData(newTableData);
      
      // 4. Conditional Chart Preparation
      const numForms = selectedForms.length;
      const numInterns = selectedInterns.length;
      
      if (numForms === 1 && numInterns === 1 && newTableData.length > 0) {
        // Case 1: One Form + One Intern -> Single Radar Chart
        const radarBase = newTableData[0];
        
        const chartData = metricsArray.map(metric => ({
          subject: metric, // Use full name as subject
          [radarBase.internName]: radarBase[metric] || 0,
          fullMark: 10,
        }));
        setRadarData(chartData);
        
      } else if (numForms === 1 && numInterns > 1 && newTableData.length > 0) {
        // Case 2: One Form + Multiple Interns -> Grouped Bar Chart
        const barChartData = metricsArray.map(metric => {
            const dataPoint = { name: metric };
            newTableData.forEach(row => {
                dataPoint[row.internName] = row[metric] || 0;
            });
            return dataPoint;
        });
        setBarChartData(barChartData);
        
      } else if (numForms > 1 && numInterns === 1 && newTableData.length > 0) {
        // Case 3: Multiple Forms + One Intern -> Multiple Radar Charts & Line Chart
        const sortedDataForCharts = newTableData.sort((a, b) => new Date(a.formCreatedAt) - new Date(b.formCreatedAt));
        
        // Radar Data (one chart per form)
        const radarCharts = sortedDataForCharts.map(item => {
            const { formName, date, ...scores } = item;
            return {
                title: `${formName} (on ${date})`,
                data: metricsArray.map(metric => ({
                    subject: metric,
                    score: scores[metric] || 0,
                    fullMark: 10,
                })),
            };
        });
        setRadarData(radarCharts);

        // Line Chart Data (Metrics over Forms Chronologically)
        setLineChartData(sortedDataForCharts.map((item) => {
            const row = { name: item.formName };
            metricsArray.forEach(metric => {
                row[metric] = item[metric];
            });
            return row;
        }));
        
      } else if (numForms > 1 && numInterns > 1 && newTableData.length > 0) {
        // Case 4 (Bonus: Multiple Forms + Multiple Interns) -> Average Score Comparison Chart
        
        const avgScoresByForm = {};
        metricsArray.forEach(metric => avgScoresByForm[metric] = {});

        newTableData.forEach(row => {
            metricsArray.forEach(metric => {
                const formName = row.formName;
                const score = row[metric] || 0;
                if (!avgScoresByForm[metric][formName]) {
                    avgScoresByForm[metric][formName] = { sum: 0, count: 0 };
                }
                avgScoresByForm[metric][formName].sum += score;
                avgScoresByForm[metric][formName].count += 1;
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

      } else {
          // Clear charts for unsupported or multi-intern/multi-form case
          setRadarData([]);
          setLineChartData([]);
          setBarChartData([]);
      }
      
    } catch (error) {
      console.error('Error fetching/processing evaluation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- UI SORTING ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = React.useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (typeof a[sortConfig.key] === 'number' && typeof b[sortConfig.key] === 'number') {
            if (a[sortConfig.key] < b[sortConfig.key]) {
              return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
              return sortConfig.direction === 'ascending' ? 1 : -1;
            }
        }
        if (String(a[sortConfig.key]) < String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(a[sortConfig.key]) > String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  // --- RENDER HELPERS ---
  const renderTable = () => {
    if (tableData.length === 0) return null;
    
    const headers = [];
    if (selectedForms.length > 1) {
        headers.push({ key: 'formName', label: 'Form' });
    }
    if (selectedInterns.length >= 1) {
        headers.push({ key: 'internName', label: 'Intern' });
    } 
    
    headers.push(...dataMetrics.map(m => ({ key: m, label: m })));

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    return (
      <div className="data-table-container">
        <h3>Evaluation Data Table ({metricLevel})</h3>
        <table className="data-table">
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header.key} onClick={() => requestSort(header.key)}>
                  {header.label}
                  <span className="sort-icon">{getSortIcon(header.key)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTableData.map((row, i) => (
              <tr key={i}>
                {headers.map(header => (
                  <td key={header.key}>
                    {typeof row[header.key] === 'number' 
                        ? parseFloat(row[header.key]).toFixed(2) 
                        : row[header.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  const renderRadarChart = () => {
      const numForms = selectedForms.length;
      const numInterns = selectedInterns.length;
      
      if ((numForms === 1 && numInterns === 1) || (numForms > 1 && numInterns === 1)) {
          // Case 1 (Single Radar) or Case 3 (Multiple Radars)
          const title = numForms === 1 
            ? `Performance Radar: ${selectedForms[0].value} (${metricLevel})` 
            : `Performance Radar by Form (Intern: ${selectedInterns[0].name}) (${metricLevel})`;

          const chartDataSets = numForms === 1 ? [{ title: selectedInterns[0].name, data: radarData }] : radarData;
          const legendKey = numForms === 1 ? selectedInterns[0].name : 'score';


          return (
              <div className="chart-container">
                <h3>{title}</h3>
                <div className="radar-charts-section">
                  {chartDataSets.map((chart, i) => (
                    <div key={chart.title} className="radar-chart-card">
                      <h4>{chart.title}</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart outerRadius="70%" data={chart.data}>
                          <PolarGrid stroke="#e0e0e0" />
                          <PolarAngleAxis 
                              dataKey="subject" 
                              stroke="#333" 
                              tick={renderCustomRadarTick} // Apply custom coloring function
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Radar 
                              name={chart.title} 
                              dataKey={legendKey} 
                              stroke={COLORS[i % COLORS.length]} 
                              fill={COLORS[i % COLORS.length]} 
                              fillOpacity={0.6} 
                          />
                          {numForms === 1 && <Legend />}
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
          );
      }
      return null;
  };
  
  const renderGroupedCharts = () => {
    const numForms = selectedForms.length;
    const numInterns = selectedInterns.length;
    
    if (numForms === 1 && numInterns > 1 && barChartData.length > 0) {
        // Grouped Bar Chart (Case 2: Compare multiple interns on one form)
        const internNames = selectedInterns.map(i => i.name);
        return (
            <div className="chart-container">
              <h3>Grouped Bar Chart: Intern Comparison on {selectedForms[0].value} ({metricLevel})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} stroke="#333" />
                  <YAxis domain={[0, 10]} stroke="#333" unit="/10" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {internNames.map((name, i) => (
                    <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
        );
    } 
    
    if (numForms > 1 && numInterns > 1 && barChartData.length > 0) {
        // Average Score Comparison Chart (Case 4: Multiple Forms + Multiple Interns)
        const formNames = selectedForms.map(f => f.value);
        return (
            <div className="chart-container">
                <h3>Average Score Comparison Chart ({metricLevel})</h3>
                <p className="message-info" style={{margin: '10px 0'}}>
                    Shows the **average score** for each metric, aggregated across the selected interns, for each selected form.
                </p>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} stroke="#333" />
                        <YAxis domain={[0, 10]} stroke="#333" unit="/10" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {formNames.map((name, i) => (
                            <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
    
    return null;
  }
  
  const renderLineChart = () => {
      const numForms = selectedForms.length;
      const numInterns = selectedInterns.length;

      // Suppress Line Chart if Sub Metric is selected
      if (metricLevel === 'Sub Metric') return null;
      
      if (numForms > 1 && numInterns === 1 && lineChartData.length > 0) {
        // Line Chart (Case 3: Trend over Forms)
        
        const lineKeys = dataMetrics;

        return (
            <div className="chart-container">
              <h3>Progress Trend Across Forms (Intern: {selectedInterns[0].name})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData} margin={{ top: 15, right: 20, left: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" stroke="#333" angle={-30} textAnchor="end" height={80} interval={0} />
                  <YAxis domain={[0, 10]} stroke="#333" unit="/10" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {lineKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[i % COLORS.length]}
                      activeDot={{ r: 5 }}
                      name={key}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
        );
      }
      return null;
  };


  // --- MAIN RENDER ---
  const isCase2 = selectedForms.length === 1 && selectedInterns.length > 1;
  const isCase4 = selectedForms.length > 1 && selectedInterns.length > 1;


  return (
    <div className="visualization-page">
      <div className="vis-header">
        <h1>Evaluation Visualizations 📊</h1>
        <button onClick={() => navigate('/admin')} className="apply-btn" style={{ maxWidth: '200px', margin: '10px auto', backgroundColor: '#3498db' }}>
          ← Back to Dashboard
        </button>
      </div>

      {/* 1. Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label>Form Selector (Multi-select) *</label>
          <Select
            options={allForms}
            isMulti
            onChange={setSelectedForms}
            placeholder="Select evaluation forms..."
            value={selectedForms}
          />
        </div>

        <div className="filter-group">
          <label>Intern Selector (Multi-select) *</label>
          <Select
            options={allInterns}
            isMulti
            onChange={setSelectedInterns}
            placeholder="Select interns..."
            value={selectedInterns}
          />
        </div>

        <div className="filter-group">
          <label>Metric Level</label>
          <Select
            options={[
              { value: 'Main Metric', label: 'Main Metric (Avg. Score)' },
              { value: 'Sub Metric', label: 'Sub Metric (Detailed Score)' },
            ]}
            defaultValue={{ value: metricLevel, label: metricLevel }}
            onChange={(option) => setMetricLevel(option.value)}
          />
        </div>

        <button className="apply-btn" onClick={handleApplyFilters} disabled={loading || selectedForms.length === 0 || selectedInterns.length === 0}>
          {loading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>

      {loading && <div className="loading-spinner">Fetching data and building charts...</div>}
      
      {!loading && tableData.length === 0 && (selectedForms.length > 0 || selectedInterns.length > 0) && (
        <div className="message-info">No evaluation data found for the selected filters or invalid combination.</div>
      )}

      {/* 2. Visualization Content */}
      {!loading && tableData.length > 0 && (
        <div className="visualization-content">
          
          {/* Table Data Section */}
          {renderTable()}
          
          {/* Grouped Bar Chart / Average Score Comparison Chart (Case 2 & Case 4) */}
          {renderGroupedCharts()}
          
          {/* Line Chart Section (Case 3 only) */}
          {renderLineChart()}
          
          {/* Radar Chart Section (Case 1 & Case 3) */}
          {renderRadarChart()}
          
          {(isCase2 || isCase4) && (
            <div className="message-info">
                ℹ️ Radar and Line charts are shown only for single intern analysis (Case 1 & 3). For multi-intern/multi-form comparison, see the Bar Charts and Table.
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export default AdminVisualization;