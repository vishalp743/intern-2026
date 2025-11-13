const express = require('express');
const mongoose = require('mongoose');
const FormDefinition = require('../models/FormDefinition');
const Intern = require('../models/Intern');
const User = require('../models/User');

const router = express.Router(); // ✅ FIX: initialize router

// ==========================
// POST /api/visualizations/data
// ==========================
router.post('/data', async (req, res) => {
  try {
    const { formIds, internIds, metricType } = req.body;

    if (!formIds?.length || !internIds?.length) {
      return res.status(400).json({ msg: 'Please select at least one form and one intern.' });
    }

    // Fetch the form metadata + tutor info
    const forms = await FormDefinition.find({ _id: { $in: formIds } }).populate('tutor', 'name email');

    const responseData = [];

    for (const form of forms) {
      const collectionName = `${form.formName}_evaluations`;
      if (!mongoose.connection.collections[collectionName]) continue; // Skip if collection doesn't exist

      // ✅ Create a dynamic model for this form’s evaluation collection
      const EvaluationModel = mongoose.connection.model(
        collectionName,
        new mongoose.Schema({}, { strict: false }),
        collectionName
      );

      const evals = await EvaluationModel.find({ intern: { $in: internIds } });
      if (evals.length === 0) continue;

      const internMap = {};
      const mainMetrics = {};
      const subMetrics = {};

      for (const ev of evals) {
        const internId = ev.intern.toString();
        if (!internMap[internId]) internMap[internId] = { metrics: {}, subMetrics: {} };

        for (const field of ev.fieldScores || []) {
          // ---- Main metric ----
          if (!internMap[internId].metrics[field.fieldName]) internMap[internId].metrics[field.fieldName] = [];
          internMap[internId].metrics[field.fieldName].push(field.score);

          if (!mainMetrics[field.fieldName]) mainMetrics[field.fieldName] = [];
          mainMetrics[field.fieldName].push(field.score);

          // ---- Submetrics ----
          for (const sub of field.subScores || []) {
            if (!internMap[internId].subMetrics[sub.subFieldName]) internMap[internId].subMetrics[sub.subFieldName] = [];
            internMap[internId].subMetrics[sub.subFieldName].push(sub.score);

            if (!subMetrics[sub.subFieldName]) subMetrics[sub.subFieldName] = [];
            subMetrics[sub.subFieldName].push(sub.score);
          }
        }
      }

      // ---- Compute averages ----
      const internResults = [];
      for (const internId of Object.keys(internMap)) {
        const intern = await Intern.findById(internId);
        if (!intern) continue;

        const avgMain = {};
        const avgSub = {};
        for (const [k, arr] of Object.entries(internMap[internId].metrics))
          avgMain[k] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
        for (const [k, arr] of Object.entries(internMap[internId].subMetrics))
          avgSub[k] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

        internResults.push({
          internId,
          internName: intern.name,
          metrics: metricType === 'sub' ? avgSub : avgMain,
        });
      }

      const avgMetrics = {};
      const target = metricType === 'sub' ? subMetrics : mainMetrics;
      for (const [k, arr] of Object.entries(target))
        avgMetrics[k] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

      responseData.push({
        formId: form._id,
        formName: form.formName,
        tutor: form.tutor,
        avgMetrics,
        interns: internResults,
      });
    }

    if (responseData.length === 0) {
      return res.status(404).json({ msg: 'No evaluations found for selected filters.' });
    }

    res.json({
      success: true,
      metricType,
      tutor: forms[0].tutor,
      data: responseData,
    });
  } catch (error) {
    console.error('Visualization route error:', error);
    res.status(500).json({ msg: 'Server error while fetching visualization data.' });
  }
});

module.exports = router;
