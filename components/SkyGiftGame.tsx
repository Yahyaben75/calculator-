import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';
import Controls from './Controls';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 20;
const GIFT_SIZE = 30;
const PLAYER_SPEED = 10;
const GIFT_SPEED = 4;
const GIFT_SPAWN_RATE = 900; // ms

interface SkyGiftGameProps {
  onExit: () => void;
}

interface GameObject {
  id: number;
  x: number;
  y: number;
}

const SkyGiftGame: React.FC<SkyGiftGameProps> = ({ onExit }) => {
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
  const [gifts, setGifts] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  const handleKeyPress = useCallback((key: string) => setKeys(prev => ({ ...prev, [key]: true })), []);
  const handleKeyRelease = useCallback((key: string) => setKeys(prev => ({ ...prev, [key]: false })), []);

  const restartGame = useCallback(() => {
    setPlayerX(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
    setGifts([]);
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setKeys({});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => !e.repeat && handleKeyPress(e.key);
    const handleKeyUp = (e: KeyboardEvent) => handleKeyRelease(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress, handleKeyRelease]);
  
  // Game Loop
  useInterval(() => {
    if (isGameOver) return;
    
    // Move player
    setPlayerX(prevX => {
      if (keys['ArrowLeft']) {
        return Math.max(0, prevX - PLAYER_SPEED);
      }
      if (keys['ArrowRight']) {
        return Math.min(GAME_WIDTH - PLAYER_WIDTH, prevX + PLAYER_SPEED);
      }
      return prevX;
    });

    // Move gifts and check for collisions
    setGifts(currentGifts => currentGifts.map(gift => ({ ...gift, y: gift.y + GIFT_SPEED })).filter(gift => {
      // Check collision with player
      if (
        gift.y + GIFT_SIZE >= GAME_HEIGHT - PLAYER_HEIGHT &&
        gift.y < GAME_HEIGHT && // ensure it's not already past
        gift.x < playerX + PLAYER_WIDTH &&
        gift.x + GIFT_SIZE > playerX
      ) {
        setScore(s => s + 10);
        return false; // Remove gift
      }
      
      // Check if gift is off-screen
      if (gift.y >= GAME_HEIGHT) {
        setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
                setIsGameOver(true);
            }
            return newLives;
        });
        return false; // Remove gift
      }

      return true;
    }));

  }, !isGameOver ? 33 : null);
  
  // Gift Spawner
  useInterval(() => {
    if (isGameOver) return;
    setGifts(g => [
      ...g,
      {
        id: Date.now(),
        x: Math.random() * (GAME_WIDTH - GIFT_SIZE),
        y: -GIFT_SIZE,
      },
    ]);
  }, !isGameOver ? GIFT_SPAWN_RATE : null);

  return (
    <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-blue-500/10 border border-slate-700">
      <div className="flex justify-between items-center mb-2 px-2 text-blue-300">
        <span className="font-bold">Score: {score}</span>
        <span className="font-bold text-lg">{'❤️'.repeat(Math.max(0, lives))}</span>
        <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
      </div>
      <div
        ref={viewportRef}
        className="relative overflow-hidden mx-auto border-2 border-slate-600"
        style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}` }}
      >
        <div
          className="bg-gray-900"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {isGameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-10">
              <h2 className="text-4xl font-bold text-red-500">Game Over</h2>
              <p className="text-xl mt-2">Your Score: {score}</p>
              <button
                onClick={restartGame}
                className="mt-6 bg-blue-500 hover:bg-blue-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          )}
          <div 
              className="absolute bg-cyan-400 rounded-t-md border-b-4 border-cyan-600"
              style={{ 
                  left: playerX,
                  bottom: 0,
                  width: PLAYER_WIDTH,
                  height: PLAYER_HEIGHT,
              }}
          />
          {gifts.map(gift => (
              <div
                  key={gift.id}
                  className="absolute text-2xl"
                  style={{
                      left: gift.x,
                      top: gift.y,
                      width: GIFT_SIZE,
                      height: GIFT_SIZE,
                  }}
                  aria-hidden="true"
              >
                  🎁
              </div>
          ))}
        </div>
      </div>
      <Controls onKeyPress={handleKeyPress} onKeyRelease={handleKeyRelease} />
    </div>
  );
};

export default SkyGiftGame;