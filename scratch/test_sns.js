const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { v4: uuidv4 } = require("uuid");

const snsClient = new SNSClient({ region: "us-east-1" });

async function testSNS() {
  const params = {
    TopicArn: "arn:aws:sns:us-east-1:121953018955:incident-reporter-incident-status-changed",
    Message: JSON.stringify({
      incidentId: "TEST_999",
      previousStatus: "REPORTED",
      currentStatus: "VERIFIED",
      severity: "HIGH",
      location: { type: "Point", coordinates: [100.5, 13.7] },
      updatedAt: new Date().toISOString()
    }),
    MessageAttributes: {
      messageId: { DataType: "String", StringValue: uuidv4() },
      eventType: { DataType: "String", StringValue: "IncidentStatusChanged" },
      version: { DataType: "String", StringValue: "v1" },
      timestamp: { DataType: "String", StringValue: new Date().toISOString() },
      source: { DataType: "String", StringValue: "IncidentReporterService" },
    },
  };

  try {
    const result = await snsClient.send(new PublishCommand(params));
    console.log("✅ Successfully sent SNS message! Message ID:", result.MessageId);
  } catch (error) {
    console.error("❌ Failed to send SNS:", error);
  }
}

testSNS();
