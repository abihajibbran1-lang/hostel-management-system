import cron from "node-cron";

const POLL_EXPRESSION = "*/5 * * * *";

function runFoundationPollingCycle() {
  // S00 deliberately has no domain jobs. Future slices register jobs that call
  // their owning module services; this worker must not write domain tables.
  console.info("Worker polling cycle started; no domain jobs are registered.");
}

cron.schedule(POLL_EXPRESSION, runFoundationPollingCycle);
console.info(`Worker started. Polling schedule: ${POLL_EXPRESSION}`);
