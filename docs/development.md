# Development setup

When loading the extension temporarily through `about:debugging`, Firefox Manifest V3 treats `host_permissions` as optional. Grant the permissions manually:

1. Open `about:addons`.
2. Find **Cardmarket Helper**.
3. Open the extension's details.
4. Open the **Permissions** tab.
5. Enable the listed permissions for Scryfall, Cardmarket downloads, and GitHub.

When the extension is signed and distributed through AMO, these permissions are requested during installation.
