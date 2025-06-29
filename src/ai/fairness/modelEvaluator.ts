export async function evaluateModel(input: any): Promise<string> {
  // Mock LLM or model output – replace with API/LLM call or model inference
  const demographicBiasMap: Record<string, string> = {
    male: 'approved',
    female: 'approved',
    nonbinary: 'approved',
    asian: 'approved',
    black: 'approved',
    white: 'approved',
    hispanic: 'approved',
  };

  return demographicBiasMap[input.demographic] || 'undecided';
}