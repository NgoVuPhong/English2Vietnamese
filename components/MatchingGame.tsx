
import React, { useState, useEffect, useRef } from 'react';
import { VocabEntry } from '../types';

interface CardItem {
  id: string;
  originalId: string;
  content: string;
  type: 'en' | 'vi';
}

interface MatchingGameProps {
  entries: VocabEntry[];
  onExit: () => void;
}

const MatchingGame: React.FC<MatchingGameProps> = ({ entries, onExit }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<CardItem[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongMatchIds, setWrongMatchIds] = useState<Set<string>>(new Set());
  const [hintIds, setHintIds] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [totalInitialTime, setTotalInitialTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(2);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const playSound = (type: 'correct' | 'wrong' | 'timeout' | 'click') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      } else if (type === 'wrong' || type === 'timeout') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.debug("Audio play blocked"); }
  };

  const initGame = () => {
    const numPairs = Math.min(entries.length, 8);
    const gamePool = [...entries].sort(() => Math.random() - 0.5).slice(0, numPairs);
    const calculatedTime = numPairs * 15;
    
    setTotalInitialTime(calculatedTime);
    setTimeLeft(calculatedTime);
    setMatchedIds(new Set());
    setSelectedCards([]);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsFinished(false);
    setIsPaused(false);
    setHintsLeft(2);

    const enCards: CardItem[] = gamePool.map(e => ({
      id: `en-${e.id}`,
      originalId: e.id,
      content: e.original,
      type: 'en'
    }));
    const viCards: CardItem[] = gamePool.map(e => ({
      id: `vi-${e.id}`,
      originalId: e.id,
      content: e.vietnameseMeaning.split('\n')[0],
      type: 'vi'
    }));
    setCards([...enCards, ...viCards].sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    initGame();
  }, [entries]);

  useEffect(() => {
    if (isFinished || isPaused || matchedIds.size === cards.length / 2 || cards.length === 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playSound('timeout');
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isFinished, isPaused, matchedIds.size, cards.length]);

  useEffect(() => {
    if (cards.length > 0 && matchedIds.size === cards.length / 2) {
      setTimeout(() => setIsFinished(true), 500);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [matchedIds, cards]);

  const handleCardClick = (card: CardItem) => {
    if (isFinished || isPaused || matchedIds.has(card.originalId) || selectedCards.find(c => c.id === card.id) || selectedCards.length >= 2) return;
    
    playSound('click');
    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      if (first.originalId === second.originalId && first.type !== second.type) {
        playSound('correct');
        setCorrectCount(c => c + 1);
        setTimeout(() => {
          setMatchedIds(prev => new Set(prev).add(first.originalId));
          setSelectedCards([]);
        }, 300);
      } else {
        playSound('wrong');
        setIncorrectCount(c => c + 1);
        setWrongMatchIds(new Set([first.id, second.id]));
        setTimeout(() => {
          setSelectedCards([]);
          setWrongMatchIds(new Set());
        }, 600);
      }
    }
  };

  const handleShuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    playSound('click');
  };

  const handleHint = () => {
    if (hintsLeft <= 0 || isPaused || isFinished) return;
    
    const unMatchedCards = cards.filter(c => !matchedIds.has(c.originalId));
    if (unMatchedCards.length === 0) return;
    
    const randomCard = unMatchedCards[Math.floor(Math.random() * unMatchedCards.length)];
    const pair = unMatchedCards.filter(c => c.originalId === randomCard.originalId);
    
    setHintIds(new Set(pair.map(p => p.id)));
    setHintsLeft(prev => prev - 1);
    
    setTimeout(() => {
      setHintIds(new Set());
    }, 1500);
  };

  if (isFinished) {
    const isWin = matchedIds.size === cards.length / 2 && cards.length > 0;
    const accuracy = Math.round((correctCount / (correctCount + incorrectCount)) * 100) || 0;
    
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-['Inter']">
        <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl scale-in-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isWin ? 'bg-amber-100 text-amber-500' : 'bg-rose-100 text-rose-500'}`}>
            <i className={`fa-solid ${isWin ? 'fa-crown' : 'fa-hourglass-end'} text-3xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">{isWin ? 'Tuyệt vời!' : 'Hết giờ rồi!'}</h2>
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <span className="block text-2xl font-black text-emerald-600">{correctCount}</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Đã ghép</span>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl">
              <span className="block text-2xl font-black text-rose-600">{incorrectCount}</span>
              <span className="text-[10px] font-bold text-rose-400 uppercase">Lỗi sai</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={initGame} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">Thử lại</button>
            <button onClick={onExit} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all">Thoát</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Inter'] relative">
      {/* Header */}
      <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div className="flex-1 max-w-sm mx-4">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</span>
            <span className={`text-sm font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>{timeLeft}s</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${timeLeft <= (totalInitialTime * 0.2) ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / totalInitialTime) * 100}%` }}></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">{matchedIds.size}</div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full flex items-center justify-center relative">
        {isPaused && (
          <div className="absolute inset-0 z-20 bg-slate-50/90 backdrop-blur-sm flex items-center justify-center">
            <button onClick={() => setIsPaused(false)} className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:scale-110 transition-transform">
              <i className="fa-solid fa-play mr-3"></i> TIẾP TỤC
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {cards.map((card) => {
            const isSelected = selectedCards.find(c => c.id === card.id);
            const isMatched = matchedIds.has(card.originalId);
            const isWrong = wrongMatchIds.has(card.id);
            const isHint = hintIds.has(card.id);

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`
                  relative aspect-[3/2] sm:aspect-[4/3] rounded-[1.2rem] p-3 flex items-center justify-center text-center transition-all duration-300 cursor-pointer border-2
                  ${isMatched ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}
                  ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg -translate-y-1' : 'bg-white border-slate-100 shadow-sm'}
                  ${isWrong ? 'bg-rose-500 border-rose-500 text-white animate-shake' : ''}
                  ${isHint ? 'border-amber-400 ring-4 ring-amber-100 animate-pulse bg-amber-50' : ''}
                  ${isPaused ? 'blur-md pointer-events-none' : ''}
                `}
              >
                <span className={`font-bold text-sm sm:text-base select-none ${isSelected || isWrong ? 'text-white' : 'text-slate-800'}`}>
                  {card.content}
                </span>
              </div>
            );
          })}
        </div>
      </main>

      {/* Action Bar */}
      <div className="p-6 flex justify-center sticky bottom-0 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={handleShuffle}
            title="Xáo trộn lại thẻ"
            className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-90"
          >
            <i className="fa-solid fa-shuffle"></i>
          </button>
          
          <button 
            onClick={handleHint}
            disabled={hintsLeft <= 0 || isPaused}
            className={`flex items-center gap-2 px-6 h-12 rounded-full font-black text-sm transition-all active:scale-95 ${hintsLeft > 0 ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
          >
            <i className="fa-solid fa-lightbulb"></i>
            GỢI Ý ({hintsLeft})
          </button>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-indigo-100"
          >
            <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
          </button>

          <button 
            onClick={initGame}
            title="Chơi lại từ đầu"
            className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-90"
          >
            <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; animation-iteration-count: 2; }
        .scale-in-center { animation: scale-in-center 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
        @keyframes scale-in-center { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MatchingGame;
