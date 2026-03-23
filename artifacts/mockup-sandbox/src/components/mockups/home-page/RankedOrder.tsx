import React, { useState } from "react";
import { Search, Send, Trophy, Home, BarChart3, User, ChevronRight, Play } from "lucide-react";

export function RankedOrder() {
  const allNames = [
    "Nosferatu", "Vladimir", "Dracula", "Midnight", 
    "Luna", "Phantom", "Shadow", "Crimson", 
    "Vesper", "Salem", "Eclipse", "Raven"
  ];

  const [selectedNames, setSelectedNames] = useState<Set<string>>(
    new Set(["Nosferatu", "Midnight", "Vesper"])
  );

  const toggleName = (name: string) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedNames(newSelected);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans pb-32 selection:bg-fuchsia-500/30">
      
      {/* SECTION 1: HERO (Name Picker) */}
      <section className="px-6 pt-16 pb-12 flex flex-col items-center text-center max-w-3xl mx-auto">
        <div className="space-y-4 mb-10 w-full">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400 font-medium">
            The Tournament Floor
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter bg-gradient-to-br from-purple-400 to-fuchsia-500 bg-clip-text text-transparent leading-none drop-shadow-sm">
            Nominate Your Contenders
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Select the names you want to enter into the bracket. The ultimate champion awaits.
          </p>
        </div>

        {/* Name Grid */}
        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
          {allNames.map((name) => {
            const isSelected = selectedNames.has(name);
            return (
              <button
                key={name}
                onClick={() => toggleName(name)}
                className={`
                  relative overflow-hidden group px-4 py-3 rounded-full text-sm font-medium transition-all duration-300
                  ${isSelected 
                    ? "bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-100 shadow-[0_0_15px_rgba(217,70,239,0.15)]" 
                    : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  }
                  border backdrop-blur-sm
                `}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 opacity-50" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Big CTA */}
        <button className="group relative w-full md:w-auto overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]">
          <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
          <div className="relative bg-zinc-950/50 backdrop-blur-md rounded-full px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-transparent">
            <span className="font-bold text-white tracking-wide">BEGIN THE TOURNAMENT</span>
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </section>

      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-12 pb-12">
        {/* SECTION 2: SUGGEST A NAME (Secondary) */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 text-xs font-mono text-zinc-400 shrink-0">
              02
            </div>
            <div className="h-px bg-white/10 flex-grow"></div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-tight bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
              Suggest A Name
            </h2>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-5 flex flex-col gap-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Have a brilliant name that isn't on the board? Submit it for consideration.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Enter cat name..." 
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
                  />
                  <Search className="w-4 h-4 text-zinc-600 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <button className="bg-white/10 hover:bg-white/20 border border-white/5 transition-colors rounded-lg p-2.5 shrink-0 flex items-center justify-center group">
                  <Send className="w-4 h-4 text-zinc-300 group-hover:text-white group-hover:scale-110 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: YOUR PROFILE (Tertiary) */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 text-xs font-mono text-zinc-400 shrink-0">
              03
            </div>
            <div className="h-px bg-white/10 flex-grow"></div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-tight bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
              Your Profile
            </h2>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-5 flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <User className="w-8 h-8 text-fuchsia-300" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-zinc-100 font-bold tracking-tight text-lg">CatLover99</h3>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-zinc-300">3 Wins</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">2 Losses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FLOATING NAVBAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/15 rounded-full px-6 py-3 flex items-center gap-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <button className="flex flex-col items-center gap-1 text-fuchsia-400 transition-colors group">
            <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors group">
            <Play className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium">Play</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors group">
            <BarChart3 className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium">Stats</span>
          </button>
        </div>
      </div>
    </div>
  );
}
