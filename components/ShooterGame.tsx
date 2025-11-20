import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';

// Game constants
const GAME_WIDTH = 500;
const GAME_HEIGHT = 500;
const SHIELD_RADIUS = 50;
const PLAYER_PROJECTILE_SPEED = 6;
const ENEMY_SPAWN_RATE_START = 1000; // ms
const ENEMY_SPEED_START = 1;
const BASE_SHIELD_MAX_HP = 100;
const PLAYER_RADIUS = 12;
const PLAYER_SPEED = 3.5;
const JOYSTICK_BASE_RADIUS = 50;
const JOYSTICK_KNOB_RADIUS = 25;
const JOYSTICK_MAX_RADIUS = 40; // Max distance knob can move from base center

// Shop and Power-up constants
const FIRE_RATE_COST = 150;
const HP_BOOST_COST = 100;
const POWERUP_DURATION = 20 * 60; // 20 seconds in frames (assuming 60fps)

// Weapon Constants
const SHOTGUN_COST = 200;
const TRISHOT_COST = 600;

const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

interface ShooterGameProps {
  onExit: () => void;
}

interface GameObject {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Enemy extends GameObject {
  hp: number;
  type: 'normal' | 'zombie';
}

interface Explosion {
    id: number;
    x: number;
    y: number;
    radius: number;
    duration: number; // in frames
}

interface PowerUpState {
    fireRate: number; // duration in frames
    hpBoost: number; // duration in frames
}

type Weapon = 'default' | 'shotgun' | 'trishot';

const PlayerSprite: React.FC<{ powerUps: PowerUpState }> = ({ powerUps }) => {
    const isFireRateActive = powerUps.fireRate > 0;
    const characterColor = '#E5E7EB'; // A light gray, almost white
    const gunColor = isFireRateActive ? '#fde047' : '#22d3ee'; // Yellow for rapid fire, cyan otherwise
    const gunGlow = isFireRateActive ? '#f59e0b' : '#06b6d4';

    return (
        <div className="relative w-full h-full" style={{ filter: `drop-shadow(0 0 4px ${characterColor}55)`}}>
            {/* The gun, rendered first to be 'under' the hands */}
            <div
              className="absolute"
              style={{
                width: 10,
                height: 16,
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
              }}
            >
              {/* Gun body */}
              <div 
                className="absolute"
                style={{
                  width: 10,
                  height: 6,
                  backgroundColor: '#94a3b8', // slate-400
                  top: 8,
                  left: 0,
                  borderRadius: '1px',
                }}
              />
              {/* Gun barrel */}
              <div 
                style={{
                  width: 6,
                  height: 10,
                  backgroundColor: gunColor,
                  boxShadow: `0 0 6px ${gunGlow}`,
                  position: 'absolute',
                  top: 0,
                  left: 2,
                  borderRadius: '1px',
                }}
              />
            </div>

            {/* Head */}
            <div className="absolute rounded-full" style={{ width: 12, height: 12, backgroundColor: characterColor, top: 10, left: '50%', transform: 'translateX(-50%)' }} />
            
            {/* Body */}
            <div className="absolute" style={{ width: 10, height: 12, backgroundColor: characterColor, top: 20, left: '50%', transform: 'translateX(-50%)', borderRadius: '2px' }} />

            {/* Arms/Hands, rendered last to be 'on top' */}
            <div className="absolute" style={{ width: 6, height: 6, backgroundColor: characterColor, top: 14, left: 1, borderRadius: '2px' }} />
            <div className="absolute" style={{ width: 6, height: 6, backgroundColor: characterColor, top: 14, right: 1, borderRadius: '2px' }} />
        </div>
    );
};


const createInitialState = () => ({
  player: {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: 0,
  },
  projectiles: [] as GameObject[],
  enemies: [] as Enemy[],
  explosions: [] as Explosion[],
  shieldHp: BASE_SHIELD_MAX_HP,
  score: 0,
  isGameOver: false,
  isShooting: false,
  shootCooldown: 0,
  gameTime: 0, // Used to scale difficulty
  powerUps: { fireRate: 0, hpBoost: 0 } as PowerUpState,
  isShopOpen: false,
  unlockAnimation: { active: false, text: '', timer: 0 },
});

const ShooterGame: React.FC<ShooterGameProps> = ({ onExit }) => {
    const [gameState, setGameState] = useState(createInitialState());
    // Permanent unlocks state, persists across deaths
    const [purchasedWeapons, setPurchasedWeapons] = useState({ shotgun: false, trishot: false });
    const [equippedWeapon, setEquippedWeapon] = useState<Weapon>('default');
    
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    
    // State for score animation
    const [scoreChangeClass, setScoreChangeClass] = useState('');
    const prevScoreRef = useRef(gameState.score);

    // Mobile controls state
    const [movementTouchId, setMovementTouchId] = useState<number | null>(null);
    const [aimingTouchId, setAimingTouchId] = useState<number | null>(null);
    const [joystick, setJoystick] = useState<{ base: {x:number, y:number}, knob: {x:number, y:number} } | null>(null);

    // Effect to detect score decrease and trigger animation
    useEffect(() => {
        if (gameState.score < prevScoreRef.current) {
            setScoreChangeClass('animate-score-decrease');
            const timer = setTimeout(() => setScoreChangeClass(''), 500); // Duration of animation
            return () => clearTimeout(timer);
        }
        prevScoreRef.current = gameState.score;
    }, [gameState.score]);

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
        setGameState(createInitialState());
    }, []);

    const handleAim = useCallback((clientX: number, clientY: number) => {
        if (!viewportRef.current || gameState.isGameOver || gameState.isShopOpen) return;
        const rect = viewportRef.current.getBoundingClientRect();
        const cursorGameX = (clientX - rect.left) / scale;
        const cursorGameY = (clientY - rect.top) / scale;
        
        setGameState(prev => {
            const gameX = cursorGameX - prev.player.x;
            const gameY = cursorGameY - prev.player.y;
            const angle = Math.atan2(gameY, gameX) * (180 / Math.PI);
            return { ...prev, player: { ...prev.player, angle }};
        });
    }, [scale, gameState.isGameOver, gameState.isShopOpen]);
    
    // --- Mouse and Touch event listeners ---
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        
        // Mouse handlers for desktop
        const onMouseMove = (e: MouseEvent) => handleAim(e.clientX, e.clientY);
        const onMouseDown = (e: MouseEvent) => {
             if (gameState.isGameOver || gameState.isShopOpen || isMobile) return;
             setGameState(prev => ({ ...prev, isShooting: true }));
             handleAim(e.clientX, e.clientY);
        };
        const onMouseUp = () => {
            if (isMobile) return;
            setGameState(prev => ({ ...prev, isShooting: false }));
        };

        // Touch handlers for mobile
        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            if (gameState.isGameOver || gameState.isShopOpen) return;
            const rect = viewport.getBoundingClientRect();
            
            Array.from(e.changedTouches).forEach(touch => {
                const isLeftSide = touch.clientX < window.innerWidth / 2;
                if (isLeftSide && movementTouchId === null) {
                    setMovementTouchId(touch.identifier);
                    const gameX = (touch.clientX - rect.left) / scale;
                    const gameY = (touch.clientY - rect.top) / scale;
                    setJoystick({ base: {x: gameX, y: gameY}, knob: {x: gameX, y: gameY} });
                } else if (!isLeftSide && aimingTouchId === null) {
                    setAimingTouchId(touch.identifier);
                    setGameState(p => ({ ...p, isShooting: true }));
                    handleAim(touch.clientX, touch.clientY);
                }
            });
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (gameState.isGameOver || gameState.isShopOpen) return;
            const rect = viewport.getBoundingClientRect();

            Array.from(e.changedTouches).forEach(touch => {
                if (touch.identifier === movementTouchId) {
                    setJoystick(prevJoystick => {
                        if (!prevJoystick) return null;
                        const gameX = (touch.clientX - rect.left) / scale;
                        const gameY = (touch.clientY - rect.top) / scale;
                        const dx = gameX - prevJoystick.base.x;
                        const dy = gameY - prevJoystick.base.y;
                        const dist = Math.hypot(dx, dy);

                        let knobX = gameX;
                        let knobY = gameY;

                        if (dist > JOYSTICK_MAX_RADIUS) {
                           knobX = prevJoystick.base.x + (dx / dist) * JOYSTICK_MAX_RADIUS;
                           knobY = prevJoystick.base.y + (dy / dist) * JOYSTICK_MAX_RADIUS;
                        }
                        
                        setGameState(p => ({
                            ...p,
                            player: { ...p.player, vx: (knobX - prevJoystick.base.x) / JOYSTICK_MAX_RADIUS * PLAYER_SPEED, vy: (knobY - prevJoystick.base.y) / JOYSTICK_MAX_RADIUS * PLAYER_SPEED }
                        }));

                        return { ...prevJoystick, knob: { x: knobX, y: knobY } };
                    });
                } else if (touch.identifier === aimingTouchId) {
                    handleAim(touch.clientX, touch.clientY);
                }
            });
        };
        
        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            Array.from(e.changedTouches).forEach(touch => {
                if (touch.identifier === movementTouchId) {
                    setMovementTouchId(null);
                    setJoystick(null);
                    setGameState(p => ({ ...p, player: { ...p.player, vx: 0, vy: 0 }}));
                } else if (touch.identifier === aimingTouchId) {
                    setAimingTouchId(null);
                    setGameState(p => ({ ...p, isShooting: false }));
                }
            });
        };

        if (!isMobile) {
            viewport.addEventListener('mousemove', onMouseMove);
            viewport.addEventListener('mousedown', onMouseDown);
            window.addEventListener('mouseup', onMouseUp);
        }
        
        viewport.addEventListener('touchstart', handleTouchStart, { passive: false });
        viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
        viewport.addEventListener('touchend', handleTouchEnd, { passive: false });
        viewport.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        return () => {
            if (!isMobile) {
                viewport.removeEventListener('mousemove', onMouseMove);
                viewport.removeEventListener('mousedown', onMouseDown);
                window.removeEventListener('mouseup', onMouseUp);
            }
            viewport.removeEventListener('touchstart', handleTouchStart);
            viewport.removeEventListener('touchmove', handleTouchMove);
            viewport.removeEventListener('touchend', handleTouchEnd);
            viewport.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleAim, gameState.isGameOver, gameState.isShopOpen, scale, movementTouchId, aimingTouchId]);

     // --- Automatic Weapon Unlocks ---
    useEffect(() => {
        if (gameState.isGameOver) return;

        if (gameState.score >= SHOTGUN_COST && !purchasedWeapons.shotgun) {
            setPurchasedWeapons(p => ({ ...p, shotgun: true }));
            setEquippedWeapon('shotgun');
            setGameState(p => ({
                ...p,
                unlockAnimation: { active: true, text: 'SHOTGUN UNLOCKED!', timer: 120 } // 2 seconds at 60fps
            }));
        }
        
        if (gameState.score >= TRISHOT_COST && !purchasedWeapons.trishot) {
            setPurchasedWeapons(p => ({ ...p, trishot: true }));
            setEquippedWeapon('trishot');
            setGameState(p => ({
                ...p,
                unlockAnimation: { active: true, text: 'TRI-SHOT UNLOCKED!', timer: 120 }
            }));
        }
    }, [gameState.score, purchasedWeapons, gameState.isGameOver]);

    // --- Shop Handlers ---
    const buyFireRate = useCallback(() => {
        setGameState(prev => {
            if (!prev.isGameOver && prev.score >= FIRE_RATE_COST && prev.powerUps.fireRate <= 0) {
                return {
                    ...prev,
                    score: prev.score - FIRE_RATE_COST,
                    powerUps: { ...prev.powerUps, fireRate: POWERUP_DURATION },
                    isShopOpen: false,
                };
            }
            return prev;
        });
    }, []);

    const buyHpBoost = useCallback(() => {
        setGameState(prev => {
            if (!prev.isGameOver && prev.score >= HP_BOOST_COST && prev.powerUps.hpBoost <= 0) {
                return {
                    ...prev,
                    score: prev.score - HP_BOOST_COST,
                    shieldHp: 200,
                    powerUps: { ...prev.powerUps, hpBoost: POWERUP_DURATION },
                    isShopOpen: false,
                };
            }
            return prev;
        });
    }, []);

    const equipWeapon = useCallback((weapon: Weapon) => {
        const isUnlocked = weapon === 'default' || (purchasedWeapons as any)[weapon];
        if (isUnlocked) {
            setEquippedWeapon(weapon);
            setGameState(p => ({...p, isShopOpen: false})); // Close shop on equip
        }
    }, [purchasedWeapons]);

    // --- Game Loop ---
    const gameLoop = useCallback(() => {
        setGameState(prev => {
            if (prev.isGameOver || prev.isShopOpen) return prev;

            let {
                player, projectiles, enemies, explosions, shieldHp, score, isShooting, shootCooldown, gameTime, powerUps, unlockAnimation
            } = prev;
            
            // --- Update Animation Timer ---
            if (unlockAnimation.timer > 0) {
                unlockAnimation.timer -= 1;
            } else if (unlockAnimation.active) {
                unlockAnimation.active = false;
            }

            const newGameTime = gameTime + 1;
            
            // --- Player Movement ---
            player.x += player.vx;
            player.y += player.vy;
            player.x = Math.max(PLAYER_RADIUS, Math.min(GAME_WIDTH - PLAYER_RADIUS, player.x));
            player.y = Math.max(PLAYER_RADIUS, Math.min(GAME_HEIGHT - PLAYER_RADIUS, player.y));
            
            // --- Update Power-up Timers ---
            const justExpiredHpBoost = powerUps.hpBoost > 0 && powerUps.hpBoost - 1 <= 0;
            powerUps = {
                fireRate: Math.max(0, powerUps.fireRate - 1),
                hpBoost: Math.max(0, powerUps.hpBoost - 1)
            };
            if (justExpiredHpBoost) {
                shieldHp = Math.min(shieldHp, BASE_SHIELD_MAX_HP);
            }

            // --- Shooting ---
            let newShootCooldown = Math.max(0, shootCooldown - 1);
            if (isShooting && newShootCooldown === 0) {
                const angleRad = player.angle * (Math.PI / 180);
                let baseCooldown = 10;
    
                switch (equippedWeapon) {
                    case 'shotgun':
                        baseCooldown = 15;
                        [-7.5, 7.5].forEach(offset => {
                            const spreadAngleRad = (player.angle + offset) * (Math.PI / 180);
                            projectiles.push({
                                id: Date.now() + Math.random(), x: player.x, y: player.y,
                                vx: Math.cos(spreadAngleRad) * PLAYER_PROJECTILE_SPEED,
                                vy: Math.sin(spreadAngleRad) * PLAYER_PROJECTILE_SPEED,
                                radius: 5,
                            });
                        });
                        break;
                    case 'trishot':
                        baseCooldown = 20;
                        [-15, 0, 15].forEach(offset => {
                             const spreadAngleRad = (player.angle + offset) * (Math.PI / 180);
                            projectiles.push({
                                id: Date.now() + Math.random(), x: player.x, y: player.y,
                                vx: Math.cos(spreadAngleRad) * PLAYER_PROJECTILE_SPEED,
                                vy: Math.sin(spreadAngleRad) * PLAYER_PROJECTILE_SPEED,
                                radius: 5,
                            });
                        });
                        break;
                    default: // 'default' weapon
                        baseCooldown = 10;
                        projectiles.push({
                            id: Date.now() + Math.random(), x: player.x, y: player.y,
                            vx: Math.cos(angleRad) * PLAYER_PROJECTILE_SPEED,
                            vy: Math.sin(angleRad) * PLAYER_PROJECTILE_SPEED,
                            radius: 5,
                        });
                        break;
                }
                newShootCooldown = powerUps.fireRate > 0 ? baseCooldown / 2 : baseCooldown;
            }

            // --- Move Projectiles ---
            projectiles = projectiles
                .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy }))
                .filter(p => p.x > 0 && p.x < GAME_WIDTH && p.y > 0 && p.y < GAME_HEIGHT);

            // --- Move Enemies ---
            enemies = enemies.map(e => ({ ...e, x: e.x + e.vx, y: e.y + e.vy }));
            
            // --- Spawn Enemies ---
            const spawnRateFactor = newGameTime / 20;
            const currentSpawnRate = Math.max(200, ENEMY_SPAWN_RATE_START - spawnRateFactor);

            if (Math.random() < 16 / currentSpawnRate) {
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDist = Math.max(GAME_WIDTH / 2, GAME_HEIGHT / 2) + 50;
                const spawnX = player.x + Math.cos(spawnAngle) * spawnDist;
                const spawnY = player.y + Math.sin(spawnAngle) * spawnDist;
                const targetAngle = Math.atan2(player.y - spawnY, player.x - spawnX);
                
                const speedFactor = newGameTime / 2000;
                const baseSpeed = ENEMY_SPEED_START + speedFactor;

                if (newGameTime > 60 * 5 && Math.random() < 0.25) { // Spawn zombies after 5 seconds
                    enemies.push({ id: Date.now() + Math.random(), x: spawnX, y: spawnY, vx: Math.cos(targetAngle) * (baseSpeed * 0.2), vy: Math.sin(targetAngle) * (baseSpeed * 0.2), radius: 15 + Math.random() * 5, hp: 2, type: 'zombie' });
                } else {
                    enemies.push({ id: Date.now() + Math.random(), x: spawnX, y: spawnY, vx: Math.cos(targetAngle) * baseSpeed, vy: Math.sin(targetAngle) * baseSpeed, radius: 10 + Math.random() * 10, hp: 1, type: 'normal' });
                }
            }

            // --- Collision Detection ---
            const remainingProjectiles: GameObject[] = [];
            let newScore = score;
            let newShieldHp = shieldHp;
            let newIsGameOver = false;

            // Projectile vs Enemy
            for (const p of projectiles) {
                let hit = false;
                for (const e of enemies) {
                    if (e.hp <= 0) continue;
                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < p.radius + e.radius) {
                        hit = true;
                        e.hp -= 1;
                        explosions.push({ id: Date.now() + Math.random(), x: e.x, y: e.y, radius: e.radius * 1.5, duration: 15 });
                        if (e.hp <= 0) {
                            newScore += e.type === 'zombie' ? 25 : 10;
                            explosions.push({ id: Date.now() + Math.random(), x: e.x, y: e.y, radius: e.radius * 3, duration: 30 });
                        }
                    }
                }
                if (!hit) { remainingProjectiles.push(p); }
            }

            const remainingEnemies: Enemy[] = enemies.filter(e => e.hp > 0);
            projectiles = remainingProjectiles;

            // Enemy vs Shield
            const finalEnemies: Enemy[] = [];
            for (const e of remainingEnemies) {
                 const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
                 if (distToPlayer < SHIELD_RADIUS + e.radius) {
                    newShieldHp -= 10;
                    explosions.push({ id: Date.now() + Math.random(), x: e.x, y: e.y, radius: e.radius * 3, duration: 30 });
                 } else {
                    finalEnemies.push(e);
                 }
            }
            enemies = finalEnemies;
            
            if (newShieldHp <= 0) {
                newShieldHp = 0;
                newIsGameOver = true;
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    explosions.push({ id: Date.now() + Math.random() + i, x: player.x + Math.cos(angle) * (SHIELD_RADIUS * Math.random()), y: player.y + Math.sin(angle) * (SHIELD_RADIUS * Math.random()), radius: 20 + Math.random() * 40, duration: 30 + Math.random() * 30 });
                }
            }

            // --- Update Explosions ---
            explosions = explosions.map(ex => ({ ...ex, duration: ex.duration - 1 })).filter(ex => ex.duration > 0);
            
            return { ...prev, player, projectiles, enemies, explosions, score: newScore, shieldHp: newShieldHp, isGameOver: newIsGameOver, shootCooldown: newShootCooldown, gameTime: newGameTime, powerUps, unlockAnimation, };
        });
    }, [equippedWeapon]);

    useInterval(gameLoop, gameState.isGameOver || gameState.isShopOpen ? null : 1000 / 60); // 60 FPS

    const { score, shieldHp, isGameOver, player, projectiles, enemies, explosions, powerUps, isShopOpen, unlockAnimation } = gameState;
    const currentMaxHp = powerUps.hpBoost > 0 ? 200 : BASE_SHIELD_MAX_HP;

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-teal-500/10 border border-slate-700 relative">
          <style>{`
            @keyframes score-decrease-anim {
                0% { transform: scale(1); color: #2dd4bf; }
                50% { transform: scale(1.25); color: #f87171; }
                100% { transform: scale(1); color: #2dd4bf; }
            }
            .animate-score-decrease {
                animation: score-decrease-anim 0.5s ease-out;
            }
          `}</style>
          <div className="flex justify-between items-center mb-2 px-2 text-teal-300">
            <span className={`font-bold ${scoreChangeClass}`}>Score: {score}</span>
             <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-widest">HP: {shieldHp} / {currentMaxHp}</span>
                {powerUps.fireRate > 0 && <span className="text-yellow-400 animate-pulse text-sm">🔫 {(powerUps.fireRate/60).toFixed(1)}s</span>}
                {powerUps.hpBoost > 0 && <span className="text-pink-400 animate-pulse text-sm">❤️ {(powerUps.hpBoost/60).toFixed(1)}s</span>}
             </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => setGameState(p => ({...p, isShopOpen: !p.isGameOver ? true : p.isShopOpen}))} 
                    className="text-sm bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-md transition-colors"
                >
                    Shop
                </button>
                <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
            </div>
          </div>
          <div
            ref={viewportRef}
            className="relative overflow-hidden mx-auto border-2 border-slate-600"
            style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `1 / 1`, cursor: 'crosshair' }}
          >
            <div
                className="bg-black"
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: GAME_WIDTH, height: GAME_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                {isGameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20">
                    <h2 className="text-4xl font-bold text-red-500">SHIELD DESTROYED</h2>
                    <p className="text-xl mt-2">Final Score: {score}</p>
                    <button
                      onClick={restartGame}
                      className="mt-6 bg-teal-500 hover:bg-teal-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      Defend Again
                    </button>
                  </div>
                )}
                
                {unlockAnimation.active && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden">
                        <div
                            className="absolute rounded-full border-8 border-yellow-300"
                            style={{
                                width: `${(120 - unlockAnimation.timer) * 8}px`,
                                height: `${(120 - unlockAnimation.timer) * 8}px`,
                                opacity: `${unlockAnimation.timer / 120}`,
                                boxShadow: '0 0 50px yellow',
                            }}
                        />
                        <h2 className="text-5xl font-bold text-yellow-300 animate-pulse" style={{ opacity: `${Math.sin((unlockAnimation.timer / 120) * Math.PI)}`, textShadow: '0 0 20px white' }}>
                            {unlockAnimation.text}
                        </h2>
                    </div>
                )}

                {isShopOpen && (
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-30"
                        onClick={() => setGameState(p => ({...p, isShopOpen: false}))}
                    >
                        <div 
                            className="bg-slate-800 p-6 rounded-2xl shadow-2xl shadow-yellow-500/20 border border-slate-600 w-4/5 max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-center text-yellow-400 mb-4">Shop</h2>
                            {/* Power-ups Section */}
                            <h3 className="text-lg font-semibold text-center text-yellow-300 mb-2">Power-ups</h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={buyFireRate} 
                                    disabled={score < FIRE_RATE_COST || powerUps.fireRate > 0} 
                                    className="w-full text-white font-bold py-2 px-4 rounded-lg transition-colors bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    🔫 Rapid Fire
                                    <span className="block text-xs font-normal">Cost: {FIRE_RATE_COST}</span>
                                </button>
                                <button 
                                    onClick={buyHpBoost} 
                                    disabled={score < HP_BOOST_COST || powerUps.hpBoost > 0} 
                                    className="w-full text-white font-bold py-2 px-4 rounded-lg transition-colors bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    ❤️ HP Boost (200)
                                    <span className="block text-xs font-normal">Cost: {HP_BOOST_COST}</span>
                                </button>
                            </div>

                             {/* Weapons Section */}
                            <h3 className="text-lg font-semibold text-center text-yellow-300 mt-5 mb-2">Arsenal</h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => equipWeapon('default')} 
                                    disabled={equippedWeapon === 'default'} 
                                    className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors bg-gray-500 ${equippedWeapon === 'default' ? '!bg-cyan-600' : 'hover:bg-gray-400'} disabled:cursor-not-allowed disabled:opacity-70`}
                                >
                                    {equippedWeapon === 'default' ? 'Equipped Pistol' : 'Equip Pistol'}
                                </button>
                                <button 
                                    onClick={() => equipWeapon('shotgun')} 
                                    disabled={!purchasedWeapons.shotgun || equippedWeapon === 'shotgun'} 
                                    className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${!purchasedWeapons.shotgun ? 'bg-gray-700' : equippedWeapon === 'shotgun' ? '!bg-cyan-600' : 'bg-orange-600 hover:bg-orange-500'}`}
                                >
                                    {!purchasedWeapons.shotgun ? `Unlock at ${SHOTGUN_COST} Score` : equippedWeapon === 'shotgun' ? 'Equipped Shotgun' : 'Equip Shotgun'}
                                </button>
                                <button 
                                    onClick={() => equipWeapon('trishot')} 
                                    disabled={!purchasedWeapons.trishot || equippedWeapon === 'trishot'} 
                                    className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${!purchasedWeapons.trishot ? 'bg-gray-700' : equippedWeapon === 'trishot' ? '!bg-cyan-600' : 'bg-purple-600 hover:bg-purple-500'}`}
                                >
                                    {!purchasedWeapons.trishot ? `Unlock at ${TRISHOT_COST} Score` : equippedWeapon === 'trishot' ? 'Equipped Tri-Shot' : 'Equip Tri-Shot'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Shield */}
                <div 
                    className="absolute rounded-full border-2 border-cyan-400 transition-all duration-100"
                    style={{
                        left: player.x - SHIELD_RADIUS, top: player.y - SHIELD_RADIUS,
                        width: SHIELD_RADIUS * 2, height: SHIELD_RADIUS * 2,
                        boxShadow: `0 0 20px #22d3ee, inset 0 0 15px ${powerUps.hpBoost > 0 ? '#f0f' : '#22d3ee33'}`,
                        borderColor: powerUps.hpBoost > 0 ? '#f0f' : '#22d3ee',
                        opacity: 0.3 + (shieldHp / currentMaxHp) * 0.7,
                    }}
                />

                {/* Player Character */}
                <div
                    className="absolute"
                    style={{
                        left: player.x,
                        top: player.y,
                        width: 24,
                        height: 32,
                        transform: `translate(-50%, -50%) rotate(${player.angle + 90}deg)`,
                    }}
                >
                    <PlayerSprite powerUps={powerUps} />
                </div>


                {/* Projectiles */}
                {projectiles.map(p => (
                    <div key={p.id} className="absolute bg-yellow-300 rounded-full" style={{
                        left: p.x - p.radius, top: p.y - p.radius,
                        width: p.radius * 2, height: p.radius * 2,
                        boxShadow: '0 0 10px #fde047'
                    }}/>
                ))}

                {/* Enemies */}
                {enemies.map(e => {
                    if (e.type === 'zombie') {
                        const isDamaged = e.hp === 1;
                        return (
                            <div key={e.id} className="absolute" style={{
                                left: e.x - e.radius, top: e.y - e.radius,
                                width: e.radius * 2, height: e.radius * 2,
                            }}>
                                <div 
                                    className="relative w-full h-full bg-yellow-800 rounded-md border-2 animate-pulse"
                                    style={{ 
                                        borderColor: isDamaged ? '#ef4444' : '#f59e0b', // red-500 vs amber-500
                                        animationDuration: `${3 + Math.random()}s`,
                                        boxShadow: `0 0 ${e.radius/2}px ${isDamaged ? '#ef4444' : '#f59e0b'}`,
                                    }}
                                >
                                    {/* Face */}
                                    <div className="absolute bg-black rounded-full" style={{ width: '20%', height: '20%', left: '25%', top: '30%' }} />
                                    <div className="absolute bg-black rounded-full" style={{ width: '20%', height: '20%', right: '25%', top: '30%' }} />
                                    <div className="absolute bg-black" style={{ width: '40%', height: '10%', left: '30%', top: '60%', borderRadius: '2px' }} />
                                </div>
                            </div>
                        );
                    }
                    // Normal enemy
                    return (
                        <div key={e.id} className="absolute" style={{
                            left: e.x - e.radius, top: e.y - e.radius,
                            width: e.radius * 2, height: e.radius * 2,
                        }}>
                            <div 
                                className="relative w-full h-full bg-green-900 rounded-full border-2 border-green-500 animate-pulse"
                                style={{ 
                                    animationDuration: `${2 + Math.random()}s`,
                                    boxShadow: `0 0 ${e.radius/2}px #4ade80`,
                                }}
                            >
                                {/* Eyes */}
                                <div 
                                    className="absolute bg-red-500 rounded-full" 
                                    style={{ 
                                        width: '25%', height: '25%', 
                                        left: '50%', top: '50%',
                                        transform: 'translate(-100%, -50%)',
                                        boxShadow: '0 0 5px #ef4444'
                                    }} 
                                />
                                <div 
                                    className="absolute bg-red-500 rounded-full" 
                                    style={{ 
                                        width: '25%', height: '25%', 
                                        left: '50%', top: '50%',
                                        transform: 'translate(0%, -50%)',
                                        boxShadow: '0 0 5px #ef4444'
                                    }} 
                                />
                            </div>
                        </div>
                    );
                })}
                
                {/* Explosions */}
                {explosions.map(e => (
                    <div key={e.id} className="absolute bg-orange-400 rounded-full animate-ping" style={{
                        left: e.x - e.radius, top: e.y - e.radius,
                        width: e.radius * 2, height: e.radius * 2,
                        opacity: 0, // animate-ping handles visibility
                    }}/>
                ))}

                {/* Joystick UI */}
                 {isMobile && joystick && (
                    <>
                        {/* Joystick Base (Outer Ring) */}
                        <div className="absolute rounded-full bg-transparent border-4 border-white border-opacity-50 pointer-events-none" style={{
                            left: joystick.base.x - JOYSTICK_BASE_RADIUS,
                            top: joystick.base.y - JOYSTICK_BASE_RADIUS,
                            width: JOYSTICK_BASE_RADIUS * 2,
                            height: JOYSTICK_BASE_RADIUS * 2,
                        }} />
                        {/* Joystick Knob (Inner Circle) */}
                        <div className="absolute rounded-full bg-white pointer-events-none" style={{
                            left: joystick.knob.x - JOYSTICK_KNOB_RADIUS,
                            top: joystick.knob.y - JOYSTICK_KNOB_RADIUS,
                            width: JOYSTICK_KNOB_RADIUS * 2,
                            height: JOYSTICK_KNOB_RADIUS * 2,
                        }} />
                    </>
                )}
            </div>
          </div>
        </div>
    );
};

export default ShooterGame;