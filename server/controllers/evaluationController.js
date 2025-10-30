const mongoose = require('mongoose');
const FormDefinition = require('../models/FormDefinition');
const User = require('../models/User'); 

// This function creates a Mongoose model dynamically
const createEvaluationModel = (formName) => {
    const collectionName = `${formName.toLowerCase().replace(/\s+/g, '_')}_evaluations`;

    if (mongoose.models[collectionName]) {
        return mongoose.models[collectionName];
    }
    
    const EvaluationSchema = new mongoose.Schema({
        intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
        tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        technicalSkill: { type: Number, required: true },
        communication: { type: Number, required: true },
        problemSolving: { type: Number, required: true },
        teamwork: { type: Number, required: true },
        professionalism: { type: Number, required: true },
        comment: { type: String, required: true },
    }, { strict: false, timestamps: true });

    EvaluationSchema.index({ intern: 1 }, { unique: true });
    
    return mongoose.model(collectionName, EvaluationSchema);
};

// @desc    Submit an evaluation
exports.submitEvaluation = async (req, res) => {
    const { formName } = req.params;
    const evaluationData = req.body; 

    try {
        // 1. Get the tutor's email from the cookie
        const tutorEmail = req.session.tutorEmail;
        console.log(tutorEmail);
        if (!tutorEmail) {
            return res.status(401).json({ msg: 'Authorization denied, no session cookie.' });
        }

        // 2. Find the tutor in the database using their email
        const tutorUser = await User.findOne({ email: tutorEmail });
        if (!tutorUser) {
            return res.status(404).json({ msg: 'Tutor from cookie not found in database.' });
        }

        const formDef = await FormDefinition.findOne({ formName, status: 'Active' });
        if (!formDef) {
            return res.status(404).json({ msg: 'Active form not found' });
        }

        const EvaluationModel = createEvaluationModel(formName);
        console.log(tutorUser._id);
        // 3. Create the new evaluation, using the ID from the user we found
        const newEvaluation = new EvaluationModel({
            ...evaluationData,
            tutor: tutorUser._id 
        });
        
        await newEvaluation.save();
        res.status(201).json(newEvaluation);

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'An evaluation for this intern on this form already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};