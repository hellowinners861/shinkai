import { describe, expect, it } from 'vitest';

import {
  countCollectedSpecies,
  createEmptyDiscoveryProgress,
  mergeDiscoveryProgress,
  parseDiscoveryProgress,
  recordSpeciesCollection,
  recordSpeciesDiscovery,
} from '../src/catalog/discoveryStore';

describe('discoveryStore pure operations', () => {
  it('creates independent empty progress values', () => {
    const first = createEmptyDiscoveryProgress();
    const second = createEmptyDiscoveryProgress();

    const changed = recordSpeciesDiscovery(first, 'Example species');

    expect(changed.discoveredSpecies.has('Example species')).toBe(true);
    expect(first.discoveredSpecies).not.toBe(second.discoveredSpecies);
    expect(first.collectedSpecies).not.toBe(second.collectedSpecies);
    expect(second.discoveredSpecies.size).toBe(0);
    expect(second.collectedSpecies).toEqual({});
  });

  it('normalizes persisted values and promotes collected species to discovered', () => {
    const progress = parseDiscoveryProgress(JSON.stringify({
      version: 1,
      discoveredSpecies: ['  Alpha   beta ', 'Alpha beta', 42],
      collectedSpecies: {
        ' Gamma   delta ': 2.9,
        'Invalid count': 0,
        'Not a number': '3',
      },
    }));

    expect([...progress.discoveredSpecies]).toEqual([
      'Alpha beta',
      'Gamma delta',
    ]);
    expect(progress.collectedSpecies).toEqual({
      'Gamma delta': 2,
    });
  });

  it('merges a session without mutating persisted progress', () => {
    const persisted = parseDiscoveryProgress(JSON.stringify({
      version: 1,
      discoveredSpecies: ['Persisted species'],
      collectedSpecies: { 'Collected species': 2 },
    }));
    const merged = mergeDiscoveryProgress(
      persisted,
      ['  New species  ', 'Persisted species'],
      {
        'Collected species': 1,
        'New species': 2,
        'Ignored species': -1,
      },
    );

    expect([...persisted.discoveredSpecies]).toEqual([
      'Persisted species',
      'Collected species',
    ]);
    expect(merged.collectedSpecies).toEqual({
      'Collected species': 3,
      'New species': 2,
    });
    expect(merged.discoveredSpecies.has('New species')).toBe(true);
    expect(merged.discoveredSpecies.has('Ignored species')).toBe(false);
  });

  it('records discoveries and acquisitions immutably', () => {
    const empty = createEmptyDiscoveryProgress();
    const discovered = recordSpeciesDiscovery(empty, '  Bathysaurus   mollis ');
    const collected = recordSpeciesCollection(
      discovered,
      'Bathysaurus mollis',
      2,
    );

    expect(empty.discoveredSpecies.size).toBe(0);
    expect(discovered.collectedSpecies).toEqual({});
    expect(collected.discoveredSpecies.has('Bathysaurus mollis')).toBe(true);
    expect(collected.collectedSpecies).toEqual({
      'Bathysaurus mollis': 2,
    });
    expect(countCollectedSpecies(collected)).toBe(2);
  });

  it('ignores malformed roots and unsupported versions', () => {
    expect(parseDiscoveryProgress('not json').discoveredSpecies.size).toBe(0);
    expect(
      parseDiscoveryProgress(JSON.stringify({ version: 2 })).collectedSpecies,
    ).toEqual({});
    expect(parseDiscoveryProgress(JSON.stringify([]))).toEqual(
      createEmptyDiscoveryProgress(),
    );
  });
});
