# Usability & Compliance Annex

## 1. Usability Testing Script (v1.0)
**Objective**: Verify if users can distinguish between critical financial alerts and general product info, and ensure the toggle logic is intuitive.

### Scenario:
"You are managing a payment stream to a vendor. You want to make sure you are notified if the payment fails on the network, but you don't want to receive any marketing or new feature emails."

### Task List:
1.  Navigate to the 'Notifications' section.
2.  Identify the toggle for network failures.
3.  Identify the toggle for new features.
4.  Switch off the features notifications while keeping the failure alerts active.
5.  Confirm the save state.

### Key Metrics:
- **Success Rate**: Did the user correctly identify 'Settlement Failed' as the critical toggle?
- **Time on Task**: How long did it take to find the 'Money Movement' group?
- **Clarity**: On a scale of 1-5, how clear was the distinction between in-app and email channels?

---

## 2. Legal & Compliance Checklist
Since StreamPay involves financial movement on Stellar, the following must be reviewed by the Legal/Compliance team before production:

- [ ] **Critical Email Language**: Ensure the 'Settlement Failed' copy does not imply finality or financial advice.
- [ ] **Default Opt-ins**: Confirm that "On by Default" for financial alerts is compliant with regional electronic communication privacy laws (e.g., GDPR/CAN-SPAM exemptions for transactional emails).
- [ ] **PII Masking**: Verify that Stellar addresses are correctly truncated/masked in all notification payloads.
- [ ] **Unsubscribe Flow**: Ensure a single-click unsubscribe is present in all non-critical (Product Info) emails.

---
*Status: Ready for Legal Review*
