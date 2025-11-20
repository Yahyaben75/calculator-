import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';
import Controls from './Controls';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const PLAYER_CAR_WIDTH = 40;
const PLAYER_CAR_HEIGHT = 70;
const OPPONENT_CAR_WIDTH = 40;
const OPPONENT_CAR_HEIGHT = 70;
const ROAD_LINE_WIDTH = 10;
const ROAD_LINE_HEIGHT = 50;
const BOSS_FIGHT_SCORE_TRIGGER = 1250; // Approx 20 seconds at 60fps

const LANES = [
  (GAME_WIDTH / 6) - (PLAYER_CAR_WIDTH / 2),
  (GAME_WIDTH / 2) - (PLAYER_CAR_WIDTH / 2),
  (GAME_WIDTH * 5 / 6) - (PLAYER_CAR_WIDTH / 2),
];

// New types for the boss battle
type GameMode = 'normal' | 'bossFight';

interface Tank {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  vx: number; // horizontal velocity
  shootCooldown: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Explosion {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number; // in frames
}

interface RacingGameProps {
  onExit: () => void;
}

interface Car {
  id: number;
  x: number;
  y: number;
  color: string;
  speed: number;
}

interface RoadLine {
    id: number;
    y: number;
}

const OPPONENT_COLORS = ['#ef4444', '#f97316', '#84cc16', '#22c55e', '#06b6d4', '#8b5cf6'];

const createInitialState = () => ({
  playerLane: 1, // 0, 1, 2
  opponents: [] as Car[],
  roadLines: [] as RoadLine[],
  score: 0,
  gameSpeed: 5,
  isGameOver: false,
  lives: 3,
  invincibilityTimer: 0,
  // New state for boss battle
  gameMode: 'normal' as GameMode,
  tank: null as Tank | null,
  playerProjectiles: [] as Projectile[],
  shootCooldown: 0,
  explosions: [] as Explosion[],
  showBossWarning: false,
});


// Player Car component
const PlayerCar = ({ score, style, isInvincible }: { score: number; style: React.CSSProperties, isInvincible: boolean }) => {
  const SCORE_FOR_CAR_CHANGE = 625; // Approx 10 seconds
  const isUpgraded = score >= SCORE_FOR_CAR_CHANGE;
  const invincibilityClass = isInvincible ? 'animate-pulse' : '';

  if (isUpgraded) {
    // Supercar (Ferrari-like)
    return (
      <div style={style} className={`absolute transition-all duration-100 ease-out ${invincibilityClass}`}>
        <div className="relative w-full h-full bg-red-600 rounded-lg shadow-lg border-2 border-red-800" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}>
          {/* Cabin */}
          <div className="absolute bg-black bg-opacity-70 rounded-md" style={{ width: '45%', height: '50%', top: '30%', left: '27.5%', border: '1px solid #444' }} />
          {/* Headlights */}
          <div className="absolute bg-yellow-300" style={{ width: '8%', height: '4%', top: '5%', left: '25%', transform: 'rotate(-15deg)' }} />
          <div className="absolute bg-yellow-300" style={{ width: '8%', height: '4%', top: '5%', right: '25%', transform: 'rotate(15deg)' }} />
          {/* Spoiler */}
          <div className="absolute bg-gray-800" style={{ width: '60%', height: '8%', bottom: '5%', left: '20%', borderRadius: '2px' }} />
        </div>
      </div>
    );
  }

  // Normal Car (Sedan-like)
  return (
    <div style={style} className={`absolute transition-all duration-100 ease-out ${invincibilityClass}`}>
        <div className="relative w-full h-full bg-blue-500 rounded-md shadow-md border-2 border-blue-700">
            {/* Cabin */}
            <div className="absolute bg-blue-300 bg-opacity-80 rounded" style={{ width: '60%', height: '55%', top: '20%', left: '20%', border: '1px solid #60a5fa' }} />
             {/* Headlights */}
            <div className="absolute bg-yellow-200 rounded-full" style={{ width: '10%', height: '5%', top: '8%', left: '20%' }} />
            <div className="absolute bg-yellow-200 rounded-full" style={{ width: '10%', height: '5%', top: '8%', right: '20%' }} />
             {/* Taillights */}
             <div className="absolute bg-red-400" style={{ width: '8%', height: '4%', bottom: '5%', left: '15%' }} />
             <div className="absolute bg-red-400" style={{ width: '8%', height: '4%', bottom: '5%', right: '15%' }} />
        </div>
    </div>
  );
};

