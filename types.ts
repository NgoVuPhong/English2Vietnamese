
export interface VocabEntry {
  id: string;
  original: string;
  phonetics: string;
  vietnameseMeaning: string;
  example: string;
  partOfSpeech: string;
  type: 'word' | 'phrase' | 'phrasal_verb' | 'idiom' | 'collocation';
  timestamp: number;
}

export enum EntryType {
  WORD = 'word',
  PHRASE = 'phrase',
  PHRASAL_VERB = 'phrasal_verb',
  IDIOM = 'idiom',
  COLLOCATION = 'collocation'
}
