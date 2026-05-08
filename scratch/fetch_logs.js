const { CloudWatchLogsClient, FilterLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const fs = require("fs");

const client = new CloudWatchLogsClient({ region: "us-east-1" });

async function run() {
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: "/aws/lambda/incident-reporter-event-handler",
      limit: 100
    });
    const response = await client.send(command);
    fs.writeFileSync("logs.json", JSON.stringify(response.events, null, 2));
    console.log("Logs saved to logs.json");
  } catch (err) {
    console.error(err);
  }
}
run();
