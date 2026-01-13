
import React, { useState, useMemo } from 'react';
import { VocabEntry } from '../types';
import { speakVocab } from '../services/geminiService';

interface FlashcardGameProps {
  entries: VocabEntry[];
  onExit: () => void;
}

const FlashcardGame: React.FC<FlashcardGameProps> = ({ entries, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Shuffle the entries for the session
  const shuffledEntries = useMemo(() => {
    return [...entries].sort(() => Math.random() - 0.5);
  }, [entries]);

  const currentEntry = shuffledEntries[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakVocab(currentEntry.original);
  };

  const nextCard = (isLearned: boolean) => {
    if (isLearned) setLearnedCount(prev => prev + 1);
    
    if (currentIndex < shuffledEntries.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    } else {
      setIsFinished(true);
    }
  };

  const progress = ((currentIndex + 1) / shuffledEntries.length) * 100;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-trophy text-4xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Tuyệt vời!</h2>
          <p className="text-slate-500 mb-8">Bạn đã hoàn thành phiên học với {shuffledEntries.length} từ vựng.</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <span className="block text-2xl font-bold text-indigo-600">{learnedCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Đã thuộc</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <span className="block text-2xl font-bold text-slate-700">{shuffledEntries.length - learnedCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Cần xem lại</span>
            </div>
          </div>
          <button 
            onClick={onExit}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Inter']">
      <header className="p-6 flex items-center justify-between">
        <button onClick={onExit} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="flex-1 max-w-xs mx-8">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 block text-center">
            Từ {currentIndex + 1} / {shuffledEntries.length}
          </span>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div 
          className="relative w-full max-w-md aspect-[3/4] cursor-pointer perspective-1000 group"
          onClick={handleFlip}
        >
          <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col items-center justify-center p-12 text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 bg-indigo-50 px-4 py-1 rounded-full">
                English
              </span>
              <h2 className="text-5xl font-black text-slate-800 mb-4 leading-tight">
                {currentEntry.original}
              </h2>
              <p className="text-indigo-500 font-mono text-lg mb-12 opacity-60">
                {currentEntry.phonetics}
              </p>
              <div className="mt-auto text-slate-300 flex flex-col items-center gap-2">
                <i className="fa-solid fa-repeat text-xl animate-bounce"></i>
                <span className="text-[10px] font-bold uppercase tracking-widest">Click để lật thẻ</span>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col p-12 rotate-y-180">
              <div className="flex justify-between items-start mb-8">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-50 px-4 py-1 rounded-full">
                  Tiếng Việt
                </span>
                <button 
                  onClick={handleSpeak}
                  className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-volume-high"></i>
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="text-3xl font-black text-slate-800 mb-6 leading-tight">
                  {currentEntry.vietnameseMeaning}
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ví dụ:</span>
                  <p className="text-slate-600 italic leading-relaxed">
                    "{currentEntry.example}"
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCard(false); }}
                  className="py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  Chưa thuộc
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCard(true); }}
                  className="py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Đã thuộc
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="p-12 text-center text-slate-300">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Gemini Vocab Game Mode</p>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardGame;
