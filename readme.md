# Cardmarket Helper

https://addons.mozilla.org/en/firefox/addon/cardmarket-helper/

This Firefox-Addon is supposed to help in your everyday life with cardmarket.com

## Disclaimer

This add-on is not affiliated with, endorsed by, or in any way officially connected to Cardmarket. It is an independent, unofficial tool created to enhance the user experience on cardmarket.com

## [Release Notes / Changelog](CHANGELOG.md)

## Bug Reports / Feature Requests / Feedback

If you have any of those please feel free to submit them at https://github.com/SuppenNudel/cardmarket-helper/issues/new

## Inspirations

Some Features of this addon have been inspired by existing addons. So I wanted to credeit them here:

### [Better Cardmarket MTG unofficial](https://chromewebstore.google.com/detail/better-cardmarket-mtg-uno/fplghokcfgbdedalpmbmjlafpagclbef)
- [IMPLEMENTED] Kleine preview Bilder statt Kamera-Icon

### [Carmarket Format Filter](https://chromewebstore.google.com/detail/cardmarket-format-filter/okfobifncpmjgnccfacmfkdnkhjbiglp)
- [Source Code](https://github.com/Aeolic/cardmarket-filter)
- [IMPLEMENTED] Format Filter

### [Cardmarket Companion](https://chromewebstore.google.com/detail/cardmarket-companion/mpbncolfefkegmaccdejhngjcjkjoaep)
- [IMPLEMENTED] Angebote auslesen und Preisfeld ausfüllen

## Findings

### [Cardmarket Companion](https://chromewebstore.google.com/detail/cardmarket-companion/mpbncolfefkegmaccdejhngjcjkjoaep)
- Add-on with similar features


## Legacy Idea Documentation
### Improvements
- make a request to outside if a cardmarket id wasn't found on scryfall (to automate)

- offers-singles
    - when determining ownership of same card different printing, use oracle_id of scryfall instead of cardname
    - Staple Stempel
        - Commander: edhrec
        - Pioneer: Eigenanalyse von mtgtop8 oder thegathering.gg

- sell
    - redirect currently disabled

### Bugs
- when putting something in the shopping cart, the camera icon reappears

### Figure out
- some cars on mkm have the same id but there are multiple entries in scryfall
    - Example Coastal Tower 8ED -> normal / foil

    - check if there is a foil version of the card in the same set with the same collector number

- some cards have the same id on scryfall but multiple on mkm
    - Example Mystical Archive Abundant Harvest - normal / foil and etched
