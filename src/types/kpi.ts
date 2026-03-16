export interface KPIItem {
  id: string;
  name: string;
  description: string;
  measurementMethod: string;
  targetValue: string;
  relatedSubGoals: string[];
}

export interface KPIDecompositionResult {
  mainKPI: KPIItem;
  subKPIs: KPIItem[];
}
