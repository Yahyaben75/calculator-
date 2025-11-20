import React, { useState, useEffect, useCallback } from 'react';
import { useInterval } from '../hooks/useInterval';
import Controls from './Controls';

// Constants
const GRID_SIZE = 25;
const GAME_SPEED_START = 130; // in ms
const SYMBOLS = ['*', '#', '$', '%', '@'];

// --- Audio ---
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

const playProximitySound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(80, context.currentTime); // Low "thump"
        oscillator.frequency.exponentialRampToValueAtTime(60, context.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.25, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
    } catch (e) {
        console.error("Could not play proximity sound", e);
    }
};

interface DotRunnerGameProps {
  onExit: () => void;
}

interface Point {
    x: number;
    y: number;
}

interface Collectible extends Point {
    symbol: string;
}

const createInitialState = () => {
    return {
        player: { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) },
        shadow: { x: 0, y: 0 },
        collectible: {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        },
        score: 0,
        isGameOver: false,
        gameSpeed: GAME_SPEED_START,
        glitch: false,
        gameTime: 0,
        baseShadowMoveChance: 0.35, // Start at 35%
        proximityAlert: false,
        shadowPowerUpTimer: 0,
    };
};

const DotRunnerGame: React.FC<DotRunnerGameProps> = ({ onExit }) => {
    const [gameState, setGameState] = useState(createInitialState());
    const { player, shadow, collectible, score, isGameOver, gameSpeed, glitch, proximityAlert, shadowPowerUpTimer } = gameState;

    const generateCollectible = useCallback((currentPlayer: Point, currentShadow: Point): Collectible => {
        let newCollectible: Collectible;
        do {
          newCollectible = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          };
        } while (
            (newCollectible.x === currentPlayer.x && newCollectible.y === currentPlayer.y) ||
            (newCollectible.x === currentShadow.x && newCollectible.y === currentShadow.y)
        );
        return newCollectible;
    }, []);

    const restartGame = useCallback(() => {
        const initialState = createInitialState();
        // Ensure collectible is not on top of player at start
        initialState.collectible = generateCollectible(initialState.player, initialState.shadow);
        setGameState(initialState);
    }, [generateCollectible]);

    const handleKeyPress = useCallback((key: string) => {
        if (isGameOver) return;
        setGameState(prev => {
            let { x, y } = prev.player;
            switch (key) {
                case 'ArrowUp': y = Math.max(0, y - 1); break;
                case 'ArrowDown': y = Math.min(GRID_SIZE - 1, y + 1); break;
                case 'ArrowLeft': x = Math.max(0, x - 1); break;
                case 'ArrowRight': x = Math.min(GRID_SIZE - 1, x + 1); break;
            }
            return { ...prev, player: { x, y } };
        });
    }, [isGameOver]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => !e.repeat && handleKeyPress(e.key);
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const gameLoop = () => {
        if (isGameOver) return;
        
        setGameState(prev => {
            const newGameTime = prev.gameTime + 1;
            let newBaseShadowMoveChance = prev.baseShadowMoveChance;
            let newShadowPowerUpTimer = Math.max(0, prev.shadowPowerUpTimer - 1);

            // Every ~10 seconds, trigger the power-up animation. Using the same tick count as before.
            if (newGameTime > 0 && newGameTime % 80 === 0 && prev.shadowPowerUpTimer <= 0) {
                newShadowPowerUpTimer = 25; // Lasts for 25 ticks (around 3s)
            }

            // Increase speed *after* power-up is done, so it feels like it "unleashes" its new speed.
            if (prev.shadowPowerUpTimer === 1 && newShadowPowerUpTimer === 0) {
                newBaseShadowMoveChance = Math.min(0.9, prev.baseShadowMoveChance + 0.03);
            }
            
            // Shadow AI
            let newShadow = { ...prev.shadow };
            const dx = prev.player.x - newShadow.x;
            const dy = prev.player.y - newShadow.y;
            const dist = Math.hypot(dx, dy);

            // Shadow only moves if it's not powering up
            if (newShadowPowerUpTimer <= 0) {
                let effectiveMoveChance = newBaseShadowMoveChance;
                if (dist > 12) {
                    effectiveMoveChance *= 0.8;
                }

                if (Math.random() < effectiveMoveChance) {
                    if (dx !== 0 || dy !== 0) {
                        if (Math.abs(dx) > Math.abs(dy)) {
                            newShadow.x += Math.sign(dx);
                        } else {
                            newShadow.y += Math.sign(dy);
                        }
                    }
                }
            }
            
            // Proximity alerts and visual effects
            const newGlitch = dist < 5 && Math.random() > 0.5;
            let newProximityAlert = false;
            if (dist < 4) {
                newProximityAlert = true;
                if (newGameTime % 15 === 0) {
                    playProximitySound();
                }
            }

            // Player collects item
            let newScore = prev.score;
            let newGameSpeed = prev.gameSpeed;
            let newCollectible = prev.collectible;
            if (prev.player.x === prev.collectible.x && prev.player.y === prev.collectible.y) {
                newScore += 1;
                newGameSpeed = Math.max(75, prev.gameSpeed - 2); // Speed up
                newCollectible = generateCollectible(prev.player, newShadow);
            }

            // Shadow catches player
            let newIsGameOver = prev.isGameOver;
            if (prev.player.x === newShadow.x && prev.player.y === newShadow.y) {
                newIsGameOver = true;
            }

            return {
                ...prev,
                shadow: newShadow,
                score: newScore,
                gameSpeed: newGameSpeed,
                collectible: newCollectible,
                isGameOver: newIsGameOver,
                glitch: newGlitch,
                gameTime: newGameTime,
                baseShadowMoveChance: newBaseShadowMoveChance,
                proximityAlert: newProximityAlert,
                shadowPowerUpTimer: newShadowPowerUpTimer,
            };
        });
    };

    useInterval(gameLoop, !isGameOver ? gameSpeed : null);
    
    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-lime-500/10 border border-slate-700">
            <div className="flex justify-between items-center mb-2 px-2 text-lime-300">
                <span className="font-bold">Score: {score}</span>
                <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
            </div>
            <div
                className={`relative bg-green-900 border-2 grid mx-auto ${glitch ? 'glitch-effect' : ''} ${proximityAlert ? 'border-red-500' : 'border-green-700'} transition-colors duration-200`}
                style={{
                    width: '100%',
                    maxWidth: 400,
                    aspectRatio: '1 / 1',
                    gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    imageRendering: 'pixelated', // For a crisp grid look
                }}
            >
                {isGameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center z-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-red-500 glitch-text">SYSTEM GLITCH...</h2>
                        <p className="text-lg mt-2">Final Score: {score}</p>
                        <button
                            onClick={restartGame}
                            className="mt-6 bg-lime-500 hover:bg-lime-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            REBOOT
                        </button>
                    </div>
                )}
                
                {/* Player Dot */}
                <div
                    className="bg-lime-400 rounded-full transition-all duration-75"
                    style={{
                        gridRow: player.y + 1,
                        gridColumn: player.x + 1,
                        boxShadow: '0 0 8px #a3e635, inset 0 0 4px #d9f99d',
                    }}
                />

                {/* Shadow */}
                <div
                    className={`${shadowPowerUpTimer > 0 ? 'shadow-power-up' : 'bg-slate-800'} opacity-75 transition-all duration-100`}
                    style={{
                        gridRow: shadow.y + 1,
                        gridColumn: shadow.x + 1,
                        transform: glitch ? `skew(${(Math.random() - 0.5) * 15}deg) scale(${1 + Math.random() * 0.2})` : 'none',
                        filter: 'blur(1px)',
                    }}
                />
                
                {/* Collectible */}
                <div
                    className="flex items-center justify-center text-lime-400 font-mono font-bold text-lg"
                    style={{ gridRow: collectible.y + 1, gridColumn: collectible.x + 1, textShadow: '0 0 6px #a3e635' }}
                >
                    {collectible.symbol}
                </div>
            </div>
            <Controls onKeyPress={handleKeyPress} onKeyRelease={() => {}} />
        </div>
    );
};

export default DotRunnerGame;