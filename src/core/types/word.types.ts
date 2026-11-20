export interface WordItem {
  id: string;
  word: string;
  wordAmharic?: string;
  category: string;
  categoryId?: string;
  categoryAmharic?: string;
  extraHint: string;
  extraHintAmharic?: string;
  intendedMeaning?: string;
  decoyMeaning?: string;
  imageAssetId?: string;
  decoyImageAssetId?: string;
  imageUrl?: string;
  decoyImageUrl?: string;
  botClues?: string[];
  botCluesAmharic?: string[];
  isCustom?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  nameAmharic?: string;
  icon: string;
  description: string;
  descriptionAmharic?: string;
  wordCount: number;
  isCustom?: boolean;
}
