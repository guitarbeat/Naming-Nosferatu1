import React, { useState } from 'react';
import { Check, ChevronRight, PenLine, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './_group.css';

const MOCK_NAMES = [
  "Mordecai", "Vladislav", "Nosferatu", "Count Clawula", 
  "Draculea", "Batsworth", "Grimshaw", "Lilith", 
  "Salem", "Baron Von Scratch", "Phantasm", "Nox"
];

const INITIAL_SELECTED = [
  "Nosferatu", "Vladislav", "Grimshaw", "Salem", "Nox", "Lilith"
];

export function HierarchyClarity() {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(INITIAL_SELECTED));
  const [isStarted, setIsStarted] = useState(false);

  const toggleName = (name: string) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedNames(newSelected);
  };

  const handleEnterTournament = () => {
    document.getElementById('step-2')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartTournament = () => {
    if (selectedNames.size >= 2) {
      setIsStarted(true);
      setTimeout(() => setIsStarted(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-16 font-['Space_Grotesk']">
      {/* Header */}
      <header className="p-4 md:p-6 border-b-4 border-black flex justify-between items-center bg-white sticky top-0 z-50 shadow-[0_4px_0_black]">
        <div className="font-['Syne'] font-black text-2xl md:text-3xl uppercase tracking-tighter">
          Nosferatu
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Step 1: Hero Zone */}
        <section className="min-h-[55vh] flex flex-col justify-center py-12 md:py-24 border-b-4 border-black relative">
          <div className="absolute top-8 left-0 md:left-[-16px] bg-black text-white px-4 py-1 text-sm md:text-base font-['Space_Mono'] font-bold uppercase tracking-widest shadow-[4px_4px_0_hsl(190,100%,50%)]">
            Step 1
          </div>
          
          <div className="mt-8 space-y-8 max-w-3xl">
            <h1 className="font-['Syne'] text-6xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.85] tracking-tighter">
              Name <br/>
              The Count
            </h1>
            <p className="font-['Space_Mono'] text-lg md:text-2xl border-l-8 border-[hsl(190,100%,50%)] pl-6 text-black/80 font-bold">
              Pick your contenders. Let fate decide.
            </p>
            
            <div className="pt-8">
              <Button 
                onClick={handleEnterTournament}
                className="group relative h-auto bg-black hover:bg-[hsl(190,100%,50%)] hover:text-black text-white rounded-none border-4 border-black text-xl md:text-3xl px-8 py-6 shadow-[8px_8px_0_black] hover:shadow-[2px_2px_0_black] hover:translate-x-[6px] hover:translate-y-[6px] transition-all font-black uppercase tracking-wider"
              >
                Enter the Tournament 
                <ChevronRight className="ml-4 h-8 w-8 transition-transform group-hover:translate-x-2" strokeWidth={3} />
              </Button>
            </div>
          </div>
        </section>

        {/* Step 2: Name Selection Grid */}
        <section id="step-2" className="py-20 md:py-32 border-b-4 border-black relative">
          <div className="absolute top-8 left-0 md:left-[-16px] bg-black text-white px-4 py-1 text-sm md:text-base font-['Space_Mono'] font-bold uppercase tracking-widest shadow-[4px_4px_0_hsl(190,100%,50%)]">
            Step 2
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <h2 className="font-['Syne'] text-4xl md:text-5xl font-black uppercase tracking-tight">
              Select Contenders
            </h2>
            <div className="font-['Space_Mono'] font-bold text-lg md:text-xl bg-[hsl(190,100%,50%)] px-4 py-2 border-4 border-black shadow-[4px_4px_0_black]">
              {selectedNames.size} / {MOCK_NAMES.length} Selected
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {MOCK_NAMES.map((name) => {
              const isSelected = selectedNames.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleName(name)}
                  className={`
                    group relative p-4 md:p-6 text-left border-4 border-black transition-all
                    font-['Space_Mono'] font-bold text-base md:text-lg overflow-hidden
                    ${isSelected 
                      ? 'bg-[hsl(190,100%,50%)] shadow-[6px_6px_0_black] translate-x-[-2px] translate-y-[-2px]' 
                      : 'bg-white hover:bg-gray-100 shadow-[0_0_0_black] hover:shadow-[4px_4px_0_black] hover:translate-x-[-2px] hover:translate-y-[-2px]'
                    }
                  `}
                >
                  <div className="pr-8 break-words">{name}</div>
                  
                  {isSelected && (
                    <div className="absolute top-4 md:top-6 right-4 text-black bg-white rounded-none border-2 border-black w-6 h-6 flex items-center justify-center">
                      <Check className="h-4 w-4 stroke-[4]" />
                    </div>
                  )}
                  {!isSelected && (
                    <div className="absolute top-4 md:top-6 right-4 text-transparent border-2 border-black/20 w-6 h-6 group-hover:border-black/50" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-16 flex flex-col items-center">
            <Button 
              disabled={selectedNames.size < 2}
              onClick={handleStartTournament}
              className={`
                h-auto rounded-none border-4 border-black text-xl md:text-2xl px-12 py-6 transition-all font-black uppercase tracking-wider
                ${selectedNames.size >= 2 
                  ? 'bg-black text-white hover:bg-[hsl(190,100%,50%)] hover:text-black shadow-[8px_8px_0_black] hover:shadow-[2px_2px_0_black] hover:translate-x-[6px] hover:translate-y-[6px]' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 border-gray-400'
                }
              `}
            >
              {isStarted ? 'Initializing...' : 'Start with these'}
            </Button>
            
            <div className="h-6 mt-4">
              {selectedNames.size < 2 && (
                <p className="text-center font-['Space_Mono'] text-sm md:text-base text-black font-bold border-b-2 border-black inline-block">
                  Select at least 2 names to begin
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Secondary Actions - Deliberately Subordinate */}
        <section className="py-16 md:py-24 opacity-50 hover:opacity-100 transition-opacity duration-500 ease-in-out">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button className="flex flex-col items-start p-6 border-2 border-black/40 hover:border-black bg-white text-left transition-all group hover:shadow-[4px_4px_0_black]">
              <div className="bg-black/5 group-hover:bg-[hsl(190,100%,50%)] p-4 rounded-none border-2 border-transparent group-hover:border-black transition-colors mb-4">
                <PenLine className="h-6 w-6 text-black" strokeWidth={2} />
              </div>
              <h3 className="font-['Syne'] font-bold uppercase text-xl text-black/60 group-hover:text-black">Suggest a Name</h3>
              <p className="font-['Space_Mono'] text-sm text-black/50 mt-2 group-hover:text-black/80">Submit your own gothic inspiration to the community pool.</p>
            </button>

            <button className="flex flex-col items-start p-6 border-2 border-black/40 hover:border-black bg-white text-left transition-all group hover:shadow-[4px_4px_0_black]">
              <div className="bg-black/5 group-hover:bg-[hsl(190,100%,50%)] p-4 rounded-none border-2 border-transparent group-hover:border-black transition-colors mb-4">
                <UserIcon className="h-6 w-6 text-black" strokeWidth={2} />
              </div>
              <h3 className="font-['Syne'] font-bold uppercase text-xl text-black/60 group-hover:text-black">Your Profile</h3>
              <p className="font-['Space_Mono'] text-sm text-black/50 mt-2 group-hover:text-black/80">View your naming history and tournament stats.</p>
            </button>
          </div>
        </section>
      </main>

      {/* Tradeoff Label */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 md:p-3 text-center z-50">
        <p className="font-['Space_Mono'] text-[10px] md:text-xs text-black/60 uppercase font-bold tracking-wider">
          Variant A: Hierarchy Clarity <span className="mx-2">|</span> Tradeoff: Prioritizing new-user onboarding over quick-access for returning users.
        </p>
      </div>
    </div>
  );
}
