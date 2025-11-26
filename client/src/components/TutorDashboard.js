import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './TutorDashboard.css';

// Helper function for qualitative grading (Sub-metrics 0-5)
const getSubScoreLabel = (score) => {
  const numScore = Number(score);
  if (numScore === 5) return 'Excellent';
  if (numScore === 4) return 'Good';
  if (numScore === 3) return 'Average';
  if (numScore === 2) return 'Improvement required';
  if (numScore === 1) return 'Uninterested';
  return '';
};

// Helper for Final Grade (0-10 scale)
const getFinalGradeLabel = (score) => {
  if (score >= 9.0) return 'Excellent';
  if (score >= 7.5) return 'Good';
  if (score >= 6.0) return 'Average';
  if (score >= 4.0) return 'Improvement Required';
  return 'Unsatisfactory';
};

const TutorDashboard = () => {
  const [activeForms, setActiveForms] = useState([]);
  const [interns, setInterns] = useState([]);
  const [evaluatedInternIds, setEvaluatedInternIds] = useState([]); 
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState('');
  const [fieldScores, setFieldScores] = useState({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const navigate = useNavigate();

  // ✅ Logout function
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error("Logout failed on server, but logging out client-side.", error);
      } finally {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  // ✅ Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const formsRes = await api.get('/forms/active');
        setActiveForms(formsRes.data);
        const internsRes = await api.get('/interns');
        setInterns(internsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  // ✅ Calculate Live Final Score
  const finalResult = useMemo(() => {
    const scores = Object.values(fieldScores).map(f => f.score);
    if (scores.length === 0) return { score: 0, grade: 'N/A' };

    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / scores.length; // Average of the normalized (0-10) scores
    
    return {
        score: avg.toFixed(2),
        grade: getFinalGradeLabel(avg)
    };
  }, [fieldScores]);


  // ✅ Handle form selection
  const handleFormSelect = async (formName) => {
    const form = activeForms.find((f) => f.formName === formName);
    setSelectedForm(form);
    setSelectedIntern(''); 
    
    // 1. Initialize Scores
    const initialScores = {};
    if (form) {
      [...(form.commonFields || []), ...(form.customFields || [])].forEach(field => {
        initialScores[field.fieldName] = {
          score: 0, 
          subScores: field.subFields.map(sub => ({
            subFieldName: sub.subFieldName,
            score: 0
          }))
        };
      });
    }
    setFieldScores(initialScores);
    setComment('');

    // 2. Fetch Evaluated Interns for this form
    if (formName) {
        try {
            const res = await api.get(`/evaluations/${formName}/evaluated-interns`);
            setEvaluatedInternIds(res.data);
        } catch (error) {
            console.error("Error fetching evaluated interns:", error);
            setEvaluatedInternIds([]);
        }
    } else {
        setEvaluatedInternIds([]);
    }
  };

  // ✅ Handle sub-field input (UPDATED LOGIC)
  const handleSubFieldChange = (mainField, subFieldName, value) => {
    let numericValue = Number(value);
    
    // HARDCODED VALIDATION: Max is always 5 for sub-metrics
    const SUB_MAX = 5;
    
    if (numericValue > SUB_MAX) numericValue = SUB_MAX;
    if (numericValue < 0) numericValue = 0;

    setFieldScores((prev) => {
      const updated = { ...prev };
      if (!updated[mainField]) {
        updated[mainField] = { score: 0, subScores: [] };
      }

      const subIndex = updated[mainField].subScores.findIndex(
        (s) => s.subFieldName === subFieldName
      );

      if (subIndex >= 0) {
        updated[mainField].subScores[subIndex].score = numericValue;
      } else {
        updated[mainField].subScores.push({ subFieldName, score: numericValue });
      }

      // 1. Calculate SUM of raw sub-scores
      const sum = updated[mainField].subScores.reduce(
        (acc, s) => acc + s.score,
        0
      );
      
      // 2. Calculate Max Possible based on number of sub-fields
      // (e.g., 3 subfields * 5 points = 15)
      const numberOfSubFields = updated[mainField].subScores.length;
      const calculatedParentMax = numberOfSubFields * SUB_MAX;
      
      // 3. Normalize to 0-10 scale
      // Formula: (Sum / 15) * 10
      const normalizedScore = calculatedParentMax > 0 ? (sum / calculatedParentMax) * 10 : 0;

      updated[mainField].score = parseFloat(normalizedScore.toFixed(2));
      return updated;
    });
  };

  // ✅ Handle main field input
  const handleMainFieldChange = (mainField, value, maxValue) => {
    let numericValue = Number(value);
    if (numericValue > maxValue) numericValue = maxValue; 
    if (numericValue < 0) numericValue = 0;
    
    const max = maxValue || 10;
    const normalizedScore = max > 0 ? (numericValue / max) * 10 : 0;

    setFieldScores((prev) => ({
      ...prev,
      [mainField]: { 
        score: parseFloat(normalizedScore.toFixed(2)), 
        subScores: [{ subFieldName: 'raw', score: numericValue }]
      },
    }));
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedForm || !selectedIntern) {
      alert('Please select a form and an intern.');
      return;
    }

    setIsSubmitting(true); 

    const fieldScoreArray = Object.entries(fieldScores).map(
      ([fieldName, { subScores }]) => ({
        fieldName,
        score: subScores.length === 1 && subScores[0].subFieldName === 'raw' ? subScores[0].score : 0,
        subScores: subScores.length > 1 ? subScores : [],
      })
    );

    const evaluationData = {
      intern: selectedIntern,
      comment,
      fieldScores: fieldScoreArray,
    };

    try {
      await api.post(`/evaluations/${selectedForm.formName}`, evaluationData);
      alert('✅ Evaluation submitted successfully!');
      
      const updatedEvaluated = [...evaluatedInternIds, selectedIntern];
      setEvaluatedInternIds(updatedEvaluated);

      setSelectedForm(null);
      setSelectedIntern('');
      setFieldScores({});
      setComment('');
    } catch (error) {
      console.error('Submission Error:', error.response?.data);
      alert(`❌ Error: ${error.response?.data?.msg || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false); 
    }
  };

  // ✅ Render field UI
  const renderFieldGroup = (field, index) => (
    <div key={index} className="main-field">
      <h5>{field.fieldName}</h5>
      {field.subFields && field.subFields.length > 0 ? (
        <div className="subfield-group">
          {field.subFields.map((sub, subIndex) => {
            const currentSubScore = fieldScores[field.fieldName]?.subScores?.find(
              (s) => s.subFieldName === sub.subFieldName
            )?.score ?? '';

            return (
              <div key={subIndex} className="subfield">
                <label>{sub.subFieldName}</label>
                <div className="subfield-input-group">
                  <input
                    type="number"
                    min={0}
                    max={5} // FORCE VISUAL MAX TO 5
                    step="0.5"
                    placeholder={`Enter score (0-5)`} 
                    value={currentSubScore}
                    onChange={(e) =>
                      handleSubFieldChange(
                        field.fieldName,
                        sub.subFieldName,
                        e.target.value
                        // Removed outdated max value params
                      )
                    }
                    required
                  />
                  <span className="score-label">
                    {getSubScoreLabel(currentSubScore)}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="avg-score">
            <label>Total {field.fieldName} Score (Normalized 0-10)</label>
            <input
              type="number"
              value={fieldScores[field.fieldName]?.score || 0}
              disabled
              className="total-score-input"
            />
          </div>
        </div>
      ) : (
        <div className="form-field">
          <label>{field.fieldName}</label>
          <input
            type="number"
            min={0}
            max={field.maxValue}
            placeholder={`Enter score (0-${field.maxValue})`}
            onChange={(e) =>
              handleMainFieldChange(field.fieldName, e.target.value, field.maxValue)
            }
            required
          />
           <div className="avg-score">
            <label>Total {field.fieldName} Score (Normalized 0-10)</label>
            <input
              type="number"
              value={fieldScores[field.fieldName]?.score || 0}
              disabled
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="">
      <nav className="navbar">
        <div className="navbar-left">
          <h2 className="nav-title">Intern Evaluation Portal</h2>
        </div>
        <div className="navbar-right">
          <button className="nav-btn" onClick={() => navigate('/tutor')}>
            Dashboard
          </button>
          <button className="nav-btn" onClick={() => alert('Feature coming soon')}>
            Evaluations
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-header">
        <h1>Tutor Dashboard</h1>
        <p>Evaluate interns using active evaluation forms</p>
      </div>

      <div className="tutor-dashboard">
        <div className="selection-section">
          <div className="dropdown-group">
            <label>Select Form:</label>
            <select onChange={(e) => handleFormSelect(e.target.value)} value={selectedForm ? selectedForm.formName : ""}>
              <option value="">-- Choose a Form --</option>
              {activeForms.map((form) => (
                <option key={form._id} value={form.formName}>
                  {form.formName}
                </option>
              ))}
            </select>
          </div>

          <div className="dropdown-group">
            <label>Select Intern:</label>
            <select
              value={selectedIntern}
              onChange={(e) => setSelectedIntern(e.target.value)}
            >
              <option value="">-- Choose an Intern --</option>
              {interns
                .filter(intern => !evaluatedInternIds.includes(intern._id)) 
                .map((intern) => (
                  <option key={intern._id} value={intern._id}>
                    {intern.name} ({intern.email})
                  </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="divider" />

        {selectedForm && (
          <form className="evaluation-form" onSubmit={handleSubmit}>
            <h3>Evaluating: {selectedForm.formName}</h3>

            {/* Metric Sections */}
            <div className="form-section">
              <h4>Standard Metrics</h4>
              {(selectedForm.commonFields || []).map(renderFieldGroup)}
            </div>

            {(selectedForm.customFields || []).length > 0 && (
              <div className="form-section">
                <h4>Custom Metrics</h4>
                {(selectedForm.customFields || []).map(renderFieldGroup)}
              </div>
            )}

            {/* Live Final Score Display */}
            <div className="final-score-preview">
                <h4>Evaluation Summary</h4>
                <div className="score-card">
                    <div className="score-item">
                        <span>Overall Score:</span>
                        <strong>{finalResult.score} / 10</strong>
                    </div>
                    <div className="score-item">
                        <span>Grade:</span>
                        <strong className={`grade-${finalResult.grade.toLowerCase().replace(' ', '-')}`}>
                            {finalResult.grade}
                        </strong>
                    </div>
                </div>
            </div>

            <div className="form-section">
              <label>Comment:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your observations here..."
                required
              ></textarea>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TutorDashboard;