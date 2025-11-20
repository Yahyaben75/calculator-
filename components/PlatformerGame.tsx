import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useInterval } from '../hooks/useInterval';
import Controls from './Controls';

// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 20;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;
const FRICTION = 0.8;
const SKIP_COST = 10;

// LocalStorage Keys
const SAVED_LEVEL_KEY = 'platformer_currentLevel';
const SAVED_COINS_KEY = 'platformer_totalCoins';
const GLITCH_FIXED_KEY = 'platformer_glitchFixed';
const UNLOCKED_SKINS_KEY = 'platformer_unlockedSkins';
const EQUIPPED_SKIN_KEY = 'platformer_equippedSkin';

type CharacterSkin = 'default' | 'glitch' | 'calculator';

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

const playJumpSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.1);
    } catch (e) { console.error("Could not play jump sound", e); }
};

const playCoinSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1046.50, context.currentTime); // C6
        gainNode.gain.setValueAtTime(0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
    } catch (e) { console.error("Could not play coin sound", e); }
};

const playHurtSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, context.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.3);
    } catch (e) { console.error("Could not play hurt sound", e); }
};

const playWinSound = () => {
    const context = getAudioContext();
    if (!context) return;
    try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = 'sine';
        const now = context.currentTime;
        gainNode.gain.setValueAtTime(0.2, now);

        // Arpeggio
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
        oscillator.frequency.setValueAtTime(1046.50, now + 0.3); // C6

        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } catch (e) { console.error("Could not play win sound", e); }
};

interface LevelData {
  playerStart: { x: number; y: number };
  platforms: { x: number; y: number; width: number; height: number }[];
  coins: { x: number; y: number }[];
  hazards: { x: number; y: number; width: number; height: number }[];
  goal: { x: number; y: number; size: number };
  atm?: { x: number; y: number; width: number; height: number };
  terminal?: { x: number; y: number; width: number; height: number };
}

