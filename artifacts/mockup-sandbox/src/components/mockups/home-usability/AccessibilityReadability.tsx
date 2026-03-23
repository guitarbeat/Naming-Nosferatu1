import React, { useState } from 'react';
import { Check, User, LogOut, Send } from 'lucide-react';
import './_group.css';

const MOCK_NAMES = [
  "Mordecai", "Vladislav", "Nosferatu", "Count Clawula", 
  "Draculea", "Batsworth", "Grimshaw", "Lilith", 
  "Salem", "Baron Von Scratch", "Phantasm", "Nox"
];

export function AccessibilityReadability() {
  const [selectedNames, setSelectedNames] = useState<string[]>(["Nosferatu", "Salem"]);
  const [suggestion, setSuggestion] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);

  const toggleName = (name: string) => {
    setSelectedNames(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestion('');
    alert("Suggestion submitted successfully.");
  };

  return (
    <div className="min-h-screen bg-white text-black font-space-grotesk text-base leading-[1.6] pb-24 selection:bg-[#00E5FF] selection:text-black">
      {/* 1. Skip-to-content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white focus:text-black focus:border-2 focus:border-black focus:outline focus:outline-3 focus:outline-[#00E5FF] shadow-[5px_5px_0_black]"
      >
        Skip to main content
      </a>

      {/* Header / Profile Section */}
      <header className="border-b-2 border-black p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h1 className="font-syne text-2xl md:text-3xl font-bold m-0 p-0">
            Naming Nosferatu
          </h1>
          <p className="text-[#333333] mt-1">
            Accessible tournament edition
          </p>
        </div>
        
        {/* 9. Profile section with descriptive labels */}
        <div className="flex items-center gap-4 p-4 border-2 border-black shadow-[3px_3px_0_black] bg-white w-full sm:w-auto">
          {isSignedIn ? (
            <>
              <div className="flex items-center gap-2">
                <User size={20} aria-hidden="true" />
                <span className="font-bold">Signed in as Demo User</span>
              </div>
              <button 
                onClick={() => setIsSignedIn(false)}
                className="ml-auto sm:ml-4 flex items-center gap-2 px-3 py-1 border-2 border-black hover:bg-gray-100 focus:outline focus:outline-3 focus:outline-[#00E5FF] focus:outline-offset-2 transition-none font-bold bg-white"
                aria-label="Sign out of your account"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <span className="font-bold text-[#222222]">Sign in to save your scores</span>
              <button 
                onClick={() => setIsSignedIn(true)}
                className="ml-auto sm:ml-4 px-4 py-2 bg-black text-white font-bold border-2 border-transparent focus:border-black focus:outline focus:outline-3 focus:outline-[#00E5FF] focus:outline-offset-2 transition-none hover:bg-[#333333]"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 mt-8" tabIndex={-1}>
        
        {/* Step 1: Picker */}
        <section aria-labelledby="step-1-heading" className="space-y-6">
          {/* 6. Section headings use <h2> with descriptive text */}
          <h2 id="step-1-heading" className="font-syne text-2xl md:text-3xl font-bold border-b-2 border-black pb-2 inline-block">
            Step 1: Choose your contenders
          </h2>
          <p className="text-[#222222] max-w-2xl">
            Select the names you want to include in your tournament. You need at least 2 names to start a match.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" role="group" aria-label="Cat names selection">
            {MOCK_NAMES.map(name => {
              const isSelected = selectedNames.includes(name);
              return (
                <label 
                  key={name}
                  className={`
                    relative flex items-center gap-4 p-4 border-2 border-black cursor-pointer bg-white
                    focus-within:outline focus-within:outline-3 focus-within:outline-[#00E5FF] focus-within:outline-offset-2
                    hover:bg-gray-50 transition-none
                    ${isSelected ? 'shadow-[4px_4px_0_black]' : 'shadow-none'}
                  `}
                >
                  {/* 4. Semantic checkbox pattern, explicitly visible at rest */}
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={isSelected}
                      onChange={() => toggleName(name)}
                      aria-label={`Select ${name}`}
                    />
                    <div className={`
                      w-6 h-6 border-2 border-black flex items-center justify-center
                      ${isSelected ? 'bg-black text-white' : 'bg-white'}
                    `} aria-hidden="true">
                      {isSelected && <Check size={16} strokeWidth={4} />}
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${isSelected ? 'text-black' : 'text-[#222222]'}`}>
                    {name}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-6 border-t-2 border-black mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-bold text-lg" aria-live="polite">
              {selectedNames.length} names selected
            </p>
            <button 
              className={`
                w-full sm:w-auto px-8 py-4 font-syne font-bold text-xl border-2 border-black transition-none
                focus:outline focus:outline-3 focus:outline-black focus:outline-offset-4
                ${selectedNames.length < 2 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'bg-[#00E5FF] text-black shadow-[5px_5px_0_black] hover:bg-[#00cce6]'
                }
              `}
              disabled={selectedNames.length < 2}
              aria-disabled={selectedNames.length < 2}
            >
              Start Tournament
            </button>
          </div>
        </section>

        {/* Step 2: Suggestion */}
        <section aria-labelledby="step-2-heading" className="space-y-6 pt-12 border-t-4 border-black">
          <h2 id="step-2-heading" className="font-syne text-2xl md:text-3xl font-bold">
            Step 2: Suggest a new name
          </h2>
          <p className="text-[#222222] max-w-2xl">
            Have a brilliant cat name that isn't on the list? Submit it to the community database.
          </p>

          <form onSubmit={handleSuggest} className="max-w-xl space-y-6 bg-white p-6 border-2 border-black shadow-[6px_6px_0_black]">
            <div className="space-y-2">
              {/* 8. Suggestion form has a proper <label> visually displayed */}
              <label htmlFor="name-suggestion" className="block font-bold text-lg text-black">
                Cat name suggestion
              </label>
              <p id="suggestion-hint" className="text-[#444444] text-sm mb-2">
                Please enter a single name, maximum 30 characters.
              </p>
              <input
                id="name-suggestion"
                type="text"
                required
                maxLength={30}
                aria-describedby="suggestion-hint"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className="w-full p-3 border-2 border-black font-space-mono text-lg focus:outline focus:outline-3 focus:outline-[#00E5FF] focus:outline-offset-2 transition-none"
              />
            </div>
            
            <button 
              type="submit"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-black text-white font-bold text-lg focus:outline focus:outline-3 focus:outline-[#00E5FF] focus:outline-offset-2 hover:bg-[#333333] transition-none"
            >
              <Send size={20} aria-hidden="true" />
              Submit Suggestion
            </button>
          </form>
        </section>

      </main>

      {/* 10. Tradeoff label */}
      <footer className="mt-20 border-t-2 border-black bg-white p-6 text-center">
        <p className="font-space-mono text-sm text-[#333333] max-w-3xl mx-auto border-2 border-black p-4 inline-block shadow-[4px_4px_0_black]">
          <strong>Design Note:</strong> Optimizing for WCAG compliance and reduced cognitive load at the cost of visual drama.
        </p>
      </footer>
    </div>
  );
}
