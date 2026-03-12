# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Calendar Versioning](https://calver.org/) (YYYY.MM.FEATURE.PATCH).

## [2026.3.3.1] - 2026-03-12

### Changed
- Replace htmlpreview URLs with GitHub Pages URL for manabox-viewer

## [2026.3.3.0] - 2026-03-08

### Added
- Centralized caching with request deduplication and rate limiting
- Support for non-singles and accessories for price comparison on Offers pages
- Support for Riftbound for price comparison

### Changed
- Price comparison with LOW prices. Now it is green if the price is the same or lower than the offer, orange if it is at most 10% more expensive, and red if it is even more expensive

### Fixed
- The layout of the table on Offers pages
  - To achieve this comments about an article are always shrunken down to the hoverable speech bubble icon

## [2026.3.2.1] - 2026-03-06

### Changed
- Only changes to deployment workflow

## [2026.3.2.0] - 2026-03-06

### Added
- ManaBox Viewer preload for Sales/Paid articles
- Sales/Paid articles export now works even when the CSV export is missing

### Fixed
- ManaBox Viewer button placement on sales orders (now below Export Articles)

## [2026.3.1.1] - 2026-03-03

### Changed
- Upgraded to Firefox Manifest v3 for improved security and performance
- Enhanced error handling to prevent silent failures and provide better stability

### Fixed
- Compatibility with Cardmarket's new filter layout on Offers pages
- Configuration initialization race condition that could cause errors on page load

### Security
- Removed potentially unsafe innerHTML usage throughout the extension

## [2026.3.1.0] - 2026-03-01

