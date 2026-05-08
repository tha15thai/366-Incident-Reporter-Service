const { CloudWatchLogsClient, FilterLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const fs = require("fs");

const client = new CloudWatchLogsClient({ region: "us-east-1" });

// Get logs from last 5 minutes
const startTime = Date.now() - (5 * 60 * 1000);

async function run() {
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: "/aws/lambda/incident-reporter-api-handler",
      startTime: startTime,
      limit: 100
    });
    const response = await client.send(command);
    response.events.forEach(e => {
      // only print error and info lines, skip verbose event dumps
      if (e.message.includes('ERROR') || e.message.includes('createIncident') || e.message.includes('INTERNAL')) {
        console.log(e.message.substring(0, 500));
        console.log('---');
      }
    });
  } catch (err) {
    console.error(err);
  }
}
run();
