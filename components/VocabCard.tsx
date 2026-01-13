
import React, { useState } from 'react';
import { VocabEntry } from '../types';
import { speakVocab } from '../services/geminiService';

interface VocabCardProps {
  entry: VocabEntry;
  onDelete: (id: string) => void;
}

const VocabCard: React.FC<VocabCardProps> = ({ entry, onDelete }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    await speakVocab(entry.original);
    setTimeout(() => setIsSpeaking(false), 1000);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'word': return 'bg-blue-100 text-blue-700';
      case 'phrase': return 'bg-emerald-100 text-emerald-700';
      case 'phrasal_verb': return 'bg-purple-100 text-purple-700';
      case 'idiom': return 'bg-amber-100 text-amber-700';
      case 'collocation': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getLabel = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group p-6 flex flex-col h-full relative">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => onDelete(entry.id)}
          className="text-slate-300 hover:text-red-500 transition-colors"
          title="Xóa từ này"
        >
          <i className="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>

      <div className="flex justify-between items-start mb-4 pr-6">
        <div>
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest mb-2 ${getTypeColor(entry.type)}`}>
            {getLabel(entry.type)}
          </span>
          <h3 className="text-2xl font-black text-slate-800 mb-1 leading-tight">{entry.original}</h3>
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-mono text-sm font-semibold">{entry.phonetics}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{entry.partOfSpeech}</span>
          </div>
        </div>
        <button 
          onClick={handleSpeak}
          disabled={isSpeaking}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isSpeaking ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          } shadow-lg shadow-transparent`}
        >
          <i className={`fa-solid ${isSpeaking ? 'fa-volume-high' : 'fa-volume-low'} text-base`}></i>
        </button>
      </div>
      
      <div className="space-y-4 flex-1">
        <div className="text-slate-700 font-medium whitespace-pre-line leading-relaxed text-base pl-4 border-l-4 border-indigo-500 bg-indigo-50/30 py-2 rounded-r-lg">
          {entry.vietnameseMeaning}
        </div>
        
        <div className="mt-auto pt-4 border-t border-slate-50">
          <p className="text-slate-500 italic text-sm leading-relaxed">
            <i className="fa-solid fa-quote-left text-[10px] text-indigo-300 mr-2"></i>
            {entry.example}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VocabCard;
