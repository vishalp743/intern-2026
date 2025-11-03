import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TutorDashboard.css';

const TutorDashboard = () => {
    const [activeForms, setActiveForms] = useState([]);
    const [interns, setInterns] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [selectedIntern, setSelectedIntern] = useState('');
    const [fieldScores, setFieldScores] = useState({});
    const [comment, setComment] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const formsRes = await api.get('/forms/active');
                setActiveForms(formsRes.data);
                
                const internsRes = await api.get('/interns');
                setInterns(internsRes.data);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    const handleFormSelect = (formName) => {
        const form = activeForms.find(f => f.formName === formName);
        setSelectedForm(form);
        setFieldScores({});
        setComment('');
    };

    const handleSubFieldChange = (mainField, subFieldName, value) => {
        setFieldScores(prev => {
            const updated = { ...prev };

            // Initialize main field if missing
            if (!updated[mainField]) {
                updated[mainField] = { score: 0, subScores: [] };
            }

            // Update or add the subfield score
            const subIndex = updated[mainField].subScores.findIndex(s => s.subFieldName === subFieldName);
            if (subIndex >= 0) {
                updated[mainField].subScores[subIndex].score = Number(value);
            } else {
                updated[mainField].subScores.push({ subFieldName, score: Number(value) });
            }

            // Recalculate main field score = average of sub-field scores
            const subScores = updated[mainField].subScores.map(s => s.score);
            const avg = subScores.length ? (subScores.reduce((a, b) => a + b, 0) / subScores.length) : 0;
            updated[mainField].score = parseFloat(avg.toFixed(2));

            return updated;
        });
    };

    const handleMainFieldChange = (mainField, value) => {
        setFieldScores(prev => ({
            ...prev,
            [mainField]: { score: Number(value), subScores: [] }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedForm || !selectedIntern) {
            alert('Please select a form and an intern.');
            return;
        }

        // Convert to backend-compatible structure
        const fieldScoreArray = Object.entries(fieldScores).map(([fieldName, { score, subScores }]) => ({
            fieldName,
            score,
            subScores
        }));

        const evaluationData = {
            intern: selectedIntern,
            comment,
            fieldScores: fieldScoreArray
        };

        try {
            await api.post(`/evaluations/${selectedForm.formName}`, evaluationData);
            alert('Evaluation submitted successfully!');
            setSelectedForm(null);
            setSelectedIntern('');
        } catch (error) {
            console.error('Submission Error:', error.response?.data);
            alert(`Error: ${error.response?.data?.msg || 'Unknown error'}`);
        }
    };

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
                                min={sub.minValue}
                                max={sub.maxValue}
                                onChange={(e) =>
                                    handleSubFieldChange(field.fieldName, sub.subFieldName, e.target.value)
                                }
                                required
                            />
                        </div>
                    ))}
                    <div className="avg-score">
                        <label>Average ({field.fieldName})</label>
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
                        min={field.minValue}
                        max={field.maxValue}
                        onChange={(e) => handleMainFieldChange(field.fieldName, e.target.value)}
                        required
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="tutor-dashboard">
            <div className="dashboard-header">
                <h1>Tutor Dashboard</h1>
                <p>Evaluate interns using active evaluation forms</p>
            </div>

            <div className="selection-section">
                <div className="dropdown-group">
                    <label>Select Form:</label>
                    <select onChange={(e) => handleFormSelect(e.target.value)}>
                        <option value="">-- Choose a Form --</option>
                        {activeForms.map(form => (
                            <option key={form._id} value={form.formName}>{form.formName}</option>
                        ))}
                    </select>
                </div>

                <div className="dropdown-group">
                    <label>Select Intern:</label>
                    <select value={selectedIntern} onChange={(e) => setSelectedIntern(e.target.value)}>
                        <option value="">-- Choose an Intern --</option>
                        {interns.map(intern => (
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
                            required
                        ></textarea>
                    </div>

                    <button type="submit" className="submit-btn">Submit Evaluation</button>
                </form>
            )}
        </div>
    );
};

export default TutorDashboard;
