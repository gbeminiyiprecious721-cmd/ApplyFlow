# ApplyFlow Autofill & Job Clipper

1. Download the extension ZIP from ApplyFlow → Agent or Settings → Connections.
2. Extract it into a folder on your computer.
3. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
4. Enable Developer mode. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Copy the extension ID. Sign in to ApplyFlow, open Settings → Connections, paste the ID and click **Connect autofill extension**.
6. Open the extension popup and confirm the displayed account.
7. In the extension popup, expand **Confirm first and last names** and save the names you want used.
8. On an employer application page, open the extension and click **Autofill this application**. Review the results, provide missing answers and attach your chosen CV before submitting.

Autofill operates on the active tab only when clicked. It uses exact profile-field matches and exact verified, non-sensitive answer-bank matches. Existing values, passwords, radio buttons, checkboxes, legal declarations, demographic questions and unknown answers are preserved for personal review. It never submits a form. First and last names must be separately confirmed in the answer bank; full names are not split by guessing.

The extension also keeps the existing job-capture workflow. Account tokens remain in private browser-session storage. Reconnect after expiry or restarting the browser. Your profile is fetched directly under your account's database permissions, never sent to another candidate. Open shadow-root controls and same-origin frame controls are detected. Cross-origin frames and custom widgets may require opening the employer form directly or manual completion.

## Updating an existing installation

Extract the new ZIP into the extension folder you previously loaded, replacing its files. Open the browser extensions page and click Reload for ApplyFlow. Reconnect from ApplyFlow Settings if prompted. The website cannot update an unpacked extension automatically. Version 1.1.1 removes the CAPTCHA-asset blocking bug and adds common camelCase field names.

For the cloud application agent, open ApplyFlow → Agent → Autofill & Auto-apply. Save your preferences, review a prepared packet and queue it. Automatic submission requires enabled Auto-apply rules and explicit packet approval. Pause cancels queued work; started runs may finish. Confirmation is required before a submission is recorded.
