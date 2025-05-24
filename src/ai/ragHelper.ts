// src/ai/ragHelper.ts

export type Clause = {
    id: string;
    type: string;
    content: string;
  };
  
  export class RAGEngine {
    private index: Clause[] = [];
    private summary: string = '';
    private logs: string[] = [];
  
    indexDocuments(clauses: Clause[]) {
      this.index = clauses;
      this.logs.push(`Indexed ${clauses.length} clauses.`);
    }
  
    requestSummary(requestedTypes: string[]): string {
      const retrieved = this.index.filter(clause => requestedTypes.includes(clause.type));
      if (retrieved.length === 0) {
        this.logs.push('Warning: No clauses retrieved for summary.');
        this.summary = 'Summary incomplete due to missing clauses.';
        return this.summary;
      }
  
      this.summary = retrieved.map(c => `• ${c.type}: ${c.content}`).join('\n');
      this.logs.push(`Generated summary with ${retrieved.length} clauses.`);
      return this.summary;
    }
  
    addClause(clause: Clause) {
      this.index.push(clause);
      this.logs.push(`Added new clause of type ${clause.type}`);
    }
  
    getLogs(): string[] {
      return this.logs;
    }
  
    getSummary(): string {
      return this.summary;
    }
  
    getRetrievedClauseIds(): string[] {
      return this.index.map(c => c.id);
    }
  } 
  