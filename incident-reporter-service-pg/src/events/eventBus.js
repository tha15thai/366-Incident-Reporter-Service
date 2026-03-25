const EventEmitter = require('events');

class IncidentEventBus extends EventEmitter {
  constructor() {
    super();
    this.eventLog = [];
    
    // Log ทุก event ที่ถูก emit
    this.on('newListener', (event) => {
      console.log(`📡 New listener registered for: ${event}`);
    });
  }

  // Publish event: IncidentReported
  publishIncidentReported(incident) {
    const event = {
      messageId: this.generateMessageId(),
      eventType: 'IncidentReported',
      version: 'v1',
      timestamp: new Date().toISOString(),
      source: 'IncidentReporterService',
      payload: {
        incidentId: incident.incident_id,
        incidentType: incident.incident_type,
        severity: incident.severity,
        location: {
          type: 'Point',
          coordinates: [incident.location_lng, incident.location_lat]
        },
        reportedAt: incident.created_at
      }
    };

    this.eventLog.push(event);
    this.emit('IncidentReported', event);
    console.log(`📤 Event Published: IncidentReported (${event.messageId})`);
    
    return event;
  }

  // Publish event: IncidentStatusChanged
  publishIncidentStatusChanged(incidentId, previousStatus, currentStatus, incident) {
    const event = {
      messageId: this.generateMessageId(),
      eventType: 'IncidentStatusChanged',
      version: 'v1',
      timestamp: new Date().toISOString(),
      source: 'IncidentReporterService',
      payload: {
        incidentId: incidentId,
        previousStatus: previousStatus,
        currentStatus: currentStatus,
        incidentType: incident.incident_type,
        severity: incident.severity,
        location: {
          type: 'Point',
          coordinates: [incident.location_lng, incident.location_lat]
        },
        updatedAt: new Date().toISOString()
      }
    };

    this.eventLog.push(event);
    this.emit('IncidentStatusChanged', event);
    console.log(`📤 Event Published: IncidentStatusChanged (${event.messageId})`);
    console.log(`   ${previousStatus} → ${currentStatus}`);
    
    return event;
  }

  // Generate UUID for messageId
  generateMessageId() {
    return require('uuid').v4();
  }

  // ดู event log ทั้งหมด
  getEventLog() {
    return this.eventLog;
  }

  // Clear event log
  clearEventLog() {
    this.eventLog = [];
  }
}

// Singleton instance
const eventBus = new IncidentEventBus();

// Mock consumers (สำหรับ demo)
eventBus.on('IncidentReported', (event) => {
  console.log(`📥 [Consumer] Evacuation Service received: ${event.payload.incidentId}`);
});

eventBus.on('IncidentStatusChanged', (event) => {
  console.log(`📥 [Consumer] Resource Allocation received: ${event.payload.incidentId} status changed to ${event.payload.currentStatus}`);
});

module.exports = eventBus;
