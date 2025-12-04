
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';

// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const BALLOON_RADIUS = 25;
const GRAVITY_START = 0.1;
const HIT_FORCE = -5;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 10;
const PADDLE_Y_POS = GAME_HEIGHT - 40;
// Score thresholds for difficulty/visual change
const YELLOW_MODE_SCORE = 20;
const BLUE_MODE_SCORE = 40;
const BLACK_MODE_SCORE = 60;


interface KeepUpGameProps {
  onExit: () => void;
}

let audioContext: AudioContext | null = null;
const getAudioContext = () => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch(e) {
            console.error("AudioContext not supported", e);
        }
    }
    return audioContext;
}

const playHitSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        oscillator.start(context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        oscillator.stop(context.currentTime + 0.1);
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const playTransformSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, context.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, context.currentTime);
        oscillator.start(context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
        oscillator.stop(context.currentTime + 0.4);
    } catch(e) {
        console.error("Could not play transform sound", e);
    }
}

const playWallHitSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, context.currentTime);
        gainNode.gain.setValueAtTime(0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.1);
    } catch (e) {
        console.error("Could not play wall hit sound", e);
    }
};

const playGameOverSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, context.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    } catch (e) {
        console.error("Could not play game over sound", e);
    }
};


const createInitialState = () => ({
  balloon: {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 3,
    vx: (Math.random() - 0.5) * 2,
    vy: 0,
  },
  paddleX: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
  score: 0,
  isGameOver: false,
  gravity: GRAVITY_START,
  flashTimer: 0,
  shockwave: { active: false, size: 0, opacity: 1 },
});

