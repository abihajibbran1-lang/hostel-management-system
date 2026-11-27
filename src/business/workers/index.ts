import cron from "node-cron";
import { COMPLAINT_AUTO_JOB, COMPLAINT_ELIGIBILITY_JOB, findDueComplaintJobs, runComplaintEscalationJob } from "../modules/complaints/escalation-service.ts";
import { ACTIVITY_REMINDER_JOB, deliverActivityReminder, findDueActivityReminders } from "../modules/schedules/activity-reminder-service.ts";
import { claimWorkerJob, ensureWorkerJobs, processWorkerJob } from "../../data/repositories/worker-job-repository.ts";
import { RESPONSIBILITY_REMINDER_JOB, deliverResponsibilityReminder, findDueResponsibilityReminders } from "../modules/schedules/responsibility-service.ts";
import { RESPONSIBILITY_TIMEOUT_JOB, confirmResponsibilityTimeout, findDueResponsibilityTimeouts } from "../modules/schedules/responsibility-service.ts";

const POLL_EXPRESSION = "*/5 * * * *";

async function pollJobType(
  jobType: string,
  findDue: typeof findDueActivityReminders,
  deliver: typeof deliverActivityReminder,
) {
  try {
    await ensureWorkerJobs(await findDue(new Date()));
    for (;;) {
      const job = await claimWorkerJob(jobType, new Date());
      if (job === null) break;
      if (job) {
        await processWorkerJob(job, (client) => deliver(client, job, new Date()));
      }
    }
  } catch {
    console.error("Worker polling failed. Pending work will be checked again at the next poll.");
  }
}

async function runPollingCycle() {
  await pollJobType(COMPLAINT_AUTO_JOB, (now) => findDueComplaintJobs(now, false),
    (client, job, now) => runComplaintEscalationJob(client, job, now, false));
  await pollJobType(COMPLAINT_ELIGIBILITY_JOB, (now) => findDueComplaintJobs(now, true),
    (client, job, now) => runComplaintEscalationJob(client, job, now, true));
  await pollJobType(ACTIVITY_REMINDER_JOB, findDueActivityReminders, deliverActivityReminder);
  await pollJobType(RESPONSIBILITY_REMINDER_JOB, findDueResponsibilityReminders, deliverResponsibilityReminder);
  await pollJobType(RESPONSIBILITY_TIMEOUT_JOB, findDueResponsibilityTimeouts, confirmResponsibilityTimeout);
}

cron.schedule(POLL_EXPRESSION, runPollingCycle, { noOverlap: true });
console.info(`Worker started. Polling schedule: ${POLL_EXPRESSION}`);
