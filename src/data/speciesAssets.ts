import alepisaurusFeroxUrl from '../../assets/species/alepisaurus-ferox.jpg?url';
import bathysaurusMollisUrl from '../../assets/species/bathysaurus-mollis.jpg?url';
import chiasmodonNigerUrl from '../../assets/species/chiasmodon-niger.jpg?url';
import eurypharynxPelecanoidesUrl from '../../assets/species/eurypharynx-pelecanoides.jpg?url';
import type { SpeciesAssetManifestEntry } from '../game/speciesRules';

/**
 * The only play-scene assets currently approved in assets/manifest.csv.
 * Keep this list synchronized with release_approved rows that have a local file.
 */
export const APPROVED_SPECIES_ASSETS = [
  {
    sourceCatalogId: 'F001',
    acceptedScientificName: 'Eurypharynx pelecanoides',
    assetId: 'commons-f001',
    localPath: 'assets/species/eurypharynx-pelecanoides.jpg',
    usageStatus: 'release_approved',
    textureKey: 'species-f001',
    url: eurypharynxPelecanoidesUrl,
  },
  {
    sourceCatalogId: 'F007',
    acceptedScientificName: 'Chiasmodon niger',
    assetId: 'commons-f007',
    localPath: 'assets/species/chiasmodon-niger.jpg',
    usageStatus: 'release_approved',
    textureKey: 'species-f007',
    url: chiasmodonNigerUrl,
  },
  {
    sourceCatalogId: 'F008',
    acceptedScientificName: 'Alepisaurus ferox',
    assetId: 'commons-f008',
    localPath: 'assets/species/alepisaurus-ferox.jpg',
    usageStatus: 'release_approved',
    textureKey: 'species-f008',
    url: alepisaurusFeroxUrl,
  },
  {
    sourceCatalogId: 'F010',
    acceptedScientificName: 'Bathysaurus mollis',
    assetId: 'commons-f010',
    localPath: 'assets/species/bathysaurus-mollis.jpg',
    usageStatus: 'release_approved',
    textureKey: 'species-f010',
    url: bathysaurusMollisUrl,
  },
] as const satisfies readonly SpeciesAssetManifestEntry[];