// Opponent Car component
// FIX: Explicitly type as a React Function Component (`React.FC`) to ensure TypeScript correctly handles React's special `key` prop when this component is rendered in a list.
const OpponentCar: React.FC<{ car: Car }> = ({ car }) => {
    return (
        <div
            className="absolute rounded-md"
            style={{
                left: car.x,
                top: car.y,
                width: OPPONENT_CAR_WIDTH,
                height: OPPONENT_CAR_HEIGHT,
                backgroundColor: car.color,
                border: `2px solid rgba(0,0,0,0.3)`
            }}
        >
            {/* Cabin */}
            <div className="absolute bg-black bg-opacity-40 rounded-sm" style={{ width: '60%', height: '50%', top: '20%', left: '20%' }} />
        </div>
    );
};

// Tank component
const TankComponent = ({ tank }: { tank: Tank }) => (
    <div className="absolute" style={{ left: tank.x, top: tank.y, width: tank.width, height: tank.height }}>
        <div className="w-full h-full bg-emerald-800 rounded-md border-2 border-emerald-900 shadow-lg">
            {/* Turret */}
            <div className="absolute bg-emerald-700 w-1/2 h-1/2 top-1/4 left-1/4 rounded-full" />
            {/* Barrel */}
            <div className="absolute bg-gray-600" style={{ left: '50%', top: '50%', width: 10, height: 40, transform: 'translateX(-50%)' }} />
        </div>
    </div>
);

// Projectile component
// FIX: Explicitly type as a React Function Component (`React.FC`) to ensure TypeScript correctly handles React's special `key` prop when this component is rendered in a list.
const ProjectileComponent: React.FC<{ projectile: Projectile }> = ({ projectile }) => (
    <div className="absolute bg-yellow-400 rounded-full" style={{ left: projectile.x, top: projectile.y, width: projectile.width, height: projectile.height, boxShadow: '0 0 8px #facc15' }} />
);

// Explosion component (CSS animation)
// FIX: Explicitly type as a React Function Component (`React.FC`) to ensure TypeScript correctly handles React's special `key` prop when this component is rendered in a list.
const ExplosionComponent: React.FC<{ explosion: Explosion }> = ({ explosion }) => (
    <div className="absolute" style={{ left: explosion.x, top: explosion.y, transform: 'translate(-50%, -50%)' }}>
        <div className="absolute rounded-full bg-orange-500 animate-ping" style={{ width: explosion.size, height: explosion.size }} />
        <div className="absolute rounded-full bg-yellow-400 animate-ping" style={{ width: explosion.size * 0.7, height: explosion.size * 0.7, animationDelay: '50ms' }} />
    </div>
);

const TankHealthBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 bg-gray-600 rounded-full h-4 border-2 border-gray-800">
        <div className="bg-red-600 h-full rounded-full transition-all duration-200" style={{ width: `${(hp / maxHp) * 100}%` }} />
    </div>
);

