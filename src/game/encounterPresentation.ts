export type SpeciesEncounterPresentationKind = 'new' | 'acquired';

export interface SpeciesEncounterPresentation {
  kind: SpeciesEncounterPresentationKind;
  message: string;
}

export interface SpeciesEncounterPresentationInput {
  acceptedScientificName: string;
  displayName: string;
  knownSpecies: ReadonlySet<string>;
  discoveredNow: boolean;
  collectedNow: boolean;
  scoreDelta: number;
}

/**
 * Chooses the species encounter message using knowledge captured before the
 * current encounter is persisted. A same-frame new discovery wins over the
 * normal acquisition message.
 */
export function getSpeciesEncounterPresentation(
  input: SpeciesEncounterPresentationInput,
): SpeciesEncounterPresentation | undefined {
  const isNewDiscovery = input.discoveredNow &&
    !input.knownSpecies.has(input.acceptedScientificName);

  if (isNewDiscovery) {
    return {
      kind: 'new',
      message: `NEW! / ${input.displayName}`,
    };
  }

  if (input.collectedNow) {
    return {
      kind: 'acquired',
      message: `SPECIES ACQUIRED / +${String(input.scoreDelta)}`,
    };
  }

  return undefined;
}
