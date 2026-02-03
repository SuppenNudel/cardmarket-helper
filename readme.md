# Cardmarket Helper

https://addons.mozilla.org/en/firefox/addon/cardmarket-assistant/

This Firefox-Addon is supposed to help in your everyday life with cardmarket.com

## Disclaimer

This add-on is not affiliated with, endorsed by, or in any way officially connected to Cardmarket. It is an independent, unofficial tool created to enhance the user experience on cardmarket.com

## Homepage

For feature requests, bug reports or general feedback use the form at
https://nudelforce.notion.site/e9ed9bd81c684952ade7985944f87f17

You can also find the Release Notes and Roadmap there.

# Ideas
## From [Better Cardmarket MTG unofficial](https://chrome-stats.com/d/fplghokcfgbdedalpmbmjlafpagclbef)
- [IMPLEMENTED] Kleine preview Bilder statt Kamera-Icon
## From [Carmarket Format Filter](https://chromewebstore.google.com/detail/cardmarket-format-filter/okfobifncpmjgnccfacmfkdnkhjbiglp)
- [Source Code](https://github.com/Aeolic/cardmarket-filter)
- Format Filter
## From [Cardmarket Companion](https://chromewebstore.google.com/detail/cardmarket-companion/mpbncolfefkegmaccdejhngjcjkjoaep)
- [IMPLEMENTED] Angebote auslesen und Preisfeld ausfüllen

# Eigne Ideen
- [IMPLEMENTED] Eigentlicher Preis der Karte neben Angebotspreis darstellen
    - [IMPLEMENTED] Angebotspreis einfärben, ob gut oder schlecht

-  [IMPLEMENTED] on sell page, show owned card that match the printing and make them selectable
    - [IMPLEMENTED] when selecting fill out details
  
# Improvements
- make a request to outside if a cardmarket id wasn't found on scryfall (to automate)

- offers-singles
    - when determining ownership of same card different printing, use oracle_id of scryfall instead of cardname
    - Staple Stempel
        - Commander: edhrec
        - Pioneer: Eigenanalyse von mtgtop8 oder thegathering.gg

- sell
    - redirect currently disabled

# Bugs
- when putting something in the shopping cart, the camera icon reappears

# Figure out
- some cards on mkm have the same id but there are multiple entries in scryfall
    - Example Coastal Tower 8ED -> normal / foil

    - check if there is a foil version of the card in the same set with the same collector number

- some cards have the same id on scryfall but multiple on mkm
    - Example Mystical Archive Abundant Harvest - normal / foil and etched