// Level data for 15 levels
const levels: LevelData[] = [
  // Level 1: The Basics
  {
    playerStart: { x: 50, y: 340 },
    platforms: [ { x: 0, y: GAME_HEIGHT - 20, width: 200, height: 20 }, { x: 250, y: GAME_HEIGHT - 20, width: 150, height: 20 }, { x: 100, y: 300, width: 150, height: 20 }, { x: 200, y: 220, width: 150, height: 20 }, { x: 100, y: 140, width: 150, height: 20 }, { x: 0, y: 80, width: 100, height: 15 }, ],
    coins: [{ x: 150, y: 270 }, { x: 250, y: 190 }, { x: 40, y: 50 }],
    hazards: [],
    goal: { x: 10, y: 40, size: 30 }
  },
  // Level 2: First Jumps
  {
    playerStart: { x: 20, y: 360 },
    platforms: [ { x: 0, y: 380, width: 80, height: 20 }, { x: 120, y: 340, width: 80, height: 20 }, { x: 230, y: 300, width: 80, height: 20 }, { x: 320, y: 250, width: 80, height: 20 }, { x: 230, y: 180, width: 80, height: 20 }, { x: 120, y: 120, width: 80, height: 20 }, ],
    coins: [{ x: 140, y: 310 }, { x: 340, y: 220 }, { x: 140, y: 90 }],
    hazards: [],
    goal: { x: 140, y: 80, size: 30 }
  },
   // Level 3: Introduction to Hazards
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 100, y: 300, width: 200, height: 20 }, { x: 0, y: 220, width: 150, height: 20 }, { x: 250, y: 150, width: 150, height: 20 }, ],
    coins: [{ x: 200, y: 270 }, { x: 70, y: 190 }, { x: 320, y: 120 }],
    hazards: [ { x: 120, y: 360, width: 160, height: 20 } ],
    goal: { x: 350, y: 110, size: 30 },
  },
  // Level 4: A Little Tricker
  {
    playerStart: { x: 360, y: 340 },
    platforms: [ { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 350, y: 300, width: 50, height: 10 }, { x: 250, y: 250, width: 50, height: 10 }, { x: 150, y: 200, width: 50, height: 10 }, { x: 50, y: 150, width: 50, height: 10 }, ],
    coins: [{ x: 260, y: 220 }, { x: 60, y: 120 }],
    hazards: [ { x: 0, y: 360, width: 300, height: 20 }],
    goal: { x: 60, y: 110, size: 30 }
  },
   // Level 5: The Glitch
  {
    playerStart: { x: 30, y: 340 },
    platforms: [
      { x: 0, y: 380, width: 100, height: 20 }, // start
      { x: 150, y: 340, width: 100, height: 20 },
      { x: 300, y: 300, width: 100, height: 20 }, // platform for terminal
      { x: 150, y: 260, width: 50, height: 20 },
      { x: 50, y: 200, width: 50, height: 20 },
    ],
    coins: [{ x: 180, y: 310 }, { x: 60, y: 170 }],
    hazards: [{ x: 100, y: 390, width: 200, height: 10 }],
    goal: { x: 60, y: 160, size: 30 },
    terminal: { x: 335, y: 260, width: 30, height: 40 },
  },
  // Level 6: Gauntlet
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 50, y: 300, width: 300, height: 20 }, { x: 50, y: 220, width: 300, height: 20 }, { x: 50, y: 140, width: 300, height: 20 }, ],
    coins: [{ x: 200, y: 350 }, { x: 100, y: 270 }, { x: 300, y: 190 }, { x: 200, y: 110 }],
    hazards: [ { x: 100, y: 360, width: 20, height: 20 }, { x: 180, y: 360, width: 20, height: 20 }, { x: 260, y: 360, width: 20, height: 20 }, { x: 80, y: 280, width: 20, height: 20 }, { x: 220, y: 280, width: 20, height: 20 }, { x: 150, y: 200, width: 100, height: 20 }, ],
    goal: { x: 310, y: 100, size: 30 }
  },
  // Level 7: Leap of Faith
  {
    playerStart: { x: 20, y: 80 },
    platforms: [ { x: 0, y: 120, width: 80, height: 20 }, { x: 200, y: 120, width: 20, height: 20 }, { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 350, y: 300, width: 50, height: 20 }, ],
    coins: [{ x: 205, y: 90 }, { x: 365, y: 270 }],
    hazards: [{ x: 80, y: 360, width: 220, height: 20 }],
    goal: { x: 360, y: 260, size: 30 }
  },
  // Level 8: Boxed In
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 0, y: 0, width: 20, height: 380 }, { x: 380, y: 0, width: 20, height: 380 }, { x: 0, y: 0, width: GAME_WIDTH, height: 20 }, { x: 80, y: 300, width: 40, height: 20 }, { x: 180, y: 240, width: 40, height: 20 }, { x: 280, y: 180, width: 40, height: 20 }, { x: 180, y: 120, width: 40, height: 20 }, ],
    coins: [{ x: 90, y: 270 }, { x: 290, y: 150 }, { x: 190, y: 90 }],
    hazards: [ { x: 70, y: 360, width: 310, height: 20 }, ],
    goal: { x: 185, y: 80, size: 30 }
  },
  // Level 9: Precision
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: 50, height: 20 }, { x: 100, y: 350, width: 20, height: 20 }, { x: 170, y: 320, width: 20, height: 20 }, { x: 240, y: 290, width: 20, height: 20 }, { x: 310, y: 260, width: 20, height: 20 }, { x: 350, y: 220, width: 50, height: 20 }, { x: 310, y: 150, width: 20, height: 20 }, { x: 240, y: 120, width: 20, height: 20 }, { x: 170, y: 90, width: 20, height: 20 }, { x: 0, y: 120, width: 50, height: 20 }, ],
    coins: [{ x: 245, y: 260 }, { x: 360, y: 190 }, { x: 175, y: 60 }],
    hazards: [],
    goal: { x: 10, y: 80, size: 30 }
  },
  // Level 10: The Finale
  {
    playerStart: { x: 190, y: 20 },
    platforms: [ { x: 180, y: 60, width: 40, height: 20 }, { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 0, y: 120, width: 40, height: 20 }, { x: 80, y: 180, width: 40, height: 20 }, { x: 160, y: 240, width: 40, height: 20 }, { x: 240, y: 300, width: 40, height: 20 }, { x: 340, y: 100, width: 40, height: 20 }, ],
    coins: [{ x: 10, y: 90 }, { x: 90, y: 150 }, { x: 170, y: 210 }, { x: 250, y: 270 }, { x: 350, y: 70 }],
    hazards: [ { x: 0, y: 360, width: 100, height: 20 }, { x: 150, y: 360, width: 100, height: 20 }, { x: 300, y: 360, width: 100, height: 20 }, ],
    goal: { x: 350, y: 60, size: 30 }
  },
  // Level 11: Up and Over
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: 150, height: 20 }, { x: 250, y: 380, width: 150, height: 20 }, { x: 180, y: 300, width: 40, height: 100 }, { x: 100, y: 240, width: 200, height: 20 }, { x: 350, y: 180, width: 50, height: 20 }, ],
    coins: [{ x: 190, y: 270 }, { x: 110, y: 210 }, { x: 360, y: 150 }],
    hazards: [{ x: 150, y: 380, width: 100, height: 20 }],
    goal: { x: 360, y: 140, size: 30 },
    atm: { x: 350, y: 340, width: 30, height: 40 }
  },
  // Level 12: Hazard Maze
  {
    playerStart: { x: 20, y: 340 },
    platforms: [ { x: 0, y: 380, width: GAME_WIDTH, height: 20 }, { x: 0, y: 300, width: 300, height: 20 }, { x: 100, y: 220, width: 300, height: 20 }, { x: 0, y: 140, width: 300, height: 20 }, ],
    coins: [{ x: 280, y: 270 }, { x: 120, y: 190 }, { x: 280, y: 110 }],
    hazards: [ { x: 320, y: 320, width: 20, height: 60 }, { x: 80, y: 240, width: 20, height: 60 }, { x: 320, y: 160, width: 20, height: 60 }, ],
    goal: { x: 20, y: 100, size: 30 }
  },
  // Level 13: Zigzag Climb (RE-FIXED)
  {
    playerStart: { x: 20, y: 340 },
    platforms: [
      { x: 0, y: 380, width: 50, height: 20 }, // Start platform
      { x: 100, y: 320, width: 50, height: 20 },
      { x: 200, y: 260, width: 50, height: 20 },
      { x: 100, y: 200, width: 50, height: 20 },
      { x: 200, y: 140, width: 50, height: 20 },
      { x: 300, y: 80, width: 50, height: 20 },
      { x: 350, y: 380, width: 50, height: 20 }, // Unused side platform
    ],
    coins: [{ x: 110, y: 290 }, { x: 210, y: 230 }, { x: 110, y: 170 }, { x: 210, y: 110 }],
    hazards: [{ x: 50, y: 380, width: 300, height: 20 }],
    goal: { x: 310, y: 40, size: 30 }
  },
  // Level 14: The Drop
  {
    playerStart: { x: 190, y: 20 },
    platforms: [ { x: 180, y: 60, width: 40, height: 20 }, { x: 300, y: 150, width: 40, height: 20 }, { x: 100, y: 250, width: 40, height: 20 }, { x: 200, y: 350, width: 40, height: 20 }, ],
    coins: [{ x: 310, y: 120 }, { x: 110, y: 220 }, { x: 210, y: 320 }],
    hazards: [],
    goal: { x: 210, y: 310, size: 30 }
  },
  // Level 15: Thin Ice
  {
    playerStart: { x: 10, y: 340 },
    platforms: [ { x: 0, y: 380, width: 40, height: 20 }, { x: 80, y: 360, width: 30, height: 10 }, { x: 150, y: 340, width: 30, height: 10 }, { x: 220, y: 320, width: 30, height: 10 }, { x: 290, y: 300, width: 30, height: 10 }, { x: 360, y: 280, width: 40, height: 20 }, ],
    coins: [{ x: 160, y: 310 }, { x: 300, y: 270 }, { x: 370, y: 250 }],
    hazards: [{ x: 0, y: 390, width: 400, height: 10 }],
    goal: { x: 370, y: 240, size: 30 }
  },
];


