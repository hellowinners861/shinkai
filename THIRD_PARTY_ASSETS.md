# Third-party species assets

Task 2 currently contains four release-approved local species images. The other 96 targets in `assets/manifest.csv` are `reference_only`, have no local path or asset ID, and must not be loaded by later game integration.

All approved files were obtained through the Wikimedia Commons API after checking the API license metadata and the linked Commons file-description page. The acquisition script stores a 384px mobile derivative locally; the original file URL remains in the manifest. No external image is hotlinked.

| Taxon | Local file | Source page | Creator | License |
| --- | --- | --- | --- | --- |
| *Eurypharynx pelecanoides* | `assets/species/eurypharynx-pelecanoides.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Eurypharynx_pelecanoides.jpg) | Unknown author | Public domain |
| *Chiasmodon niger* | `assets/species/chiasmodon-niger.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chiasmodon_niger.jpg) | Unknown author | Public domain |
| *Alepisaurus ferox* | `assets/species/alepisaurus-ferox.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Alepisaurus_ferox9180.jpg) | NOAA's Fisheries Collection | Public domain |
| *Bathysaurus mollis* | `assets/species/bathysaurus-mollis.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bathysaurus_mollis.jpg) | NOAA/MBARI | Public domain |

The machine-readable source page, original URL, title, creator, license URL, attribution text, modifications, usage permissions, review date, and SHA-256 are authoritative in `assets/manifest.csv`. Run `npm run prepare:assets` to revalidate and reacquire the allowlisted files, then `npm run check:assets` before release. Extending coverage requires adding a reviewed file title to `APPROVED_FILES`; unreviewed search results must remain `reference_only`.
