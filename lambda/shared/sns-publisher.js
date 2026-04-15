const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function publishIncidentCreated(incident) {
  const message = {
    incidentId: incident.incident_id,
    incidentType: incident.incident_type,
    severity: incident.severity,
    status: incident.status,
    location: incident.location,
    addressName: incident.address_name,
    description: incident.description,
    reporterId: incident.reporter_id,
    reportChannel: incident.report_channel,
    affectedCount: incident.affected_count || 0,
    createdAt: incident.created_at,
  };

  const params = {
    TopicArn: process.env.SNS_TOPIC_INCIDENT_CREATED,
    Message: JSON.stringify(message),
    MessageAttributes: {
      messageId: { DataType: 'String', StringValue: uuidv4() },
      eventType: { DataType: 'String', StringValue: 'IncidentCreated' },
      version: { DataType: 'String', StringValue: 'v1' },
      timestamp: { DataType: 'String', StringValue: new Date().toISOString() },
      source: { DataType: 'String', StringValue: 'IncidentReporterService' },
    },
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log('Published IncidentCreated event:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error publishing IncidentCreated event:', error);
    throw error;
  }
}

async function publishIncidentStatusChanged(incident, previousStatus) {
  const message = {
    incidentId: incident.incident_id,
    previousStatus: previousStatus,
    currentStatus: incident.status,
    incidentType: incident.incident_type,
    severity: incident.severity,
    location: incident.location,
    updatedAt: incident.updated_at,
  };

  const params = {
    TopicArn: process.env.SNS_TOPIC_STATUS_CHANGED,
    Message: JSON.stringify(message),
    MessageAttributes: {
      messageId: { DataType: 'String', StringValue: uuidv4() },
      eventType: { DataType: 'String', StringValue: 'IncidentStatusChanged' },
      version: { DataType: 'String', StringValue: 'v1' },
      timestamp: { DataType: 'String', StringValue: new Date().toISOString() },
      source: { DataType: 'String', StringValue: 'IncidentReporterService' },
    },
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log('Published IncidentStatusChanged event:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error publishing IncidentStatusChanged event:', error);
    throw error;
  }
}

module.exports = {
  publishIncidentCreated,
  publishIncidentStatusChanged,
};
