const MIN_INDEXABLE_TEXT_LENGTH = 160;

export function richDocumentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(richDocumentText).join(' ');
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const ownText = typeof record.text === 'string' ? record.text : '';
  return `${ownText} ${richDocumentText(record.content)}`.replace(/\s+/g, ' ').trim();
}

export function isSubstantivePublicContent(value: unknown, minimum = MIN_INDEXABLE_TEXT_LENGTH): boolean {
  return richDocumentText(value).replace(/\s+/g, ' ').trim().length >= minimum;
}
