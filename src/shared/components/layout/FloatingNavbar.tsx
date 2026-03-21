/**
 * @module FloatingNavbar
 * @description Simplified navigation for tournament completion flow only
 */

import { motion } from "framer-motion";
import type { ElementType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/basic";
import { CheckCircle, Trophy } from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";
import { getGlassPreset } from "./GlassPresets";
import LiquidGlass from "./LiquidGlass";

function FloatingNavItem({
  icon: Icon,
  label,
  isAccent = false,
  onClick,
  className,
}: {
  icon: ElementType;
  label: string;
  isAccent?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
        isAccent
          ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
          : "bg-foreground/10 text-foreground/80 hover:bg-foreground/20",
        className,
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </motion.button>
  );
}

export function FloatingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tournament, tournamentActions } = useAppStore();
  const { selectedNames } = tournament;

  const isHomeRoute = location.pathname === "/";
  const isTournamentRoute = location.pathname === "/tournament";
  const isAnalysisRoute = location.pathname === "/analysis";

  const selectedCount = selectedNames?.length || 0;
  const isTournamentActive = Boolean(tournament.names);
  const isComplete = tournament.isComplete;

  // Only show on home page when tournament is not active
  if (!isHomeRoute || isTournamentActive) {
    return null;
  }

  const handleStartTournament = () => {
    if (selectedNames && selectedNames.length >= 2) {
      tournamentActions.setNames(selectedNames);
      navigate("/tournament");
    }
  };

  const handleViewResults = () => {
    navigate("/analysis");
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <LiquidGlass
        {...getGlassPreset("navbar")}
        className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border border-border/30 shadow-2xl"
      >
        {!isComplete && selectedCount >= 2 && (
          <FloatingNavItem
            icon={Trophy}
            label={`Start Tournament (${selectedCount})`}
            isAccent={true}
            onClick={handleStartTournament}
          />
        )}

        {isComplete && (
          <FloatingNavItem
            icon={CheckCircle}
            label="View Results"
            isAccent={true}
            onClick={handleViewResults}
          />
        )}

        {selectedCount < 2 && (
          <div className="text-sm text-foreground/60 px-2">
            Select {2 - selectedCount} more names to start
          </div>
        )}
      </LiquidGlass>
    </motion.div>
  );
}
