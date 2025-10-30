// client/src/components/AdminDashboard.js
import React, { useState } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
    const [formName, setFormName] = useState('');
    const [customFields, setCustomFields] = useState([{ fieldName: '', minValue: 0, maxValue: 10 }]);

    const handleAddField = () => {
        setCustomFields([...customFields, { fieldName: '', minValue: 0, maxValue: 10 }]);
    };

    const handleFieldChange = (index, event) => {
        const values = [...customFields];
        values[index][event.target.name] = event.target.value;
        setCustomFields(values);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const newForm = { formName, customFields, status: 'Active' };
            const response = await api.post('/forms', newForm);
            alert(`Form "${response.data.formName}" created successfully!`);
            // Reset form
            setFormName('');
            setCustomFields([{ fieldName: '', minValue: 0, maxValue: 10 }]);
        } catch (error) {
            console.error('Error creating form:', error.response.data);
            alert(`Error: ${error.response.data.msg}`);
        }
    };

    return (
        <div>
            <h1>Admin Dashboard - Create Evaluation Form</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Form Name:</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <hr />
                <h3>Standard Fields (Always Included)</h3>
                <ul>
                    <li>Technical Skill</li>
                    <li>Communication</li>
                    <li>Problem Solving</li>
                    <li>Teamwork</li>
                    <li>Professionalism</li>
                    <li>Comment (Text Field)</li>
                </ul>
                <hr />
                <h3>Add Custom Fields</h3>
                {customFields.map((field, index) => (
                    <div key={index}>
                        <input
                            type="text"
                            placeholder="Field Name"
                            name="fieldName"
                            value={field.fieldName}
                            onChange={event => handleFieldChange(index, event)}
                        />
                         {/* You can add inputs for min/max values here too */}
                    </div>
                ))}
                <button type="button" onClick={handleAddField}>Add Custom Field</button>
                <hr />
                <button type="submit">Create Form</button>
            </form>
        </div>
    );
};

export default AdminDashboard;