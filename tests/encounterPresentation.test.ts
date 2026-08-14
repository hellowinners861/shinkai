import { describe, expect, it } from 'vitest';

import { getSpeciesEncounterPresentation } from '../src/game/encounterPresentation';

describe('species encounter presentation', () => {
  it('uses persisted discovery knowledge globally across dives', () => {
    const persistedSpecies = new Set(['Known species']);

    expect(
      getSpeciesEncounterPresentation({
        acceptedScientificName: 'Known species',
        displayName: 'Known display name',
        knownSpecies: persistedSpecies,
        discoveredNow: true,
        collectedNow: false,
        scoreDelta: 20,
      }),
    ).toBeUndefined();

    expect(
      getSpeciesEncounterPresentation({
        acceptedScientificName: 'New species',
        displayName: 'New display name',
        knownSpecies: persistedSpecies,
        discoveredNow: true,
        collectedNow: false,
        scoreDelta: 20,
      }),
    ).toEqual({
      kind: 'new',
      message: 'NEW! / New display name',
    });
  });

  it('keeps NEW ahead of acquisition when discovery and collection share a frame', () => {
    const persistedSpecies = new Set<string>();

    expect(
      getSpeciesEncounterPresentation({
        acceptedScientificName: 'New species',
        displayName: 'New display name',
        knownSpecies: persistedSpecies,
        discoveredNow: true,
        collectedNow: true,
        scoreDelta: 25,
      }),
    ).toEqual({
      kind: 'new',
      message: 'NEW! / New display name',
    });

    expect(
      getSpeciesEncounterPresentation({
        acceptedScientificName: 'Known species',
        displayName: 'Known display name',
        knownSpecies: new Set(['Known species']),
        discoveredNow: true,
        collectedNow: true,
        scoreDelta: 25,
      }),
    ).toEqual({
      kind: 'acquired',
      message: 'SPECIES ACQUIRED / +25',
    });
  });
});
