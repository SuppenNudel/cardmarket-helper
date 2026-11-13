# Cardmarket Helper

https://addons.mozilla.org/en/firefox/addon/cardmarket-helper/

This Firefox-Addon is supposed to help in your everyday life with cardmarket.com

## Disclaimer

This add-on is not affiliated with, endorsed by, or in any way officially connected to Cardmarket. It is an independent, unofficial tool created to enhance the user experience on cardmarket.com

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

**You are free to:**
- Share, copy, and redistribute the material in any medium or format
- Remix, transform, and build upon the material

**Under these terms:**
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes

For more information, see the [LICENSE](LICENSE) file or visit [https://creativecommons.org/licenses/by-nc/4.0/](https://creativecommons.org/licenses/by-nc/4.0/)

## [Release Notes / Changelog](CHANGELOG.md)

## Bug Reports / Feature Requests / Feedback

If you have any of those please feel free to submit them at https://github.com/SuppenNudel/cardmarket-helper/issues/new

## Development Setup

When loading this extension temporarily via `about:debugging`, Firefox MV3 treats `host_permissions` as optional. You must manually grant them:

1. Go to `about:addons`
2. Find "Cardmarket Helper"
3. Click on the extension name
4. Go to "Permissions" tab
5. Enable all listed permissions (Scryfall, Cardmarket downloads, GitHub)

**Note:** When the extension is signed and distributed through AMO, these permissions will be required at install time automatically.

## ManaBox Viewer target (for Orders export)

The **Open in ManaBox Viewer** button uses `config.manaboxViewerMode` from `browser.storage.local`:

- `local` (default): opens `http://localhost:8000/index.html`
- `hosted`: opens `https://suppennudel.github.io/manabox-viewer/`

## Inspirations

Some features of this add-on were inspired by existing add-ons. They are credited here:

### [Better Cardmarket MTG unofficial](https://chromewebstore.google.com/detail/better-cardmarket-mtg-uno/fplghokcfgbdedalpmbmjlafpagclbef)
- [IMPLEMENTED] Replace camera icons with preview images

### [Carmarket Format Filter](https://chromewebstore.google.com/detail/cardmarket-format-filter/okfobifncpmjgnccfacmfkdnkhjbiglp)
- [Source Code](https://github.com/Aeolic/cardmarket-filter)
- [IMPLEMENTED] Format filtering support

### [Cardmarket Companion](https://chromewebstore.google.com/detail/cardmarket-companion/mpbncolfefkegmaccdejhngjcjkjoaep)
- [IMPLEMENTED] Offer parsing and price autofill

## Current Features

### Thumbnail previews

Instead of the camera icon, Cardmarket Helper replaces card thumbnails with the actual card image. This works across the site wherever Cardmarket shows a product thumbnail and can be toggled and resized in the extension settings.

### ManaBox collection import

Import a ManaBox CSV and let the add-on load it into the current Cardmarket page automatically. This is especially useful on Singles pages, where the extension can compare your collection against the card you are currently viewing.

You can export your collection from ManaBox via the top-right menu → Export and then save the CSV wherever you prefer. The add-on also supports opening the exported data in the ManaBox Viewer.

### Singles page helpers

When you have imported your collection, the extension adds a table of your owned printings for the card you are currently viewing on the Singles page.

It also supports:
- Auto-filling quantity, language, condition, foil, and price fields
- Comparing against LOW, AVG1, AVG7, AVG30, TREND, and rival offers
- Highlighting the best price and the most relevant printing
- Showing whether the card is already listed in your collection data
- Adding condition and language indicators for faster listing decisions

### Offers and price comparison

The add-on enriches offer rows with price information and comparison metrics, including:
- LOW price
- AVG price
- TREND price
- Cheapest printing link for matching products
- Color-coded comparison against the current seller price
- Optional format legality filtering for Magic offers

### Wants lists and Shopping Wizard

The extension improves wants lists and Shopping Wizard results by showing market statistics directly in the results, including cheapest-printing comparisons and direct links to the best available printing.

It also supports exporting the current wants list as CSV.

Note: Cardmarket's page layouts change frequently, so the screenshots in older release notes may not match the current interface exactly. The feature list above reflects the current extension behavior and is intentionally kept up to date with the implemented functionality.

### Order tracking and packed-state reminders

On sales orders, the extension can mark an order as packed and remember the state so it remains visible later. The packed status is turned into a timeline indicator and can be cleared when the shipment is confirmed.

### Google Drive sync

Cardmarket Helper can optionally sync the following data through Google Drive app data:
- Extension settings
- Marked-as-packed order state
- Imported ManaBox collection data
- Sync metadata for multi-device use

This is optional and can be enabled from the extension settings. The privacy policy and terms are in the [google](google) folder.

### Settings and customization

The settings page lets you configure:
- Thumbnail enable/disable and size
- Magic format filters used for legality checks
- Price autofill source and undercut strategy
- Rival definition thresholds
- Which seller types should be considered during price calculation
- Google Drive connection status

## Release Notes

See the full change history in [CHANGELOG.md](CHANGELOG.md).

## Historical notes

The project still contains some older notes and ideas that are not part of the current user-facing workflow. Those are kept mainly for historical context and are not required for normal use.

## Findings

### [Cardmarket Companion](https://chromewebstore.google.com/detail/cardmarket-companion/mpbncolfefkegmaccdejhngjcjkjoaep)
- Add-on with similar features