const KeepUpGame: React.FC<KeepUpGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState(createInitialState());
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const coinsAwardedRef = useRef(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      if (viewport) {
        const newScale = viewport.offsetWidth / GAME_WIDTH;
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    updateScale(); // Initial scale

    return () => observer.disconnect();
  }, []);

  const restartGame = useCallback(() => {
    coinsAwardedRef.current = false;
    setGameState(createInitialState());
  }, []);

  // Award Coins AND Save High Score on Game Over
  useEffect(() => {
    if (gameState.isGameOver && !coinsAwardedRef.current) {
        coinsAwardedRef.current = true;
        // Coins
        const currentCoins = parseInt(localStorage.getItem('platformer_totalCoins') || '0', 10);
        localStorage.setItem('platformer_totalCoins', (currentCoins + gameState.score).toString());

        // High Score
        const currentBest = parseInt(localStorage.getItem('keepup_best') || '0', 10);
        if (gameState.score > currentBest) {
            localStorage.setItem('keepup_best', gameState.score.toString());
        }
    }
  }, [gameState.isGameOver, gameState.score]);

  const handlePointerMove = useCallback((clientX: number) => {
    if (gameState.isGameOver || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const gameX = (clientX - rect.left) / scale;
    
    setGameState(prev => ({
      ...prev,
      paddleX: Math.max(0, Math.min(gameX - PADDLE_WIDTH / 2, GAME_WIDTH - PADDLE_WIDTH)),
    }));

  }, [gameState.isGameOver, scale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX);
    };

    viewport.addEventListener('mousemove', onMouseMove);
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
        viewport.removeEventListener('mousemove', onMouseMove);
        viewport.removeEventListener('touchmove', onTouchMove);
    };
  }, [handlePointerMove]);


  const gameLoop = useCallback(() => {
    setGameState(prev => {
      if (prev.isGameOver) return prev;

      let { balloon, paddleX, score, gravity, flashTimer, shockwave } = prev;

      // Update animations
      if (flashTimer > 0) flashTimer -= 1;
      if (shockwave.active) {
        shockwave.size += 30;
        shockwave.opacity -= 0.05;
        if (shockwave.opacity <= 0) {
            shockwave = { ...shockwave, active: false };
        }
      }

      // Apply physics
      balloon.vy += gravity;
      balloon.y += balloon.vy;
      balloon.x += balloon.vx;

      // Wall collisions
      if (balloon.x < BALLOON_RADIUS || balloon.x > GAME_WIDTH - BALLOON_RADIUS) {
        playWallHitSound();
        balloon.vx *= -0.95;
        balloon.x = Math.max(BALLOON_RADIUS, Math.min(balloon.x, GAME_WIDTH - BALLOON_RADIUS));
      }
      if (balloon.y < BALLOON_RADIUS) {
        playWallHitSound();
        balloon.vy *= -0.9;
        balloon.y = BALLOON_RADIUS;
      }
      
      const hitPaddle =
        balloon.vy > 0 &&
        balloon.y + BALLOON_RADIUS >= PADDLE_Y_POS &&
        balloon.y - BALLOON_RADIUS < PADDLE_Y_POS + PADDLE_HEIGHT &&
        balloon.x + BALLOON_RADIUS > paddleX &&
        balloon.x - BALLOON_RADIUS < paddleX + PADDLE_WIDTH;

      if (hitPaddle) {
        playHitSound();
        const newScore = score + 1;
        
        let newGravity = Math.min(0.4, gravity + 0.002);
        let newFlashTimer = flashTimer;
        let newShockwave = shockwave;
        let forceMultiplier = 1;
        let vxMultiplier = 5;
        
        // Trigger one-time animation on reaching a score threshold
        if (newScore === YELLOW_MODE_SCORE || newScore === BLUE_MODE_SCORE || newScore === BLACK_MODE_SCORE) {
            playTransformSound();
            newFlashTimer = 15;
            newShockwave = { active: true, size: 0, opacity: 1 };
        }

        // Set difficulty parameters based on the current score tier
        if (newScore >= BLACK_MODE_SCORE) {
            forceMultiplier = 1.3;
            vxMultiplier = 6.5;
            newGravity = Math.max(newGravity, 0.3);
        } else if (newScore >= BLUE_MODE_SCORE) {
            forceMultiplier = 1.2;
            vxMultiplier = 6;
            newGravity = Math.max(newGravity, 0.25);
        } else if (newScore >= YELLOW_MODE_SCORE) {
            forceMultiplier = 1.1;
            vxMultiplier = 5.5;
            newGravity = Math.max(newGravity, 0.2);
        }

        const paddleCenter = paddleX + PADDLE_WIDTH / 2;
        const hitPosition = (balloon.x - paddleCenter) / (PADDLE_WIDTH / 2); // -1 to 1
        const newVx = hitPosition * vxMultiplier;

        return {
          ...prev,
          balloon: {
            ...balloon,
            y: PADDLE_Y_POS - BALLOON_RADIUS,
            vy: (HIT_FORCE + Math.random() * -1) * forceMultiplier,
            vx: newVx,
          },
          score: newScore,
          gravity: newGravity,
          flashTimer: newFlashTimer,
          shockwave: newShockwave,
        };
      }
      
      // Game Over check
      if (balloon.y > GAME_HEIGHT) {
        playGameOverSound();
        return { ...prev, isGameOver: true };
      }

      return { ...prev, balloon, flashTimer, shockwave };
    });
  }, []);

  useInterval(gameLoop, !gameState.isGameOver ? 16 : null);

  const { score, isGameOver, balloon, paddleX, flashTimer, shockwave } = gameState;
  
  const gameMode = (() => {
    if (score >= BLACK_MODE_SCORE) return 'black';
    if (score >= BLUE_MODE_SCORE) return 'blue';
    if (score >= YELLOW_MODE_SCORE) return 'yellow';
    return 'red';
  })();

  const modeStyles = {
    red: {
      background: 'radial-gradient(circle at 30% 30%, #ff8a80, #f44336)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
      tieColor: '#c62828',
    },
    yellow: {
      background: 'radial-gradient(circle at 30% 30%, #ffee58, #fbc02d)',
      boxShadow: '0 5px 20px rgba(251, 192, 45, 0.4)',
      tieColor: '#f57f17',
    },
    blue: {
      background: 'radial-gradient(circle at 30% 30%, #4fc3f7, #039be5)',
      boxShadow: '0 5px 20px rgba(3, 155, 229, 0.4)',
      tieColor: '#01579b',
    },
    black: {
      background: 'radial-gradient(circle at 30% 30%, #424242, #111)',
      boxShadow: '0 5px 20px rgba(255,255,255,0.4)',
      tieColor: '#000',
    },
  };

  const currentStyle = modeStyles[gameMode];

  const balloonStyle: React.CSSProperties = { 
    left: balloon.x - BALLOON_RADIUS, 
    top: balloon.y - BALLOON_RADIUS, 
    width: BALLOON_RADIUS * 2, 
    height: BALLOON_RADIUS * 2,
    background: currentStyle.background,
    boxShadow: currentStyle.boxShadow,
    transition: 'background 0.5s ease-in-out'
  };

  return (
    <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-orange-500/10 border border-slate-700 relative">
      <div className="flex justify-between items-center mb-2 px-2 text-orange-300">
        <span className="font-bold">Score: {score}</span>
        <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
      </div>
      <div
        ref={viewportRef}
        className="relative overflow-hidden mx-auto border-2 border-slate-600 cursor-none"
        style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `1 / 1` }}
      >
        <div
          className="bg-sky-800"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: GAME_WIDTH, height: GAME_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {isGameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20">
              <h2 className="text-4xl font-bold text-red-500">Game Over</h2>
              <p className="text-xl mt-2">Your Score: {score}</p>
              <p className="text-lg text-yellow-400 mt-1">+ {score} Coins Earned!</p>
              <button
                onClick={restartGame}
                className="mt-6 bg-orange-500 hover:bg-orange-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Flash and Shockwave animations */}
          {flashTimer > 0 && (
            <div 
                className="absolute inset-0 bg-white z-20"
                style={{ opacity: flashTimer / 15 }} 
            />
          )}
          {shockwave.active && (
            <div
                className="absolute rounded-full border-4 border-white z-10"
                style={{
                    left: balloon.x,
                    top: balloon.y,
                    width: shockwave.size,
                    height: shockwave.size,
                    opacity: shockwave.opacity,
                    transform: 'translate(-50%, -50%)',
                }}
            />
          )}

          {/* Paddle */}
          <div
            aria-hidden="true"
            className="absolute bg-cyan-400 rounded"
            style={{
              left: paddleX,
              top: PADDLE_Y_POS,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
              boxShadow: '0 0 10px #67e8f9',
            }}
          />

          {/* Balloon */}
          <div 
            aria-hidden="true"
            className="absolute rounded-full"
            style={balloonStyle}
          >
             {/* Balloon tie */}
             <div className="absolute" style={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `8px solid ${currentStyle.tieColor}`,
                bottom: -5,
                left: '50%',
                transform: 'translateX(-50%)',
             }} />
          </div>

          {/* Ground */}
          <div className="absolute bottom-0 left-0 w-full h-2 bg-green-600" />
        </div>
      </div>
    </div>
  );
};

export default KeepUpGame;