interface PlatformerGameProps {
  onExit: () => void;
}

const createInitialState = (levelIndex: number) => {
  const level = levels[levelIndex];
  return {
    player: { ...level.playerStart, vx: 0, vy: 0, onGround: false, scaleX: 1, scaleY: 1 },
    collectedCoins: [] as number[],
    keys: {} as Record<string, boolean>,
    status: 'playing' as 'playing' | 'win' | 'lose' | 'paused' | 'inTerminal',
  };
};

const PlayerSprite: React.FC<{
    skin: CharacterSkin;
    isGlitchLevel: boolean;
    style: React.CSSProperties;
}> = ({ skin, isGlitchLevel, style }) => {

    switch (skin) {
        case 'glitch':
            return (
                <div className="absolute" style={style}>
                    <div className="w-full h-full glitch-player relative">
                        <div className="absolute bg-red-500 rounded-full" style={{ width: '40%', height: '40%', top: '30%', left: '30%', boxShadow: '0 0 5px red' }} />
                    </div>
                </div>
            );
        case 'calculator':
            return (
                 <div className={`absolute bg-slate-700 ${isGlitchLevel ? 'glitch-player' : ''}`} style={style}>
                    <div className="absolute bg-emerald-900" style={{ width: '80%', height: '25%', top: '10%', left: '10%' }}/>
                    <div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', left: '20%', top: '50%'}} />
                    <div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', right: '20%', top: '50%'}} />
                    <div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', left: '20%', top: '75%'}} />
                    <div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', right: '20%', top: '75%'}} />
                </div>
            );
        default: // 'default' skin
            return (
                <div
                    className={`absolute ${isGlitchLevel ? 'glitch-player' : 'bg-cyan-400'}`}
                    style={{...style, boxShadow: isGlitchLevel ? '0 0 10px #f0f, 0 0 10px #0ff' : '0 0 10px #67e8f9' }}
                />
            );
    }
};

