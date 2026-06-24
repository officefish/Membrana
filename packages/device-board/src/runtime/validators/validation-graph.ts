/** Minimal wire topology shared by scenario subgraphs and signal graph. */
export interface ValidationWireGraph {
  readonly nodes: readonly { readonly id: string }[];
  readonly edges: readonly {
    readonly source: string;
    readonly target: string;
    readonly sourceHandle: string;
    readonly targetHandle: string;
    readonly kind?: string;
  }[];
  readonly entry?: string;
}

/** Scenario node shape for variable reference checks. */
export interface ValidationScenarioNode {
  readonly id: string;
  readonly nodeKind?: string;
  readonly variableId?: string;
}
