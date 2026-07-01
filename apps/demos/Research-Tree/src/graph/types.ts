export type NodeState = 'fog' | 'available' | 'exploring' | 'established';
export type Epoch = 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | null;
export type NodeType = 'knowledge' | 'capability' | 'service' | 'process';

export interface GateInfo {
  criterion: string;
  status: 'open' | 'passed';
}

export interface KnowledgeNode {
  id: string;
  title: string;
  type: NodeType;
  branch: string;
  epoch: Epoch;
  state: NodeState;
  requires: string[];
  gate?: GateInfo;
  note?: string;
  evidence?: string;
}

export interface KnowledgeArtifact {
  id: string;
  title: string;
  node: string;
  also?: string[];
  kind: string;
  status: 'collected' | 'in_progress' | 'missing';
  path?: string;
}

export interface KnowledgeGraph {
  version: string;
  updated: string;
  nodes: KnowledgeNode[];
  artifacts: KnowledgeArtifact[];
  branches: Record<string, string>;
}
