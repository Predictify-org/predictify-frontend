import { ReconciliationService } from './reconciliation/reconcile';
import { ReconciliationReport } from './reconciliation/types';

async function run() {
  console.log("Starting Nightly Reconciliation Job...");
  
  const service = new ReconciliationService({
    tolerance: BigInt(process.env.RECONCILE_TOLERANCE || '0')
  });

  try {
    const report = await service.runReconciliation();
    
    console.log("Reconciliation Finished.");
    console.log(`Total Checked: ${report.totalStreamsChecked}`);
    console.log(`Mismatches: ${report.mismatches.length}`);
    console.log(`Errors: ${report.errors.length}`);
    console.log(`Status: ${report.status}`);

    if (report.status !== 'SUCCESS') {
      await sendAlert(report);
    }

    if (report.status === 'FAILED') {
      process.exit(1);
    }
  } catch (err) {
    console.error("Critical error during reconciliation:", err);
    process.exit(1);
  }
}

async function sendAlert(report: ReconciliationReport) {
  // Mock alerting (Slack/PagerDuty)
  console.log("-----------------------------------------");
  console.log("[ALERT] Reconciliation Mismatch Detected!");
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Mismatches: ${report.mismatches.length}`);
  
  report.mismatches.forEach(m => {
    console.log(`- Stream ${m.streamId}: Field ${m.field} (DB: ${m.dbValue} vs Chain: ${m.onChainValue})`);
  });

  if (report.errors.length > 0) {
    console.log(`Errors: ${report.errors.length}`);
    report.errors.forEach(e => {
      console.log(`- Stream ${e.streamId}: ${e.error}`);
    });
  }
  console.log("-----------------------------------------");
}

run();
