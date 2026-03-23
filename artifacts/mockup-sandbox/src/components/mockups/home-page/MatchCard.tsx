import React, { useState } from "react";
import { Home, Swords, BarChart2, Plus, ArrowRight } from "lucide-react";

export function MatchCard() {
  const [selectedNames, setSelectedNames] = useState<string[]>([
    "Nosferatu",
    "Vladimir",
    "Midnight",
    "Vesper",
  ]);

  const allNames = [
    "Nosferatu",
    "Vladimir",
    "Dracula",
    "Midnight",
    "Luna",
    "Phantom",
    "Shadow",
    "Crimson",
    "Vesper",
    "Salem",
    "Eclipse",
    "Raven",
    "Mortis",
    "Bram",
    "Count",
  ];

  const toggleName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  return (
    <div className="min-h-screen bg-[#080810] text-zinc-100 font-sans pb-32 selection:bg-fuchsia-500/30">
      {/* Top Banner */}
      <div className="w-full border-b border-white/5 bg-black/40">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-center">
          <span className="text-[10px] tracking-[0.2em] font-mono text-zinc-500 uppercase">
            Naming Nosferatu / Tournament Bracket
          </span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-8 flex flex-col gap-12">
        {/* SECTION 1: MAIN EVENT */}
        <section className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Theatrical Header */}
          <div className="w-full flex flex-col items-center mb-8">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent mb-3" />
            <span className="text-xs tracking-[0.3em] font-bold text-fuchsia-400 uppercase mb-2">
              ● Main Event ●
            </span>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-fuchsia-500 text-center mb-3">
              Name The Beast
            </h1>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
          </div>

          {/* Name Grid */}
          <div className="w-full grid grid-cols-3 gap-3 mb-8">
            {allNames.map((name) => {
              const isSelected = selectedNames.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleName(name)}
                  className={`
                    py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-300
                    ${
                      isSelected
                        ? "bg-fuchsia-600/90 text-white shadow-[0_0_15px_rgba(192,38,211,0.5)] border border-fuchsia-400"
                        : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    }
                  `}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <button className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-[1px] transition-all hover:shadow-[0_0_30px_rgba(192,38,211,0.4)]">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center justify-center gap-2 rounded-xl bg-black/50 px-8 py-4 backdrop-blur-sm transition-all group-hover:bg-transparent">
              <span className="text-lg font-black tracking-wider text-white">
                BEGIN THE BRACKET
              </span>
              <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </section>

        {/* Theatrical Divider */}
        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-violet-500/50" />
          <span className="text-violet-500 text-xs">◆</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-violet-500/50" />
        </div>

        {/* SECTION 2: UNDERCARD */}
        <section className="flex flex-col items-center">
          <div className="flex flex-col items-center mb-6 text-center">
            <span className="text-xs tracking-[0.2em] font-mono text-zinc-500 uppercase mb-2">
              — Undercard —
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-400">
              Submit A Contender
            </h2>
          </div>

          <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-2 flex gap-2">
            <input
              type="text"
              placeholder="Enter a legendary name..."
              className="flex-1 bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
            />
            <button className="bg-white/10 hover:bg-white/20 border border-white/5 rounded-lg px-4 py-3 flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5 text-fuchsia-400" />
            </button>
          </div>
        </section>

        {/* Theatrical Divider */}
        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-violet-500/50" />
          <span className="text-violet-500 text-xs">◆</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-violet-500/50" />
        </div>

        {/* SECTION 3: CORNER STATS */}
        <section className="flex flex-col items-center mb-8">
          <div className="flex flex-col items-center mb-6 text-center">
            <span className="text-xs tracking-[0.2em] font-mono text-zinc-500 uppercase mb-2">
              — Corner Stats —
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-400">
              Your Record
            </h2>
          </div>

          <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between divide-x divide-white/10">
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <span className="text-3xl font-black text-zinc-100 tracking-tighter">12</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mt-1">Bouts Fought</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <span className="text-3xl font-black text-fuchsia-400 tracking-tighter">4</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mt-1">Victories</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <span className="text-3xl font-black text-violet-400 tracking-tighter">8</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mt-1">Favorites</span>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Navbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl">
          <button className="text-fuchsia-400 flex flex-col items-center gap-1 transition-colors">
            <Home className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </button>
          <button className="text-zinc-500 hover:text-zinc-300 flex flex-col items-center gap-1 transition-colors">
            <Swords className="h-5 w-5" />
            <span className="sr-only">Tournaments</span>
          </button>
          <button className="text-zinc-500 hover:text-zinc-300 flex flex-col items-center gap-1 transition-colors">
            <BarChart2 className="h-5 w-5" />
            <span className="sr-only">Stats</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchCard;