const SKINS: Record<CharacterSkin, { name: string; cost: number; component: React.FC<{style?: React.CSSProperties}> }> = {
    'default': { name: 'Default', cost: 0, component: ({style}) => <div className="w-full h-full bg-cyan-400" style={{ ...style, boxShadow: '0 0 10px #67e8f9'}} /> },
    'glitch': { name: 'Glitch', cost: 50, component: ({style}) => <div className="w-full h-full glitch-player relative" style={style}><div className="absolute bg-red-500 rounded-full" style={{ width: '40%', height: '40%', top: '30%', left: '30%', boxShadow: '0 0 5px red' }} /></div> },
    'calculator': { name: 'Calculator', cost: 50, component: ({style}) => <div className="w-full h-full bg-slate-700 relative" style={style}><div className="absolute bg-emerald-900" style={{ width: '80%', height: '25%', top: '10%', left: '10%' }}/><div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', left: '20%', top: '50%'}} /><div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', right: '20%', top: '50%'}} /><div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', left: '20%', top: '75%'}} /><div className="absolute bg-gray-500 rounded-full" style={{ width: '15%', height: '15%', right: '20%', top: '75%'}} /></div> }
};


const PlatformerGame: React.FC<PlatformerGameProps> = ({ onExit }) => {
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        try { const savedLevel = localStorage.getItem(SAVED_LEVEL_KEY); const levelNum = savedLevel ? parseInt(savedLevel, 10) : 0; return levelNum < levels.length ? levelNum : 0; } catch (e) { return 0; }
    });

    const [totalCoins, setTotalCoins] = useState<number>(() => {
        try { const savedCoins = localStorage.getItem(SAVED_COINS_KEY); return savedCoins ? parseInt(savedCoins, 10) : 0; } catch (e) { return 0; }
    });

    const [isGlitchFixed, setIsGlitchFixed] = useState<boolean>(() => {
        try { return localStorage.getItem(GLITCH_FIXED_KEY) === 'true'; } catch (e) { return false; }
    });

    const [unlockedSkins, setUnlockedSkins] = useState<CharacterSkin[]>(() => {
        try { const saved = localStorage.getItem(UNLOCKED_SKINS_KEY); return saved ? JSON.parse(saved) : ['default']; } catch (e) { return ['default']; }
    });
    
    const [equippedSkin, setEquippedSkin] = useState<CharacterSkin>(() => {
        try { const saved = localStorage.getItem(EQUIPPED_SKIN_KEY); return saved ? (saved as CharacterSkin) : 'default'; } catch (e) { return 'default'; }
    });

    const [isShopOpen, setIsShopOpen] = useState(false);
    
    const [gameState, setGameState] = useState(createInitialState(currentLevel));
    const [showAtmPrompt, setShowAtmPrompt] = useState(false);
    const [atmCode, setAtmCode] = useState('');
    const [atmMessage, setAtmMessage] = useState('');
    const [atmUsedLevels, setAtmUsedLevels] = useState<Record<number, boolean>>({});
    const [terminalInput, setTerminalInput] = useState('');
    const [terminalUsedLevels, setTerminalUsedLevels] = useState<Record<number, boolean>>({});

    // State for hacker terminal animation
    const [terminalLine1, setTerminalLine1] = useState('');
    const [terminalLine2, setTerminalLine2] = useState('');
    const [showHints, setShowHints] = useState(false);
    const fullTerminalText1 = `> ACCESSING Main_System_Core.dll...\n> BYPASSING security_protocol.vtx...\n> Connection Established. Glitch detected in Reality_Matrix.\n> Awaiting override code to stabilize system.`;
    const fullTerminalText2 = `> HINT SCATTERED:`;

    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    
    const isGlitchLevel = currentLevel < 5 && !isGlitchFixed;

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const updateScale = () => { if (viewport) setScale(viewport.offsetWidth / GAME_WIDTH); };
        const observer = new ResizeObserver(updateScale);
        observer.observe(viewport);
        updateScale();
        return () => observer.disconnect();
    }, []);
    
    useEffect(() => { localStorage.setItem(SAVED_LEVEL_KEY, currentLevel.toString()); }, [currentLevel]);
    useEffect(() => { localStorage.setItem(SAVED_COINS_KEY, totalCoins.toString()); }, [totalCoins]);
    useEffect(() => { localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(unlockedSkins)); }, [unlockedSkins]);
    useEffect(() => { localStorage.setItem(EQUIPPED_SKIN_KEY, equippedSkin); }, [equippedSkin]);
    
    useEffect(() => {
        localStorage.setItem(GLITCH_FIXED_KEY, isGlitchFixed.toString());
        if (isGlitchFixed) {
            window.dispatchEvent(new CustomEvent('glitchFixed'));
        }
    }, [isGlitchFixed]);

    const { player, collectedCoins, keys, status } = gameState;
    const level = levels[currentLevel];

    const restartCurrentLevel = useCallback(() => setGameState(createInitialState(currentLevel)), [currentLevel]);
    
    useEffect(() => {
        if (status === 'win') {
            const isLastLevel = currentLevel === levels.length - 1;
            if (!isLastLevel) {
                const coinsThisLevel = collectedCoins.length;
                const timer = setTimeout(() => {
                    setTotalCoins(prev => prev + coinsThisLevel);
                    const nextLevelIndex = currentLevel + 1;
                    setCurrentLevel(nextLevelIndex);
                    setGameState(createInitialState(nextLevelIndex));
                }, 1500);

                return () => clearTimeout(timer);
            }
        }
    }, [status, currentLevel, collectedCoins.length]);

    useEffect(() => {
        if (status !== 'playing' || isShopOpen) return;

        const level = levels[currentLevel];
        if (level.atm && !atmUsedLevels[currentLevel]) {
            const atm = level.atm;
            const distToAtm = Math.hypot(player.x + PLAYER_WIDTH / 2 - (atm.x + atm.width / 2), player.y + PLAYER_HEIGHT / 2 - (atm.y + atm.height / 2));
            if (distToAtm < PLAYER_WIDTH / 2 + atm.width) {
                setGameState(p => ({...p, status: 'paused' }));
                setShowAtmPrompt(true);
            }
        }
        if (level.terminal && !terminalUsedLevels[currentLevel]) {
            const terminal = level.terminal;
             const distToTerminal = Math.hypot(player.x + PLAYER_WIDTH / 2 - (terminal.x + terminal.width / 2), player.y + PLAYER_HEIGHT / 2 - (terminal.y + terminal.height / 2));
            if (distToTerminal < PLAYER_WIDTH / 2 + terminal.width) {
                setGameState(p => ({...p, status: 'inTerminal'}));
            }
        }
    }, [player, status, currentLevel, atmUsedLevels, terminalUsedLevels, isShopOpen]);
    
    useEffect(() => {
        if (status === 'inTerminal') {
            setTerminalLine1('');
            setTerminalLine2('');
            setShowHints(false);

            let i = 0;
            const type1 = () => {
                if (i < fullTerminalText1.length) {
                    setTerminalLine1(prev => prev + fullTerminalText1.charAt(i));
                    i++;
                    setTimeout(type1, 20);
                } else {
                    let j = 0;
                    const type2 = () => {
                        if (j < fullTerminalText2.length) {
                            setTerminalLine2(prev => prev + fullTerminalText2.charAt(j));
                            j++;
                            setTimeout(type2, 30);
                        } else {
                            setShowHints(true);
                        }
                    }
                    type2();
                }
            };
            const timer = setTimeout(type1, 100);
            return () => clearTimeout(timer);
        }
    }, [status]);

    useEffect(() => {
        if (status !== 'inTerminal') return;
        
        const handleTerminalInput = (e: KeyboardEvent) => {
            if (!showHints || isGlitchFixed) return;
            if (e.key === 'Backspace') setTerminalInput(prev => prev.slice(0, -1));
            else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) setTerminalInput(prev => (prev + e.key.toUpperCase()).slice(0, 5));
        };
        
        window.addEventListener('keydown', handleTerminalInput);
        
        if (terminalInput === 'YAHYA') {
            if (!isGlitchFixed) {
                setIsGlitchFixed(true);
                setTerminalUsedLevels(prev => ({...prev, [currentLevel]: true}));
                setTimeout(() => {
                    setGameState(p => ({...p, status: 'playing'}));
                    setTerminalInput('');
                }, 3000);
            }
        }

        return () => window.removeEventListener('keydown', handleTerminalInput);

    }, [status, terminalInput, showHints, isGlitchFixed, currentLevel]);

    const handleSkipLevel = () => {
        if (totalCoins >= SKIP_COST && currentLevel < levels.length - 1) {
            setTotalCoins(prev => prev - SKIP_COST);
            const nextLevel = currentLevel + 1;
            setCurrentLevel(nextLevel);
            setGameState(createInitialState(nextLevel));
        }
    };
    
    const handleAtmSubmit = () => {
        if (atmCode === '2011') {
            setTotalCoins(prev => prev + 1000);
            setAtmMessage('Success! 1000 coins added.');
            setAtmUsedLevels(prev => ({...prev, [currentLevel]: true }));
            setTimeout(() => {
                setShowAtmPrompt(false); setAtmMessage(''); setAtmCode('');
                setGameState(p => ({...p, status: 'playing' }));
            }, 1500);
        } else {
            setAtmMessage('Incorrect code.'); setAtmCode('');
            setTimeout(() => setAtmMessage(''), 1500);
        }
    };

    const handleAtmCancel = () => {
        setShowAtmPrompt(false); setAtmMessage(''); setAtmCode('');
        setGameState(p => ({...p, status: 'playing' }));
    };

    const resetGameAndProgress = useCallback(() => {
        localStorage.removeItem(SAVED_LEVEL_KEY);
        localStorage.removeItem(SAVED_COINS_KEY);
        localStorage.removeItem(GLITCH_FIXED_KEY);
        // Skins and equipped character are now persistent across game resets.
        // localStorage.removeItem(UNLOCKED_SKINS_KEY);
        // localStorage.removeItem(EQUIPPED_SKIN_KEY);
        setCurrentLevel(0);
        setTotalCoins(0);
        setIsGlitchFixed(false);
        // setUnlockedSkins(['default']);
        // setEquippedSkin('default');
        setGameState(createInitialState(0));
    }, []);

    const handleKeyPress = useCallback((key: string) => setGameState(p => ({ ...p, keys: { ...p.keys, [key]: true } })), []);
    const handleKeyRelease = useCallback((key: string) => setGameState(p => ({ ...p, keys: { ...p.keys, [key]: false } })), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => !e.repeat && handleKeyPress(e.key);
        const handleKeyUp = (e: KeyboardEvent) => handleKeyRelease(e.key);
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, [handleKeyPress, handleKeyRelease]);

    const gameLoop = useCallback(() => {
        setGameState(prev => {
            if (prev.status !== 'playing' || isShopOpen) return prev;
            
            const activeLevel = levels[currentLevel];
            let { x, y, vx, vy, onGround, scaleX, scaleY } = prev.player;

            let newStatus: 'playing' | 'win' | 'lose' | 'paused' | 'inTerminal' = prev.status;

            if (prev.keys['ArrowLeft']) vx = -MOVE_SPEED; else if (prev.keys['ArrowRight']) vx = MOVE_SPEED;
            vx *= FRICTION; if (Math.abs(vx) < 0.1) vx = 0; x += vx;
            if (x < 0) x = 0; if (x > GAME_WIDTH - PLAYER_WIDTH) x = GAME_WIDTH - PLAYER_WIDTH;

            vy += GRAVITY; y += vy;
            const wasOnGround = prev.player.onGround; onGround = false;

            for (const p of activeLevel.platforms) {
                if (x + PLAYER_WIDTH > p.x && x < p.x + p.width && y + PLAYER_HEIGHT > p.y && y < p.y + p.height) {
                    if (prev.player.y + PLAYER_HEIGHT <= p.y && vy >= 0) {
                        y = p.y - PLAYER_HEIGHT; vy = 0; onGround = true;
                    }
                }
            }
            
            if ((prev.keys['ArrowUp'] || prev.keys[' ']) && onGround) {
                vy = JUMP_FORCE; playJumpSound(); scaleX = 0.7; scaleY = 1.3;
            }
            if (!wasOnGround && onGround) { scaleX = 1.3; scaleY = 0.7; }
            scaleX += (1 - scaleX) * 0.2; scaleY += (1 - scaleY) * 0.2;

            const newCollectedCoins = [...prev.collectedCoins]; let coinCollectedThisFrame = false;
            activeLevel.coins.forEach((coin, index) => {
                if (!newCollectedCoins.includes(index)) {
                    const dist = Math.hypot(x + PLAYER_WIDTH / 2 - (coin.x + 10), y + PLAYER_HEIGHT / 2 - (coin.y + 10));
                    if (dist < PLAYER_WIDTH / 2 + 10) { newCollectedCoins.push(index); coinCollectedThisFrame = true; }
                }
            });
            if (coinCollectedThisFrame) playCoinSound();

            for (const h of activeLevel.hazards) if (x + PLAYER_WIDTH > h.x && x < h.x + h.width && y + PLAYER_HEIGHT > h.y && y < h.y + h.height) newStatus = 'lose';
            if (y > GAME_HEIGHT + 50) newStatus = 'lose';
            if (newStatus === 'lose' && prev.status === 'playing') playHurtSound();

            const goalDist = Math.hypot(x + PLAYER_WIDTH/2 - (activeLevel.goal.x + activeLevel.goal.size/2), y + PLAYER_HEIGHT/2 - (activeLevel.goal.y + activeLevel.goal.size/2));
            if (goalDist < PLAYER_WIDTH/2 + activeLevel.goal.size/2) {
                if (prev.status === 'playing') playWinSound();
                newStatus = 'win';
            }

            return { ...prev, player: { x, y, vx, vy, onGround, scaleX, scaleY }, collectedCoins: newCollectedCoins, status: newStatus };
        });
    }, [currentLevel, isShopOpen]);

    useInterval(gameLoop, status === 'playing' ? 16 : null);

    const score = collectedCoins.length;

    const handleBuySkin = (skin: CharacterSkin, cost: number) => {
        if (totalCoins >= cost && !unlockedSkins.includes(skin)) {
            setTotalCoins(prev => prev - cost);
            const newSkins = [...unlockedSkins, skin];
            setUnlockedSkins(newSkins);
            setEquippedSkin(skin);
        }
    };
    
    const handleEquipSkin = (skin: CharacterSkin) => {
        if (unlockedSkins.includes(skin)) {
            setEquippedSkin(skin);
        }
    };

    const renderWinOverlay = () => {
        const isLastLevel = currentLevel === levels.length - 1;
        return (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center z-20 animate-fade-in-fast">
                <h2 className="text-4xl font-bold text-emerald-400">{isLastLevel ? 'You Win!' : 'Level Complete!'}</h2>
                {isLastLevel && (
                    <>
                        <p className="text-xl mt-2 text-yellow-300">Total Coins: {totalCoins + collectedCoins.length} 💰</p>
                        <p className="text-lg mt-4 text-white">You've completed all the levels!</p>
                        <button
                            onClick={resetGameAndProgress}
                            className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Play Again from Start
                        </button>
                    </>
                )}
            </div>
        );
    };
    const renderLoseOverlay = () => (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center z-20 animate-fade-in-fast">
            <h2 className="text-4xl font-bold text-red-500">Game Over</h2>
            <button
                onClick={restartCurrentLevel}
                className="mt-6 bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                Try Again
            </button>
        </div>
    );
    const renderAtmPrompt = () => (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center z-20 p-4">
            <div className="bg-slate-700 p-6 rounded-lg shadow-lg border-2 border-cyan-400 w-full max-w-xs animate-zoom-in-fast">
                <h2 className="text-xl font-bold text-center text-cyan-300 mb-4">YAKI ATM</h2>
                <input
                    type="text"
                    value={atmCode}
                    onChange={(e) => setAtmCode(e.target.value.slice(0, 4))}
                    className="w-full bg-gray-900 text-white text-center text-2xl p-2 rounded border-2 border-slate-500 focus:border-cyan-400 focus:outline-none"
                    placeholder="****"
                    maxLength={4}
                />
                <p className="text-center h-6 mt-2 text-yellow-300">{atmMessage}</p>
                <div className="flex justify-between mt-4 space-x-2">
                    <button
                        onClick={handleAtmCancel}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAtmSubmit}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Enter
                    </button>
                </div>
            </div>
        </div>
    );
    const renderTerminalOverlay = () => {
        const hintLetters = ['Y', 'A', 'H', 'Y', 'A'];
        return (
            <div className="terminal-overlay scanlines">
                <div className="w-full max-w-2xl p-4 text-emerald-400 relative z-10">
                    <div className="terminal-text">
                        <p>{terminalLine1}</p>
                        {terminalLine1.length === fullTerminalText1.length && <p>{terminalLine2}</p>}
                    </div>
                    
                    {showHints && !isGlitchFixed && (
                        <div className="my-4 text-center">
                            {hintLetters.map((letter, i) => (
                                <span key={i} className="hint-letter" style={{ animationDelay: `${i * 0.15 + Math.random() * 0.2}s` }}>
                                    {letter}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {showHints && !isGlitchFixed && (
                        <div className="flex items-center mt-4">
                            <span className="text-emerald-400 text-2xl">&gt; </span>
                            <p className="bg-transparent text-emerald-400 text-3xl tracking-[.2em] ml-2 h-10">{terminalInput}</p>
                            <span className="terminal-cursor" />
                        </div>
                    )}

                    {isGlitchFixed && (
                        <div className="mt-4 text-center animate-fade-in-fast">
                            <p className="text-3xl text-cyan-400">CODE ACCEPTED.</p>
                            <p className="text-xl text-white mt-2">RECALIBRATING REALITY MATRIX...</p>
                             <p className="text-md text-gray-400 mt-1">STABILIZATION COMPLETE.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const renderShopOverlay = () => (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center z-20 animate-fade-in-fast p-4">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-2 border-purple-500 w-full max-w-md relative animate-zoom-in-fast">
                <h2 className="text-3xl font-bold text-center text-purple-400 mb-2">Character Shop</h2>
                <p className="text-center text-lg text-yellow-300 mb-6">Your Coins: {totalCoins} 💰</p>
                <div className="flex justify-around items-start gap-2 sm:gap-4">
                    {(Object.keys(SKINS) as CharacterSkin[]).map(skinId => {
                        const skin = SKINS[skinId];
                        const isUnlocked = unlockedSkins.includes(skinId);
                        const isEquipped = equippedSkin === skinId;
                        const canAfford = totalCoins >= skin.cost;
                        const SkinComponent = skin.component;
                        return (
                            <div key={skinId} className="flex flex-col items-center p-2 bg-slate-700 rounded-lg w-1/3">
                                <div className="w-16 h-16 mb-2 relative"><SkinComponent /></div>
                                <p className="font-bold text-sm sm:text-base">{skin.name}</p>
                                {isEquipped ? (
                                    <button disabled className="mt-2 w-full text-sm bg-emerald-700 text-white font-bold py-1 px-2 rounded-lg cursor-default">Equipped</button>
                                ) : isUnlocked ? (
                                    <button onClick={() => handleEquipSkin(skinId)} className="mt-2 w-full text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-2 rounded-lg transition-colors">Equip</button>
                                ) : (
                                    <button onClick={() => handleBuySkin(skinId, skin.cost)} disabled={!canAfford} className="mt-2 w-full text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-2 rounded-lg transition-colors">
                                        {skin.cost} 💰
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
                <button onClick={() => setIsShopOpen(false)} className="absolute top-2 right-2 text-2xl font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-full w-8 h-8 flex items-center justify-center transition-colors">&times;</button>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-purple-500/10 border border-slate-700">
            <div className="flex justify-between items-center mb-2 px-2 text-purple-300 flex-wrap gap-2">
                <span className={`font-bold ${isGlitchLevel ? 'glitch-text' : ''}`}>Level: {currentLevel + 1}/{levels.length}</span>
                <span className={`font-bold ${isGlitchLevel ? 'glitch-text' : ''}`}>Coins: {totalCoins} 💰</span>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsShopOpen(true)} className="text-sm bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-md transition-colors">Shop</button>
                    <button onClick={handleSkipLevel} disabled={totalCoins < SKIP_COST || currentLevel >= levels.length - 1} className="text-sm bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded-md transition-colors" title={totalCoins < SKIP_COST ? `Need ${SKIP_COST} coins!` : 'Skip Level'}>Skip</button>
                    <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
                </div>
            </div>
            <div
                ref={viewportRef}
                className={`relative overflow-hidden mx-auto border-2 border-slate-600 ${isGlitchLevel ? 'glitch-effect' : ''}`}
                style={{ width: '100%', maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}` }}
            >
                <div
                  className="bg-gray-900"
                  style={{ position: 'absolute', top: 0, left: 0, width: GAME_WIDTH, height: GAME_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                >
                    {status === 'win' && renderWinOverlay()}
                    {status === 'lose' && renderLoseOverlay()}
                    {status === 'paused' && showAtmPrompt && renderAtmPrompt()}
                    {status === 'inTerminal' && renderTerminalOverlay()}
                    {isShopOpen && renderShopOverlay()}
                    
                    {level.platforms.map((p, i) => ( <div key={`p-${i}`} className="absolute bg-slate-600 border-t-2 border-slate-400" style={{ left: p.x, top: p.y, width: p.width, height: p.height }} /> ))}
                    {level.hazards.map((h, i) => ( <div key={`h-${i}`} className="absolute bg-red-500" style={{ left: h.x, top: h.y, width: h.width, height: h.height, boxShadow: '0 0 10px #ef4444' }} /> ))}
                    {level.coins.map((c, i) => !collectedCoins.includes(i) && ( <div key={`c-${i}`} className="absolute bg-yellow-400 rounded-full" style={{ left: c.x, top: c.y, width: 20, height: 20, boxShadow: '0 0 10px #facc15' }} /> ))}

                    {level.atm && ( <div className={`absolute bg-gray-700 rounded-t-md p-1 flex flex-col items-center transition-all duration-300 ${atmUsedLevels[currentLevel] ? 'opacity-50' : 'shadow-cyan-400/50 shadow-lg animate-pulse'}`} style={{ left: level.atm.x, top: level.atm.y, width: level.atm.width, height: level.atm.height, animationIterationCount: 'infinite', animationDuration: '2s' }}> <div className="text-white text-[8px] font-bold">YAKI</div> <div className="w-[80%] h-[15px] bg-cyan-300 rounded-sm my-1 border-2 border-black flex items-center justify-center text-[7px] text-black"> ATM </div> <div className="w-[60%] h-[5px] bg-gray-500 rounded-sm" /> </div> )}
                    {level.terminal && ( <div className={`absolute bg-gray-800 rounded-t-md p-1 flex flex-col items-center transition-all duration-300 ${terminalUsedLevels[currentLevel] ? 'opacity-30' : 'shadow-emerald-400/50 shadow-lg animate-pulse'}`} style={{ left: level.terminal.x, top: level.terminal.y, width: level.terminal.width, height: level.terminal.height, animationIterationCount: 'infinite', animationDuration: '1.5s' }}> <div className="w-full h-2 bg-emerald-400" /> <div className="w-[80%] h-full bg-black mt-1 p-0.5"> <div className="w-full h-full bg-emerald-900" /> </div> </div> )}

                    <div className="absolute bg-emerald-500 rounded-full animate-pulse" style={{ left: level.goal.x, top: level.goal.y, width: level.goal.size, height: level.goal.size, boxShadow: '0 0 15px #34d399' }} />

                    <PlayerSprite
                        skin={equippedSkin}
                        isGlitchLevel={isGlitchLevel}
                        style={{
                            left: player.x,
                            top: player.y,
                            width: PLAYER_WIDTH,
                            height: PLAYER_HEIGHT,
                            transform: `scale(${player.scaleX}, ${player.scaleY})`,
                            transformOrigin: 'bottom',
                        }}
                    />
                </div>
            </div>
            <Controls onKeyPress={handleKeyPress} onKeyRelease={handleKeyRelease} variant="platformer" />
        </div>
    );
};

export default PlatformerGame;