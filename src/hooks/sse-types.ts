export interface OperationCallbacks {
  startOperation: (id: string, label: string, status?: string) => void;
  updateOperation: (id: string, patch: { progress?: number; status?: string }) => void;
  stopOperation: (id: string) => void;
}

export interface ProgressPhase {
  start: number;
  ceiling: number;
}
