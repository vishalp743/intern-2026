import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './TutorDashboard.css';

const TutorDashboard = () => {
  const [activeForms, setActiveForms] = useState([]);
  const [interns, setInterns] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState('');
  const [fieldScores, setFieldScores] = useState({});
  const [comment, setComment] = useState('');

  const navigate = useNavigate();

  // ✅ Logout function
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      navigate('/');
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

  // ✅ Handle form selection
  const handleFormSelect = (formName) => {
    const form = activeForms.find((f) => f.formName === formName);
    setSelectedForm(form);
    setFieldScores({});
    setComment('');
  };

  // ✅ Handle sub-field input
  const handleSubFieldChange = (mainField, subFieldName, value, maxValue) => {
    let numericValue = Number(value);
    if (numericValue > maxValue) numericValue = maxValue;

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

      const totalPossible = updated[mainField].subScores.reduce(
        (acc, s) => acc + maxValue,
        0
      );
      const obtained = updated[mainField].subScores.reduce(
        (acc, s) => acc + s.score,
        0
      );
      const relativeScore = totalPossible > 0 ? (obtained / totalPossible) * 10 : 0;
      updated[mainField].score = parseFloat(relativeScore.toFixed(2));
      return updated;
    });
  };

  // ✅ Handle main field input
  const handleMainFieldChange = (mainField, value, maxValue) => {
    let numericValue = Number(value);
    if (numericValue > maxValue) numericValue = maxValue;
    setFieldScores((prev) => ({
      ...prev,
      [mainField]: { score: numericValue, subScores: [] },
    }));
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedForm || !selectedIntern) {
      alert('Please select a form and an intern.');
      return;
    }

    const fieldScoreArray = Object.entries(fieldScores).map(
      ([fieldName, { score, subScores }]) => ({
        fieldName,
        score,
        subScores,
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
      setSelectedForm(null);
      setSelectedIntern('');
      setFieldScores({});
      setComment('');
    } catch (error) {
      console.error('Submission Error:', error.response?.data);
      alert(`❌ Error: ${error.response?.data?.msg || 'Unknown error'}`);
    }
  };

  // ✅ Render field UI
  const renderFieldGroup = (field, index) => (
    <div key={index} className="main-field">
      <h5>{field.fieldName}</h5>
      {field.subFields && field.subFields.length > 0 ? (
        <div className="subfield-group">
          {field.subFields.map((sub, subIndex) => (
            <div key={subIndex} className="subfield">
              <label>{sub.subFieldName}</label>
              <input
                type="number"
                min={0}
                max={sub.maxValue}
                placeholder={`Enter score (max ${sub.maxValue})`}
                onChange={(e) =>
                  handleSubFieldChange(
                    field.fieldName,
                    sub.subFieldName,
                    e.target.value,
                    sub.maxValue
                  )
                }
                required
              />
            </div>
          ))}
          <div className="avg-score">
            <label>Normalized Score (0–10)</label>
            <input
              type="number"
              value={fieldScores[field.fieldName]?.score || 0}
              disabled
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
            placeholder={`Enter score (max ${field.maxValue})`}
            onChange={(e) =>
              handleMainFieldChange(field.fieldName, e.target.value, field.maxValue)
            }
            required
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="">
      {/* ✅ NAVIGATION BAR */}
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

      {/* DASHBOARD CONTENT */}
      <div className="dashboard-header">
        <h1>Tutor Dashboard</h1>
        <p>Evaluate interns using active evaluation forms</p>
      </div>

<div className="tutor-dashboard" >
      <div className="selection-section">
        <div className="dropdown-group">
          <label>Select Form:</label>
          <select onChange={(e) => handleFormSelect(e.target.value)}>
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
            {interns.map((intern) => (
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

          <div className="form-section">
            <label>Comment:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your observations here..."
              required
            ></textarea>
          </div>

          <button type="submit" className="submit-btn">
            Submit Evaluation
          </button>
        </form>
      )}

    </div>
    </div>
  );
};

export default TutorDashboard;
