const Joi = require('joi');

// Schema สำหรับ Create Incident
const createIncidentSchema = Joi.object({
  reporter_id:   Joi.string().required(),
  reporter_name: Joi.string().required(),
  phone:         Joi.string().pattern(/^[0-9]{10}$/).required(),
  incident_type: Joi.string().valid('FLOOD', 'FIRE', 'EARTHQUAKE').required(),
  location: Joi.object({
    type:        Joi.string().valid('Point').required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }).required(),
  description:   Joi.string().required(),
  address_name:  Joi.string().optional(),
  severity:      Joi.string().valid('CRITICAL', 'HIGH', 'MEDIUM', 'LOW').optional(),
  report_channel: Joi.string().optional(),
  image_urls:    Joi.array().items(Joi.string().uri()).optional()
});

// Schema สำหรับ Update Status
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED')
    .required(),
  description: Joi.string().optional()
});

module.exports = { createIncidentSchema, updateStatusSchema };
