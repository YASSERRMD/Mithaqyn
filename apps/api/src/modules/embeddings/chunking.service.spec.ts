import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  const svc = new ChunkingService();

  it('returns empty array for empty input', () => {
    expect(svc.chunk('')).toEqual([]);
    expect(svc.chunk('   ')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const result = svc.chunk('Short text. No need to split.');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].index).toBe(0);
    expect(result[0].text).toContain('Short text');
  });

  it('splits long text into multiple chunks', () => {
    const longText = Array(200).fill('This is a sentence with some words.').join(' ');
    const chunks = svc.chunk(longText, 128);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it('provides token estimates', () => {
    const chunks = svc.chunk('Hello world. This is a test.', 512);
    expect(chunks[0].tokenEstimate).toBeGreaterThan(0);
  });
});
