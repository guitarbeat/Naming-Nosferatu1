import React, { useState } from 'react';
import { Check, ArrowRight, User } from 'lucide-react';
import './_group.css';

const MOCK_NAMES = [
  "Mordecai", "Vladislav", "Nosferatu", "Count Clawula", 
  "Draculea", "Batsworth", "Grimshaw", "Lilith", 
  "Salem", "Baron Von Scratch", "Phantasm", "Nox"
];

export function InteractionAffordance() {
  const [activeTab, setActiveTab] = useState<'tournament' | 'suggest'>('tournament');
  const [selectedNames, setSelectedNames] = useState<string[]>(["Nosferatu", "Grimshaw", "Salem"]);
  const [suggestion, setSuggestion] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const toggleName = (name: string) => {
    setSelectedNames(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-24 selection:bg-cyan-300">
      {/* Header / Navbar */}
      <header className="p-4 md:p-6 border-b-2 border-black sticky top-0 bg-white z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-tight">
            Naming Nosferatu
          </h1>
          
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('tournament')}
              className={`min-h-[48px] px-6 py-2 font-bold uppercase tracking-wider border-2 border-black transition-all ${
                activeTab === 'tournament' 
                  ? 'bg-black text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-y-[-2px] translate-x-[-2px]' 
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Tournament
            </button>
            <button
              onClick={() => setActiveTab('suggest')}
              className={`min-h-[48px] px-6 py-2 font-bold uppercase tracking-wider border-2 border-black transition-all ${
                activeTab === 'suggest' 
                  ? 'bg-black text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-y-[-2px] translate-x-[-2px]' 
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Suggest
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-8">
        {activeTab === 'tournament' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold uppercase mb-2">Select Contenders</h2>
              <p className="text-lg text-gray-700 font-mono">Pick at least 4 names to begin the tournament.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              {MOCK_NAMES.map((name, index) => {
                const isSelected = selectedNames.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleName(name)}
                    className={`group relative text-left min-h-[80px] p-4 border-2 border-black transition-all duration-200 active:translate-x-0 active:translate-y-0 active:shadow-none ${
                      isSelected 
                        ? 'bg-black text-white shadow-[4px_4px_0_0_rgba(0,255,255,1)] translate-x-[-2px] translate-y-[-2px]' 
                        : 'bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{name}</span>
                      <div className={`w-8 h-8 flex items-center justify-center border-2 ${isSelected ? 'border-cyan-400 bg-cyan-400 text-black' : 'border-black bg-white'}`}>
                        {isSelected && <Check size={20} strokeWidth={3} />}
                      </div>
                    </div>
                    {index === 0 && !isSelected && (
                      <span className="absolute -top-3 -right-2 bg-yellow-300 text-black text-xs font-mono font-bold px-2 py-1 border-2 border-black rotate-3 z-10">
                        Tap to select!
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t-2 border-black z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
              <div className="max-w-4xl mx-auto">
                <button 
                  disabled={selectedNames.length < 4}
                  className="w-full min-h-[56px] bg-[#00ffff] hover:bg-cyan-300 text-black text-xl font-display font-bold uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  Start Tournament 
                  <span className="bg-black text-white px-3 py-1 text-sm font-mono border-2 border-black">
                    {selectedNames.length} SELECTED
                  </span>
                  <ArrowRight size={24} />
                </button>
                {selectedNames.length < 4 && (
                  <p className="text-center text-sm font-mono mt-2 text-red-600 font-bold">
                    Select {4 - selectedNames.length} more to start
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'suggest' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold uppercase mb-2">Suggest a Name</h2>
              <p className="text-lg text-gray-700 font-mono">Have a better idea? Submit it to the community.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setSuggestion(''); alert('Submitted!'); }} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="suggestion" className="block text-lg font-bold uppercase">
                  Cat Name
                </label>
                <textarea
                  id="suggestion"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="e.g. Meowphistopheles"
                  className="w-full min-h-[120px] p-4 text-lg border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all resize-none"
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full md:w-auto min-h-[56px] px-8 bg-black hover:bg-gray-800 text-white text-lg font-bold uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_0_rgba(0,255,255,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,255,255,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-2"
              >
                Submit Suggestion <ArrowRight size={20} />
              </button>
            </form>

            <div className="mt-16 pt-8 border-t-2 border-black">
              <h3 className="text-2xl font-display font-bold uppercase mb-6">Profile Settings</h3>
              
              <div className="p-6 border-2 border-black bg-gray-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                {isLoggedIn ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-cyan-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                        <User size={32} />
                      </div>
                      <div>
                        <p className="font-bold text-lg">CatLover99</p>
                        <p className="font-mono text-sm text-gray-600">Member since 2024</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsLoggedIn(false)}
                      className="min-h-[48px] px-6 py-2 font-bold uppercase border-2 border-black bg-white hover:bg-red-50 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none flex items-center gap-2 underline decoration-2 underline-offset-4"
                    >
                      Log Out <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg mb-1">Not logged in</p>
                      <p className="font-mono text-sm text-gray-600">Log in to track your stats.</p>
                    </div>
                    <button 
                      onClick={() => setIsLoggedIn(true)}
                      className="min-h-[48px] px-6 py-2 font-bold uppercase border-2 border-black bg-black text-white shadow-[4px_4px_0_0_rgba(0,255,255,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(0,255,255,1)] active:translate-y-1 active:shadow-none flex items-center gap-2 underline decoration-2 underline-offset-4"
                    >
                      Log In <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="fixed top-4 right-4 z-50 pointer-events-none hidden md:block">
        <div className="bg-yellow-300 text-black text-xs font-mono font-bold p-3 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] max-w-xs">
          Tradeoff: Maximizing interaction clarity at the cost of visual elegance
        </div>
      </div>
    </div>
  );
}
