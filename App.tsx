import React, { useState, useCallback, useEffect } from 'react';
import Calculator from './components/Calculator';
import SnakeGame from './components/SnakeGame';
import SkyGiftGame from './components/SkyGiftGame';
import DangerGame from './components/DangerGame';
import RacingGame from './components/RacingGame';
import PlatformerGame from './components/PlatformerGame';
import ShooterGame from './components/ShooterGame';
import KeepUpGame from './components/KeepUpGame';
import DotRunnerGame from './components/DotRunnerGame';

type Game = 'none' | 'snake' | 'sky' | 'danger' | 'racing' | 'platformer' | 'shooter' | 'keepup' | 'dotrunner';

const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<Game>('none');
  const [isGlitchGloballyFixed, setIsGlitchGloballyFixed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('platformer_glitchFixed') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const handleGlitchFixed = () => {
      setIsGlitchGloballyFixed(true);
    };
    // Listen for the custom event dispatched by the platformer game
    window.addEventListener('glitchFixed', handleGlitchFixed);
    // Also handle storage events in case the tab is duplicated
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'platformer_glitchFixed' && e.newValue === 'true') {
            setIsGlitchGloballyFixed(true);
        }
    }
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('glitchFixed', handleGlitchFixed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleActivateGame = useCallback((game: string) => {
    setActiveGame(game as Game);
  }, []);

  const handleExitGame = useCallback(() => {
    setActiveGame('none');
  }, []);

  const renderGame = () => {
    switch (activeGame) {
      case 'snake':
        return <SnakeGame onExit={handleExitGame} />;
      case 'sky':
        return <SkyGiftGame onExit={handleExitGame} />;
      case 'danger':
        return <DangerGame onExit={handleExitGame} />;
      case 'racing':
        return <RacingGame onExit={handleExitGame} />;
      case 'platformer':
        return <PlatformerGame onExit={handleExitGame} />;
      case 'shooter':
        return <ShooterGame onExit={handleExitGame} />;
      case 'keepup':
        return <KeepUpGame onExit={handleExitGame} />;
      case 'dotrunner':
        return <DotRunnerGame onExit={handleExitGame} />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeGame) {
      case 'snake': return 'Snake Game';
      case 'sky': return 'Sky Gift';
      case 'danger': return 'Danger Zone';
      case 'racing': return 'Asphalt Fury';
      case 'platformer': return 'Pixel Adventure';
      case 'shooter': return 'Neon Shield';
      case 'keepup': return 'Balloon Keep Up';
      case 'dotrunner': return 'Dot Runner';
      default: return 'Calculator';
    }
  };
  
  const getSubtitle = () => {
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    switch (activeGame) {
      case 'snake': return isMobile ? 'Use On-Screen Controls' : 'Use Arrow Keys to Move';
      case 'sky': return isMobile ? 'Use On-Screen Controls' : 'Use Arrow Keys to Catch Gifts!';
      case 'danger': return isMobile ? 'Use On-Screen Controls' : 'Use Arrow Keys to Dodge!';
      case 'racing': return isMobile ? 'Use On-Screen Controls' : 'Use Arrow Keys to Steer!';
      case 'platformer': return isMobile ? 'Use On-Screen Controls' : 'Arrows to Move, Up to Jump!';
      case 'shooter': return isMobile ? 'Touch to Aim & Shoot' : 'Mouse to Aim, Click to Shoot';
      case 'keepup': return 'Move the paddle to keep the balloon up!';
      case 'dotrunner': return isMobile ? 'Use On-Screen Controls' : 'Use Arrow Keys to Move, Avoid the Shadow!';
      default: return 'A normal calculator... or is it?';
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-slate-800 font-mono overflow-hidden touch-none">
      <div className="w-full max-w-md mx-auto mb-8" style={{ perspective: '1000px' }}>
        <h1 className={`text-3xl font-bold text-center text-cyan-400 mb-2 ${activeGame === 'none' && !isGlitchGloballyFixed ? 'glitch-text' : ''}`}>
          {getTitle()}
        </h1>
        <p className="text-center text-gray-400 mb-6 px-4">
          {getSubtitle()}
        </p>
        
        {/* Responsive Flip Card Container using CSS Grid */}
        <div className={`transition-transform duration-700 [transform-style:preserve-3d] grid place-items-center w-full ${activeGame !== 'none' ? '[transform:rotateY(180deg)]' : ''}`}>
            
            {/* Front Face (Calculator) */}
            <div className="[grid-area:1/1] w-full [backface-visibility:hidden]">
              <Calculator onActivateGame={handleActivateGame} />
            </div>
            
            {/* Back Face (Games) */}
            <div className="[grid-area:1/1] w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="relative w-full">
                {activeGame !== 'none' && renderGame()}
              </div>
            </div>

        </div>
      </div>
      
      <footer className="text-center text-gray-500 mt-auto pb-4 text-sm w-full absolute bottom-0 pointer-events-none">
        THIS APP BY YAHYA BENMOUSSA🇲🇦
      </footer>
    </div>
  );
};

export default App;