### Added
- Toggle if sell price should be filled automatically by add-on
- Fill out quantity, language, condition and foil automatically depending on filter parameters
- You can use my new [Manabox Viewer](https://suppennudel.github.io/manabox-viewer/) to view your Manabox collection (exported through CSV) on your PC. It will offer links to Cardmarket where the filter parameters will be applied according to your cards' metrics (quantity, language, condition, foil)

### Fixed
- "loading collection..." no longer showing, when "Collection not loaded."


## [2026.2.1.0] - 2026-02-19

### Changed
- **Version scheme changed to Calendar Versioning (CalVer):** `YYYY.MM.FEATURE.PATCH`
  - `2026` = Year
  - `2` = Month
  - `1` = Feature release number within that month
  - `0` = Patch number (bug fixes)
- Uploaded CSV file's modification datetime is now saved and displayed

### Added
- Improved error handling for CSV file uploads

### Fixed
- Removed the unwanted `filename.csv: undefined` alert when uploading ManaBox CSV files

## [1.14.1] - 2026-02-19

### Added
- Language and Min Condition URL parameters to "go to" link in collection table

### Fixed
- Detection if Products/Singles page is showing Foils or not
- Condition badge in table
- Scryfall request causing issues with “go to” link and therefore the collection table not loading

## [1.14.0] - 2026-02-17

ℹ️Please let me know if the highlight or fill feature behaves in an unexpected way

### Added
- Icons for condition and language when putting a card up for sale on Magic/Products/Singles
- Reintroduced “FILL” and highlighting of currently viewing card printing on Singles page
- Introduced icons for “Misprint” and “Altered” for the collection table on the Singles page

### Fixed

- Cascading issue when a card's format legality/play-rate was not successfully loaded
- Language independent way for finding the current user’s name

### Changed

- Reordered collection table columns on Singles page
- Changed “Listed” back to “Misprint”, which is the actual metric of this value

## [1.13.2] - 2026-02-17

### Fixed

- When checking prices of rivals, your own username is now used to ignore your own offers instead of the developer's one

## [1.13.1] - 2026-02-17

### Changed

- Caching format play rate data

## [1.13.0] - 2026-02-16

### Changed

- The location where format staple data from mtgtop8 is stored. No longer in Notion database but on GitHub

### Fixed

- The fix with the country flag sprite Positions from 1.12.1

## [1.12.2] - 2026-02-16

### Fixed

- An issue with cards having " in their name. Cardmarket's product catalog JSON has them listed with double "”

## [1.12.1] - 2026-02-03

### Added

- An alert when uploading a ManaBox CSV file that states that <filename>:undefined is a known and unwanted alert and I don’t know how to remove that, but doesn’t disrupt functionality
- A toggle to enable/disable or rather show/hide the collection table on the Singles page

### Changed

- Renamed Extension to avoid conflict with Cardmarket’s own new AI assistant

### Fixed

- Format Filter toggle state on Offers page is remembered between page loads
- Formatting of format and collection information on Offers page
- Country Flag Sprite Positions

## [1.11.1] - 2025-09-16

### Fixed

- A bug where cards in your Lists would be considered part of your collection if you owned any printing of it

### Removed

- Permission for [mtgtop8.com](http://mtgtop8.com) from the manifest (it is not used anymore)

## [1.11.0] - 2025-09-01

### Added

- Export Articles from Sale (currently only functioning for paid orders)
    - Behaves the same as the Export Articles  from Purchase
    - Supported Columns: idProduct; groupCount; price; idLanguage; condition; isFoil
    - Can be used to import into ManaBox List → move cards to deck → build the deck to pull the cards from collection

## [1.10.3] - 2025-04-30

### Fixed

- Card thumbnails not being resolved correctly

## [1.10.2] - 2025-03-11

### Fixed

- A bug when there is no play rate for a card
- With cards with strange characters in their names

## [1.10.1] - 2025-03-11

### Fixed

- A bug where cards would be filtered before all format infos have been gathered

## [1.10.0] - 2025-03-11

### Added

- Filter on Singles Offers page for format legality and card play rate
    - the play rate filter lets cards through if its play rate of either main board or side board is above the threshold
    - the play rate filter is not used if it is not filled out
    - the format legality filter is not used if no slider is active

![Format Filter.png](doc/1.10.0_Format%20Filter.png)

## [1.9.6] - 2025-03-10

### Fixed

- On paginated sites the arrow keys would go to another page regardless of any state. Now it won’t switch pages if anything is in focus, e.g. if you are within a text input
- Accidentally removed collection info, added back in
- A mistake when fetching the database for play rate info

## [1.9.5] - 2025-03-07

### Fixed

- Bug in manifest.json

## [1.9.4] - 2025-03-03

### Changed

- Internal structural changes in play rate database and link to homepage

## [1.9.3] - 2025-02-05

### SKIPPED

## [1.9.2] - 2025-02-05

### Changed

- In collection info instead of language name the flag icon is shown

## [1.9.1] - 2025-02-05

### SKIPPED

## [1.9.0] - 2025-02-05

### Changed

- Card Staple Info is now gathered from [mtgtop8.com/topcards](mtgtop8.com/topcards) and for easier reading written into a Notion database [mtgtop8/topcards](https://www.notion.so/mtgtop8-topcards-179f020626c280678e16e9569f37d8ea?pvs=21) from where the data for the add-on is taken
- the staple info shows percentage of decks that use the card and in brackets the average quantity of the card in the decks that use those cards. In front of the slash is the main board data, behind the side board data

### Removed

- not showing specific format info in the config is temporarily removed. Will be added back, once I’ve refurbished the how the config works.
- the same applies to hiding cards for specific formats
- also temporarily removed edhrec score

## [1.8.1] - 2024-10-25

### Changed

- Added seller name to export articles from shipment csv file

## [1.8.0] - 2024-10-25

### Added

- An export button on a single purchase page that takes the total cost (incl. fees and shipping) and “smears” it over the purchased article prices at the ratio how much an article costed

## [1.7.1] - 2024-10-24

### Added

- all languages to the collection ownership check on the Offers/Singles page of a seller

### Fixed

- checking for collection ownership (especially the specific printing check didn’t work anymore)

## [1.7.0] - 2024-10-23

### Added

- Framework for bigger/separate config page
- On Product Singles page: showing rivals by adding a 🤺 in front of their name
    - currently determined by
        - min sales = 300
        - min available items = 200
        - max 10 rivals
    - planned to be configurable on the config page
- The number of decks that are looked at for a given format
    
    ![Playrate Numbers.png](doc/1.7.0_Playrate%20Numbers.png)
    

### Changed

- On Product Singles page: Calculated sell price only takes rival sellers into account (and trend price)
- Improved requests to Scryfall and mtgtop8, should feel smoother now on seller's singles page
- Icons for banned and not legal and added text
    
    ![Legality Icons.png](doc/1.7.0_Legality%20Icons.png)
    

### Fixed

- Cardnames with diacritics (á à â ä etc) on mtgtop8 requests
- Actually requesting mtgtop8 for the last 6 months instead of a fixed date

## [1.6.4] - 2024-10-19

### Fixed

- A bug not filling sell form correctly
- A bug where nothing gets done when there are no rival sellers

## [1.6.3] - 2024-10-19

### Changed
- This version was skipped due to an issue

## [1.6.2] - 2024-10-19

### Added

- An alert notification that looks like one from Cardmarket when a newer version of this add-on has been loaded since the last time you have dismissed the notification

![Version Notification.png](doc/1.6.2_Version%20Notification.png)

### Fixed

- A bug when checking the ManaBox collection for a double-faced-transform card from Cardmarket. It would say you don’t own any even if you do.

## [1.6.1] - 2024-10-07

### Fixed

- Removed "mark as packed" from purchases, exists only on sales now - which actually makes more sense

## [1.6.0] - 2024-10-07

### Added

- Ability to copy wants-list to clipboard

### Changed

- Made wants-list export buttons prettier

## [1.5.3] - 2024-10-07

### Fixed

- Coloring compared prices didn’t work properly on offers from sellers where only with tracking is possible

## [1.5.2] - 2024-09-02

### Changed

- Improved Go To and Fill on Product Singles page

### Fixed

- Location of a card in your ManaBox collection didn’t work on order page
- Thumbnail preview didn’t work on orders page