import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TutorDashboard = () => {
    const [activeForms, setActiveForms] = useState([]);
    const [interns, setInterns] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [selectedIntern, setSelectedIntern] = useState('');
    const [scores, setScores] = useState({});
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
        setScores({}); 
        setComment('');
    };
    
    const handleScoreChange = (fieldName, value) => {
    // FIX: Convert fieldName to proper camelCase (e.g., "Problem Solving" becomes "problemSolving")
    const key = fieldName.charAt(0).toLowerCase() + fieldName.slice(1).replace(/\s+/g, '');
    setScores(prev => ({ ...prev, [key]: value }));
};
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedForm || !selectedIntern) {
            alert('Please select a form and an intern.');
            return;
        }

        const evaluationData = {
            intern: selectedIntern,
            comment,
            ...scores
        };

        try {
            await api.post(`/evaluations/${selectedForm.formName}`, evaluationData);
            alert('Evaluation submitted successfully!');
            setSelectedForm(null);
            setSelectedIntern('');
        } catch (error) {
            console.error('Submission Error:', error.response.data);
            alert(`Error: ${error.response.data.msg}`);
        }
    };

    return (
        <div>
            <h1>Tutor Dashboard</h1>
            
            <div>
                <label>Select Form: </label>
                <select onChange={(e) => handleFormSelect(e.target.value)}>
                    <option value="">-- Choose a Form --</option>
                    {activeForms.map(form => (
                        <option key={form._id} value={form.formName}>{form.formName}</option>
                    ))}
                </select>
            </div>
             <div>
                <label>Select Intern: </label>
                <select value={selectedIntern} onChange={(e) => setSelectedIntern(e.target.value)}>
                     <option value="">-- Choose an Intern --</option>
                    {interns.map(intern => (
                        <option key={intern._id} value={intern._id}>{intern.name} ({intern.email})</option>
                    ))}
                </select>
            </div>
            <hr/>
            
            {selectedForm && (
                <form onSubmit={handleSubmit}>
                    <h3>Evaluating: {selectedForm.formName}</h3>
                    
                    <h4>Standard Metrics</h4>
                    {/* FIX: Use (selectedForm.commonFields || []) to prevent crash if commonFields is missing */}
                    {(selectedForm.commonFields || []).map(field => (
                        <div key={field.fieldName}>
                            <label>{field.fieldName}: </label>
                            <input 
                                type="number"
                                min={field.minValue}
                                max={field.maxValue}
                                onChange={(e) => handleScoreChange(field.fieldName, e.target.value)}
                                required
                            />
                        </div>
                    ))}

                    {/* FIX: Use (selectedForm.customFields || []) to prevent crash if customFields is missing */}
                    {(selectedForm.customFields || []).length > 0 && <h4>Custom Metrics</h4>}
                    {(selectedForm.customFields || []).map(field => (
                        <div key={field.fieldName}>
                            <label>{field.fieldName}: </label>
                            <input 
                                type="number"
                                min={field.minValue}
                                max={field.maxValue}
                                onChange={(e) => handleScoreChange(field.fieldName, e.target.value)}
                                required
                            />
                        </div>
                    ))}

                    <div>
                        <label>Comment:</label>
                        <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)} 
                            required
                        ></textarea>
                    </div>

                    <button type="submit">Submit Evaluation</button>
                </form>
            )}
        </div>
    );
};

export default TutorDashboard;