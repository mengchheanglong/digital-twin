import { AVATAR_TIERS, getAvatarTier } from "@/lib/progression";
import { Lock } from "lucide-react";

export interface ProgressionShowcaseProps {
  currentLevel: number;
}

export function ProgressionShowcase({ currentLevel }: ProgressionShowcaseProps) {
  const currentTier = getAvatarTier(currentLevel);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-bg-card p-6 shadow-card hover:shadow-stripe transition-all duration-300 ease-apple relative overflow-hidden">
        {/* Glow behind */}
        <div className={`absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l ${currentTier.colors} opacity-5 rounded-full blur-[100px] pointer-events-none`} />
        
        <div className="mb-6 relative z-10">
          <h2 className="text-xl font-bold text-white">Path of Progression</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-lg leading-relaxed">Unlock spectacular new avatar visual forms and aesthetics as you level up your digital twin.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
          {AVATAR_TIERS.map((tier) => {
            const unlocked = currentLevel >= tier.level;
            const Icon = tier.icon;
            const isCurrent = currentTier.level === tier.level;

            return (
              <article 
                key={tier.level}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-5 transition-all duration-300 ease-apple group ${
                  unlocked 
                    ? `border-white/10 bg-bg-panel/60 hover:bg-bg-panel hover:border-white/20 hover:scale-[1.02] ${isCurrent ? 'ring-1 ring-accent-primary/40 shadow-glow cursor-default hover:scale-100' : 'cursor-pointer'}` 
                    : 'border-white/5 bg-black/40 opacity-80 backdrop-blur-sm select-none'
                }`}
              >
                {!unlocked && (
                  <div className="absolute top-4 right-4 text-text-muted/60">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                )}
                
                {unlocked && isCurrent && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-accent-primary uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 shadow-sm">
                    Current
                  </div>
                )}

                <div className={`relative mb-3 flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-500 ease-apple ${unlocked ? 'group-hover:scale-110 group-hover:-rotate-6' : ''}`}>
                   <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${tier.colors} opacity-0 transition-opacity duration-300 ease-apple ${unlocked && !isCurrent ? 'group-hover:opacity-100' : ''}`} />
                   
                   <div className={`relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${unlocked ? tier.colors : 'from-bg-panel to-bg-sidebar'} p-[2px] ${unlocked ? tier.glow : ''}`}>
                     <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card backdrop-blur-md">
                       <Icon className={`h-7 w-7 transition-colors duration-300 ease-apple ${unlocked ? `${tier.text} ${tier.animation}` : 'text-text-muted/40'}`} strokeWidth={unlocked ? 2 : 1.5} />
                     </div>
                   </div>
                </div>

                <div className="text-center mt-2">
                  <h3 className={`text-base font-bold transition-colors duration-300 ease-apple ${unlocked ? (isCurrent ? 'text-accent-primary' : 'text-white group-hover:text-accent-glow') : 'text-text-muted'}`}>{tier.name}</h3>
                  <p className={`text-xs font-semibold mt-1 uppercase tracking-wider ${unlocked ? 'text-text-muted' : 'text-text-muted/50'}`}>Unlocks at Lvl {tier.level}</p>
                </div>
              </article>
            );
          })}
        </div>
    </section>
  );
}
