export interface ComparisTarget {
  key: string;
  label: string;
  url: string;
}

export function buildComparisOutputFilename(target: ComparisTarget): string {
  return `comparis-${target.key}.json`;
}
