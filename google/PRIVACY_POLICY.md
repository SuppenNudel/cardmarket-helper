# Privacy Policy

**Last Updated:** September 18, 2026

This Privacy Policy explains how **Cardmarket Helper** ("we", "our", or the "Extension") handles information when you use the Extension, including its optional Google Drive synchronization feature.

## 1. Data Handled by the Extension

Cardmarket Helper processes data needed to provide its features, including:

- Extension settings, such as thumbnail and price-autofill preferences.
- Cardmarket sales order IDs and timestamps for orders marked as packed.
- Collection data imported by the user from a ManaBox CSV file, including the imported file name and modification time.
- Data retrieved from Cardmarket pages and supported third-party APIs to provide the Extension's requested functionality.

The Extension does not request access to your Google email address, name, profile picture, contacts, calendar, or general Google Drive files.

## 2. Google Drive Access

Google Drive synchronization is optional and starts only after you select **Connect** and authorize access through Google OAuth.

The Extension requests only this Google Drive scope:

`https://www.googleapis.com/auth/drive.appdata`

This scope allows Cardmarket Helper to create, read, update, and delete its own hidden application-data files in your Google Drive `appDataFolder`. It does not allow the Extension to view or modify your regular Google Drive files.

The hidden files contain:

- Extension settings.
- Packed order IDs, packed timestamps, and deletion timestamps used to synchronize unpacked or shipped orders.
- The collection data you imported into Cardmarket Helper.

This data is used only to synchronize Cardmarket Helper between your devices.

## 3. OAuth Authentication Service

Cardmarket Helper uses a Cloudflare Worker operated for this project to complete Google OAuth securely without distributing the Google OAuth client secret in the Extension.

During connection:

- The service receives the temporary authorization code returned by Google.
- It exchanges that code for an access token and refresh token.
- The tokens are held in a temporary Cloudflare KV entry for up to 10 minutes, or deleted earlier after the Extension retrieves them.

During token renewal, the Extension sends its Google refresh token to the service, which exchanges it with Google for a new access token. The service does not intentionally retain the refresh token after completing that request.

OAuth access and refresh tokens are stored locally in Firefox extension storage on each connected device. They are not placed in Google Drive sync files.

## 4. Local Storage and Retention

Settings, packed state, imported collection data, synchronization metadata, and OAuth tokens are stored locally by Firefox. Local data can remain after the browser is closed and is removed when you clear the Extension's data or uninstall the Extension.

Selecting **Disconnect** removes the locally stored OAuth tokens from that device. It does not automatically delete Cardmarket Helper's hidden files from Google Drive or revoke access in your Google Account.

Packed-state records are removed when an order is marked as shipped and may also be pruned after 90 days. Hidden Google Drive files otherwise remain until overwritten or deleted by the user or the Extension.

## 5. Sharing and Service Providers

We do not sell your information, use it for advertising, or use it to train artificial intelligence or machine-learning models.

Information is transmitted only as needed to provide Extension functionality:

- **Google** provides OAuth authentication and Google Drive storage.
- **Cloudflare** hosts the OAuth broker and temporary OAuth session storage.
- Other APIs named in the Extension's permissions may receive requests required for their respective Cardmarket Helper features.

These providers process information under their own terms and privacy policies.

## 6. Security

Data is transmitted over HTTPS. OAuth sessions use random, short-lived state values, and completed session records are deleted after retrieval. No method of electronic storage or transmission can be guaranteed to be completely secure.

## 7. User Choices

Google Drive synchronization is optional. Without connecting Google Drive, Cardmarket Helper continues to store its data locally on each device.

You may:

- Disconnect Google Drive from the Extension settings.
- Revoke Cardmarket Helper's access from your Google Account security settings.
- Clear the Extension's local storage or uninstall the Extension.
- Manage or delete application data through Google where supported.

## 8. Google API Services User Data Policy

Cardmarket Helper's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## 9. Changes to This Policy

We may update this Privacy Policy when the Extension's functionality or data practices change. Updates will be published in this repository with a revised date.

## 10. Contact

For privacy questions or requests:

- **Email:** rohm.cedric@gmail.com
- **GitHub:** https://github.com/SuppenNudel/cardmarket-helper
