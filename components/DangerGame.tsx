import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';
import Controls from './Controls';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const PLAYER_SIZE = 20;
const OBSTACLE_SIZE = 25;
const PLAYER_SPEED = 8;
const OBSTACLE_SPAWN_RATE = 450; // ms

interface DangerGameProps {
  onExit: () => void;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const DangerGame: React.FC<DangerGameProps> = ({ onExit }) => {
  const [player, setPlayer] = useState({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [time, setTime] = useState(0);
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
    setPlayer({ x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2 });
    setObstacles([]);
    setTime(0);
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
  
  const movePlayer = useCallback(() => {
    if (isGameOver) return;
    setPlayer(p => {
        let {x, y} = p;
        if(keys['ArrowUp'] || keys['w']) y -= PLAYER_SPEED;
        if(keys['ArrowDown'] || keys['s']) y += PLAYER_SPEED;
        if(keys['ArrowLeft'] || keys['a']) x -= PLAYER_SPEED;
        if(keys['ArrowRight'] || keys['d']) x += PLAYER_SPEED;

        x = Math.max(0, Math.min(x, GAME_WIDTH - PLAYER_SIZE));
        y = Math.max(0, Math.min(y, GAME_HEIGHT - PLAYER_SIZE));

        return {x, y};
    });
  }, [keys, isGameOver]);
  
  // Main Game Loop
  useInterval(() => {
    if (isGameOver) return;
    
    movePlayer();
    setTime(t => t + 1);

    const newObstacles = obstacles.map(o => ({
        ...o,
        x: o.x + o.vx,
        y: o.y + o.vy,
    })).filter(o => o.x > -OBSTACLE_SIZE && o.x < GAME_WIDTH + OBSTACLE_SIZE && o.y > -OBSTACLE_SIZE && o.y < GAME_HEIGHT + OBSTACLE_SIZE);

    for(const obstacle of newObstacles) {
        if (
            player.x < obstacle.x + OBSTACLE_SIZE &&
            player.x + PLAYER_SIZE > obstacle.x &&
            player.y < obstacle.y + OBSTACLE_SIZE &&
            player.y + PLAYER_SIZE > obstacle.y
        ) {
            setIsGameOver(true);
            break;
        }
    }

    setObstacles(newObstacles);

  }, !isGameOver ? 20 : null);
  
  // Obstacle Spawner
  useInterval(() => {
    if (isGameOver) return;
    
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = 1.5 + Math.random() * 2.5;

    switch(edge) {
        case 0: // top
            x = Math.random() * GAME_WIDTH; y = -OBSTACLE_SIZE;
            vx = Math.random() * 4 - 2; vy = speed;
            break;
        case 1: // right
            x = GAME_WIDTH; y = Math.random() * GAME_HEIGHT;
            vx = -speed; vy = Math.random() * 4 - 2;
            break;
        case 2: // bottom
            x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT;
            vx = Math.random() * 4 - 2; vy = -speed;
            break;
        default: // left
            x = -OBSTACLE_SIZE; y = Math.random() * GAME_HEIGHT;
            vx = speed; vy = Math.random() * 4 - 2;
            break;
    }

    setObstacles(o => [...o, { id: Date.now(), x, y, vx, vy }]);

  }, !isGameOver ? OBSTACLE_SPAWN_RATE : null);
  const score = (time * 20 / 1000).toFixed(2);

  return (
    <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-red-500/10 border border-slate-700">
      <div className="flex justify-between items-center mb-2 px-2 text-red-300">
        <span className="font-bold">Time: {score}s</span>
        <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
      </div>
       <div
        ref={viewportRef}
        className="relative overflow-hidden mx-auto border-2 border-slate-600"
        style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}` }}
      >
        <div
          className="bg-black"
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
              <h2 className="text-4xl font-bold text-red-500">GAME OVER</h2>
              <p className="text-xl mt-2">You survived for {score} seconds.</p>
              <button
                onClick={restartGame}
                className="mt-6 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          <div 
              className="absolute bg-white"
              style={{ 
                  left: player.x,
                  top: player.y,
                  width: PLAYER_SIZE,
                  height: PLAYER_SIZE,
              }}
          />
          {obstacles.map(o => (
              <div
                  key={o.id}
                  className="absolute bg-red-500"
                  style={{
                      left: o.x,
                      top: o.y,
                      width: OBSTACLE_SIZE,
                      height: OBSTACLE_SIZE,
                      transform: 'rotate(45deg)',
                  }}
              />
          ))}
        </div>
      </div>
      <Controls onKeyPress={handleKeyPress} onKeyRelease={handleKeyRelease} />
    </div>
  );
};

export default DangerGame;