const RacingGame: React.FC<RacingGameProps> = ({ onExit }) => {
    const [gameState, setGameState] = useState(createInitialState());
    const laneChangeBuffer = useRef<'left' | 'right' | null>(null);
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
        updateScale();

        return () => observer.disconnect();
    }, []);

    const restartGame = useCallback(() => {
        laneChangeBuffer.current = null;
        setGameState(createInitialState());
    }, []);

    const handleKeyPress = useCallback((key: string) => {
        if (gameState.isGameOver) return;
        if (key === 'ArrowLeft') {
            laneChangeBuffer.current = 'left';
        } else if (key === 'ArrowRight') {
            laneChangeBuffer.current = 'right';
        } else if (key === 'ArrowUp' && gameState.gameMode === 'bossFight' && gameState.shootCooldown <= 0) {
            setGameState(prev => {
                const playerX = LANES[prev.playerLane];
                return {
                    ...prev,
                    shootCooldown: 20, // Cooldown of 20 frames
                    playerProjectiles: [...prev.playerProjectiles, {
                        id: Date.now(),
                        x: playerX + PLAYER_CAR_WIDTH / 2 - 5,
                        y: GAME_HEIGHT - PLAYER_CAR_HEIGHT - 20,
                        width: 10,
                        height: 20,
                    }]
                };
            });
        }
    }, [gameState.isGameOver, gameState.gameMode, gameState.shootCooldown]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => !e.repeat && handleKeyPress(e.key);
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const gameLoop = () => {
        if (gameState.isGameOver) return;

        setGameState(prev => {
            let newLane = prev.playerLane;
            const bufferedChange = laneChangeBuffer.current;
            if (bufferedChange === 'left') newLane = Math.max(0, prev.playerLane - 1);
            else if (bufferedChange === 'right') newLane = Math.min(2, prev.playerLane + 1);
            if (bufferedChange) laneChangeBuffer.current = null;
            
            const playerX = LANES[newLane];
            const playerY = GAME_HEIGHT - PLAYER_CAR_HEIGHT - 20;

            const newScore = prev.gameMode === 'normal' ? prev.score + 1 : prev.score;
            const newGameSpeed = Math.min(18, 5 + Math.floor(newScore / 300));
            const newInvincibilityTimer = Math.max(0, prev.invincibilityTimer - 1);
            let activeExplosions = prev.explosions
                .map(e => ({...e, duration: e.duration - 1}))
                .filter(e => e.duration > 0);

            // === BOSS FIGHT TRIGGER ===
            if (prev.gameMode === 'normal' && newScore >= BOSS_FIGHT_SCORE_TRIGGER && !prev.showBossWarning) {
                setTimeout(() => setGameState(p => ({...p, showBossWarning: false})), 2000);
                setTimeout(() => setGameState(p => {
                    if (p.isGameOver || p.gameMode === 'bossFight') return p;
                    return {
                        ...p,
                        gameMode: 'bossFight',
                        opponents: [],
                        roadLines: [],
                        tank: {
                            x: GAME_WIDTH / 2 - 50, y: 10, width: 100, height: 60,
                            hp: 30, maxHp: 30, vx: 2, shootCooldown: 60
                        }
                    }
                }), 2000);
                return {...prev, showBossWarning: true};
            }

            // --- NORMAL MODE LOGIC ---
            if (prev.gameMode === 'normal') {
                const newOpponents = prev.opponents.map(o => ({ ...o, y: o.y + o.speed })).filter(o => o.y < GAME_HEIGHT);
                let newRoadLines = prev.roadLines.map(rl => ({...rl, y: rl.y + prev.gameSpeed })).filter(rl => rl.y < GAME_HEIGHT);
                
                if (prev.invincibilityTimer <= 0) {
                    for (const opponent of newOpponents) {
                        if (playerX < opponent.x + OPPONENT_CAR_WIDTH && playerX + PLAYER_CAR_WIDTH > opponent.x && playerY < opponent.y + OPPONENT_CAR_HEIGHT && playerY + PLAYER_CAR_HEIGHT > opponent.y) {
                            const newLives = prev.lives - 1;
                            activeExplosions.push({ id: Date.now(), x: playerX + PLAYER_CAR_WIDTH / 2, y: playerY + PLAYER_CAR_HEIGHT / 2, size: 80, duration: 30 });
                            if (newLives <= 0) {
                                return { ...prev, isGameOver: true, explosions: activeExplosions };
                            }
                            const safeOpponents = newOpponents.filter(o => Math.abs(o.y - playerY) > PLAYER_CAR_HEIGHT * 2.5);
                            return { ...prev, lives: newLives, invincibilityTimer: 180, opponents: safeOpponents, explosions: activeExplosions };
                        }
                    }
                }
                return { ...prev, opponents: newOpponents, roadLines: newRoadLines, score: newScore, gameSpeed: newGameSpeed, playerLane: newLane, invincibilityTimer: newInvincibilityTimer, explosions: activeExplosions };
            }

            // --- BOSS FIGHT LOGIC ---
            if (prev.gameMode === 'bossFight' && prev.tank) {
                let tank = { ...prev.tank };
                let newPlayerProjectiles = prev.playerProjectiles.map(p => ({ ...p, y: p.y - 12 })).filter(p => p.y > -p.height);
                let newOpponents = prev.opponents.map(o => ({ ...o, y: o.y + o.speed })).filter(o => o.y < GAME_HEIGHT);
                const newShootCooldown = Math.max(0, prev.shootCooldown - 1);

                tank.x += tank.vx;
                if (tank.x <= 0 || tank.x + tank.width >= GAME_WIDTH) {
                    tank.vx *= -1;
                }

                tank.shootCooldown -= 1;
                if (tank.shootCooldown <= 0) {
                    tank.shootCooldown = 60 + Math.random() * 30; // Reset cooldown
                    newOpponents.push({
                        id: Date.now(),
                        x: tank.x + tank.width / 2 - OPPONENT_CAR_WIDTH / 2,
                        y: tank.y + tank.height,
                        color: OPPONENT_COLORS[Math.floor(Math.random() * OPPONENT_COLORS.length)],
                        speed: newGameSpeed * 1.2,
                    });
                }

                const remainingProjectiles: Projectile[] = [];
                for (const proj of newPlayerProjectiles) {
                    if (proj.x < tank.x + tank.width && proj.x + proj.width > tank.x && proj.y < tank.y + tank.height && proj.y + proj.height > tank.y) {
                        tank.hp -= 1;
                        activeExplosions.push({ id: Date.now() + Math.random(), x: proj.x, y: proj.y, size: 30, duration: 15 });
                    } else {
                        remainingProjectiles.push(proj);
                    }
                }
                newPlayerProjectiles = remainingProjectiles;
                
                if (prev.invincibilityTimer <= 0) {
                    for (const opponent of newOpponents) {
                         if (playerX < opponent.x + OPPONENT_CAR_WIDTH && playerX + PLAYER_CAR_WIDTH > opponent.x && playerY < opponent.y + OPPONENT_CAR_HEIGHT && playerY + PLAYER_CAR_HEIGHT > opponent.y) {
                            const newLives = prev.lives - 1;
                            activeExplosions.push({ id: Date.now(), x: playerX + PLAYER_CAR_WIDTH / 2, y: playerY + PLAYER_CAR_HEIGHT / 2, size: 80, duration: 30 });
                             if (newLives <= 0) {
                                return { ...prev, isGameOver: true, explosions: activeExplosions };
                             }
                            const safeOpponents = newOpponents.filter(o => Math.abs(o.y - playerY) > PLAYER_CAR_HEIGHT * 2.5);
                            return { ...prev, lives: newLives, invincibilityTimer: 180, opponents: safeOpponents, explosions: activeExplosions };
                        }
                    }
                }
                
                if (tank.hp <= 0) {
                    for (let i = 0; i < 10; i++) {
                        activeExplosions.push({ id: Date.now() + i, x: tank.x + Math.random() * tank.width, y: tank.y + Math.random() * tank.height, size: 20 + Math.random() * 40, duration: 30 + Math.random() * 30 });
                    }
                    return { ...createInitialState(), score: prev.score + 1000, gameSpeed: newGameSpeed, gameMode: 'normal', explosions: activeExplosions };
                }

                return { ...prev, playerLane: newLane, tank, opponents: newOpponents, playerProjectiles: newPlayerProjectiles, shootCooldown: newShootCooldown, invincibilityTimer: newInvincibilityTimer, explosions: activeExplosions };
            }

            return prev;
        });
    };

    const spawnerLoop = () => {
         if (gameState.isGameOver || gameState.gameMode === 'bossFight') return;
         setGameState(prev => {
            let newOpponents = prev.opponents;
            if (Math.random() < 0.04 + (prev.gameSpeed / 180) ) {
                const lane = Math.floor(Math.random() * 3);
                const lastOpponentInLane = prev.opponents.filter(o => o.x === LANES[lane]).pop();
                
                if (!lastOpponentInLane || lastOpponentInLane.y > OPPONENT_CAR_HEIGHT * 2.5) {
                    const carSpeed = prev.gameSpeed * (0.9 + Math.random() * 0.4);
                    newOpponents = [ ...prev.opponents, { id: Date.now() + Math.random(), x: LANES[lane], y: -OPPONENT_CAR_HEIGHT, color: OPPONENT_COLORS[Math.floor(Math.random() * OPPONENT_COLORS.length)], speed: carSpeed, }];
                }
            }

            let newRoadLines = prev.roadLines;
            const lastLine = prev.roadLines[prev.roadLines.length - 1];
            if (!lastLine || lastLine.y > ROAD_LINE_HEIGHT * 1.5) {
                newRoadLines = [ ...prev.roadLines, { id: Date.now(), y: -ROAD_LINE_HEIGHT } ];
            }
            
            return { ...prev, opponents: newOpponents, roadLines: newRoadLines };
         });
    };

    useInterval(gameLoop, !gameState.isGameOver ? 16 : null);
    useInterval(spawnerLoop, !gameState.isGameOver ? 100 : null);

    const playerX = LANES[gameState.playerLane];
    const playerY = GAME_HEIGHT - PLAYER_CAR_HEIGHT - 20;

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-yellow-500/10 border border-slate-700">
          <div className="flex justify-between items-center mb-2 px-2 text-yellow-300">
            <span className="font-bold">Score: {gameState.score}</span>
            <span className="font-bold text-lg tracking-widest">{ '❤️'.repeat(Math.max(0, gameState.lives)) }</span>
            <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
          </div>
          <div
            ref={viewportRef}
            className="relative overflow-hidden mx-auto border-2 border-slate-600"
            style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}` }}
          >
            <div
                className="bg-gray-700"
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
                {gameState.isGameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20">
                    <h2 className="text-4xl font-bold text-red-500">CRASHED!</h2>
                    <p className="text-xl mt-2">Your Score: {gameState.score}</p>
                    <button
                      onClick={restartGame}
                      className="mt-6 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      Race Again
                    </button>
                  </div>
                )}
                 {gameState.showBossWarning && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20 animate-pulse">
                    <h2 className="text-5xl font-bold text-red-500">WARNING!</h2>
                  </div>
                )}
                
                {/* Road Lines */}
                {gameState.roadLines.map(line => (
                    <React.Fragment key={line.id}>
                        <div className="absolute bg-gray-400" style={{ left: GAME_WIDTH / 3 - ROAD_LINE_WIDTH / 2, top: line.y, width: ROAD_LINE_WIDTH, height: ROAD_LINE_HEIGHT }} />
                        <div className="absolute bg-gray-400" style={{ left: GAME_WIDTH * 2 / 3 - ROAD_LINE_WIDTH / 2, top: line.y, width: ROAD_LINE_WIDTH, height: ROAD_LINE_HEIGHT }} />
                    </React.Fragment>
                ))}

                {/* Player Car */}
                <PlayerCar 
                    score={gameState.score} 
                    style={{ left: playerX, top: playerY, width: PLAYER_CAR_WIDTH, height: PLAYER_CAR_HEIGHT }} 
                    isInvincible={gameState.invincibilityTimer > 0}
                />

                {/* Opponent Cars / Tank Projectiles */}
                {gameState.opponents.map(car => <OpponentCar key={car.id} car={car} />)}

                {/* Player Projectiles */}
                {gameState.playerProjectiles.map(p => <ProjectileComponent key={p.id} projectile={p} />)}

                {/* Tank */}
                {gameState.tank && <TankComponent tank={gameState.tank} />}
                {gameState.tank && <TankHealthBar hp={gameState.tank.hp} maxHp={gameState.tank.maxHp} />}

                {/* Explosions */}
                {gameState.explosions.map(e => <ExplosionComponent key={e.id} explosion={e} />)}

            </div>
          </div>
          <Controls 
            onKeyPress={handleKeyPress} 
            onKeyRelease={() => {}}
            actionButtonKey={gameState.gameMode === 'bossFight' ? 'ArrowUp' : undefined}
            actionButtonLabel="FIRE"
          />
        </div>
    );
};

export default RacingGame;