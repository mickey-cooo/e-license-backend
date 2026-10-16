export enum DocumentWorkflowStatus {
  SUBMITTED = 'submitted',
  FORWARDED_TO_ADMIN = 'forwarded_to_admin',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

// Allowed next statuses. Approved and rejected are final.
export const documentTransitions: Record<
  DocumentWorkflowStatus,
  DocumentWorkflowStatus[]
> = {
  [DocumentWorkflowStatus.SUBMITTED]: [
    DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
    DocumentWorkflowStatus.REJECTED,
  ],
  [DocumentWorkflowStatus.FORWARDED_TO_ADMIN]: [
    DocumentWorkflowStatus.IN_REVIEW,
    DocumentWorkflowStatus.REJECTED,
  ],
  [DocumentWorkflowStatus.IN_REVIEW]: [
    DocumentWorkflowStatus.APPROVED,
    DocumentWorkflowStatus.REJECTED,
  ],
  [DocumentWorkflowStatus.APPROVED]: [],
  [DocumentWorkflowStatus.REJECTED]: [],
  [DocumentWorkflowStatus.DELETED]: [],
};

export const canTransition = (
  from: DocumentWorkflowStatus,
  to: DocumentWorkflowStatus,
) => documentTransitions[from].includes(to);
