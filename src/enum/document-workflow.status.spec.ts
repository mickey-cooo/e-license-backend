import {
  canTransition,
  DocumentWorkflowStatus as S,
} from './document-workflow.status';

describe('document status transitions', () => {
  it.each([
    [S.SUBMITTED, S.FORWARDED_TO_ADMIN],
    [S.FORWARDED_TO_ADMIN, S.IN_REVIEW],
    [S.IN_REVIEW, S.APPROVED],
    [S.IN_REVIEW, S.REJECTED],
    [S.SUBMITTED, S.REJECTED],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [S.SUBMITTED, S.APPROVED],
    [S.APPROVED, S.SUBMITTED],
    [S.REJECTED, S.APPROVED],
    [S.APPROVED, S.REJECTED],
    [S.FORWARDED_TO_ADMIN, S.FORWARDED_TO_ADMIN],
    [S.IN_REVIEW, S.SUBMITTED],
  ])('blocks %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
