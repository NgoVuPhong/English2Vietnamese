
import React, { useState, useEffect, useCallback } from 'react';
import { VocabEntry, EntryType } from './types';
import { fetchVocabDetails } from './services/geminiService';
import VocabCard from './components/VocabCard';
import FlashcardGame from './components/FlashcardGame';
import MatchingGame from './components/MatchingGame';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, VerticalAlign, TextRun } from 'docx';
import saveAs from 'file-saver';

const App: React.FC = () => {
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType>(EntryType.WORD);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isGameMode, setIsGameMode] = useState(false);
  const [isMatchingMode, setIsMatchingMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vocab-entries');
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vocab-entries', JSON.stringify(entries));
  }, [entries]);

  const processAddition = async (word: string) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const details = await fetchVocabDetails(word);
      
      if (details.didYouMean && details.didYouMean.toLowerCase() !== word.toLowerCase()) {
        setSuggestion(details.didYouMean);
        setIsLoading(false);
        return;
      }

      const newEntry: VocabEntry = {
        id: crypto.randomUUID(),
        original: word.trim(),
        phonetics: details.phonetics || '',
        partOfSpeech: details.partOfSpeech || '',
        vietnameseMeaning: details.vietnameseMeaning || '',
        example: details.example || '',
        type: selectedType,
        timestamp: Date.now()
      };

      setEntries(prev => [newEntry, ...prev]);
      setInputValue('');
      setSuggestion(null);
    } catch (err) {
      setError("Không thể tìm thấy thông tin. Hãy kiểm tra lại từ vựng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    processAddition(inputValue);
  };

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const exportToWord = async () => {
    if (entries.length === 0) return;
    setIsExporting(true);
    const FONT_FAMILY = "Times New Roman";
    const FONT_SIZE = 24; 

    try {
      const sortedEntries = [...entries].sort((a, b) => a.original.localeCompare(b.original));
      const headers = ["STT", "Từ vựng/Cụm từ", "Loại từ", "Phiên âm", "Nghĩa tiếng Việt", "Ví dụ"];
      
      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(text => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER })],
          shading: { fill: "F1F5F9" },
          verticalAlign: VerticalAlign.CENTER,
        }))
      });

      const bodyRows = sortedEntries.map((entry, index) => {
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), font: FONT_FAMILY })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.original, bold: true, font: FONT_FAMILY })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.partOfSpeech, font: FONT_FAMILY })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.phonetics, font: FONT_FAMILY })] })] }),
            new TableCell({ children: entry.vietnameseMeaning.split('\n').map(m => new Paragraph({ children: [new TextRun({ text: m, font: FONT_FAMILY })] })) }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.example, font: FONT_FAMILY, italic: true })] })] }),
          ]
        });
      });

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun({ text: "DANH SÁCH TỪ VỰNG TIẾNG ANH", bold: true, font: FONT_FAMILY, size: 36 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...bodyRows]
            })
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Vocab_List_${new Date().toLocaleDateString()}.docx`);
    } catch (err) { alert("Lỗi khi xuất Word"); } finally { setIsExporting(false); }
  };

  if (isGameMode && entries.length > 0) {
    return <FlashcardGame entries={entries} onExit={() => setIsGameMode(false)} />;
  }

  if (isMatchingMode && entries.length >= 3) {
    return <MatchingGame entries={entries} onExit={() => setIsMatchingMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-['Inter']">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-brain text-white"></i>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Gemini Vocab Smart</h1>
          </div>
          <div className="flex items-center gap-2">
            {entries.length >= 3 && (
              <>
                <button 
                  onClick={() => setIsMatchingMode(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <i className="fa-solid fa-layer-group"></i>
                  Matching Game
                </button>
                <button 
                  onClick={() => setIsGameMode(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-100"
                >
                  <i className="fa-solid fa-play"></i>
                  Flashcards
                </button>
              </>
            )}
            {entries.length > 0 && (
              <button 
                onClick={exportToWord}
                disabled={isExporting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
                Xuất Word
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 mb-3">Học Tiếng Anh Thông Minh</h2>
          <p className="text-slate-500">Tự động sửa lỗi chính tả, phiên âm chuẩn và trò chơi học tập.</p>
        </div>

        <section className="bg-white p-2 rounded-[2rem] shadow-2xl shadow-slate-200 border border-white mb-12">
          <form onSubmit={handleAddEntry} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập từ vựng (ví dụ: resilient, breakthrough...)"
              className="flex-1 px-8 py-5 rounded-[1.5rem] bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-medium"
            />
            <div className="flex gap-2 p-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as EntryType)}
                className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm outline-none cursor-pointer"
              >
                <option value={EntryType.WORD}>Từ đơn</option>
                <option value={EntryType.PHRASE}>Cụm từ</option>
                <option value={EntryType.IDIOM}>Thành ngữ</option>
              </select>
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
              >
                {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                Thêm
              </button>
            </div>
          </form>
          
          {suggestion && (
            <div className="p-4 mx-2 mb-2 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <p className="text-amber-800 font-medium">
                <i className="fa-solid fa-lightbulb mr-2"></i>
                Có phải bạn muốn tìm: <span className="font-bold underline cursor-pointer" onClick={() => processAddition(suggestion)}>{suggestion}</span>?
              </p>
              <button onClick={() => setSuggestion(null)} className="text-amber-400 hover:text-amber-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-center font-bold">
            <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entries.map(entry => (
            <VocabCard key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))}
        </div>

        {entries.length === 0 && !isLoading && (
          <div className="text-center py-20 opacity-40">
            <i className="fa-solid fa-feather-pointed text-6xl mb-4 block"></i>
            <p className="text-xl font-bold">Bắt đầu hành trình chinh phục từ vựng</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
