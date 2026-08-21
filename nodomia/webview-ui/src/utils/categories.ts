export interface CategoryInfo {
  label: string;
  accent: string;
}

const CATEGORIES: Record<string, CategoryInfo> = {
  react: { label: 'React', accent: '#00d2ff' },
  vue: { label: 'Vue', accent: '#41b883' },
};

const DEFAULT_CATEGORY: CategoryInfo = { label: 'Курсы', accent: '#00d2ff' };

export function categoryInfo(category: string): CategoryInfo {
  return CATEGORIES[category] ?? DEFAULT_CATEGORY;
}
