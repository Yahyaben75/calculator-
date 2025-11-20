import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '../hooks/useInterval';
import { Point, Direction } from '../types';
import Controls from './Controls';

const GRID_SIZE = 20;
const CELL_SIZE = 20; // in pixels
const GAME_SPEED = 150; // in ms
const FRUITS = ['🍎', '🍊', '🍓', '🍇', '🍉', '🍌', '🍍', '🍒'];

interface SnakeGameProps {
  onExit: () => void;
}

const createInitialState = () => {
  const startPoint = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
  return {
    snake: [startPoint],
    food: {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
      emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
    },
    direction: Direction.RIGHT,
    isGameOver: false,
    score: 0,
    speed: GAME_SPEED,
  };
};

const SnakeGame: React.FC<SnakeGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState(createInitialState());
  const directionBuffer = useRef<Direction | null>(null);

  const { snake, food, direction, isGameOver, score, speed } = gameState;

  const restartGame = useCallback(() => {
    directionBuffer.current = null;
    setGameState(createInitialState());
  }, []);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: { x: number; y: number; emoji: string };
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    let newDirection: Direction | null = null;
    switch (key) {
        case 'ArrowUp': newDirection = Direction.UP; break;
        case 'ArrowDown': newDirection = Direction.DOWN; break;
        case 'ArrowLeft': newDirection = Direction.LEFT; break;
        case 'ArrowRight': newDirection = Direction.RIGHT; break;
    }
    if (newDirection !== null) {
        directionBuffer.current = newDirection;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => !e.repeat && handleKeyPress(e.key);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyPress]);

  const gameLoop = () => {
    if (isGameOver) return;

    setGameState(prev => {
        let newDirection = prev.direction;
        const bufferedDirection = directionBuffer.current;
        if (bufferedDirection !== null) {
            if (bufferedDirection === Direction.UP && prev.direction !== Direction.DOWN) newDirection = bufferedDirection;
            else if (bufferedDirection === Direction.DOWN && prev.direction !== Direction.UP) newDirection = bufferedDirection;
            else if (bufferedDirection === Direction.LEFT && prev.direction !== Direction.RIGHT) newDirection = bufferedDirection;
            else if (bufferedDirection === Direction.RIGHT && prev.direction !== Direction.LEFT) newDirection = bufferedDirection;
            directionBuffer.current = null;
        }

        let newSnake = [...prev.snake];
        let head = { ...newSnake[0] };

        switch (newDirection) {
            case Direction.UP: head.y -= 1; break;
            case Direction.DOWN: head.y += 1; break;
            case Direction.LEFT: head.x -= 1; break;
            case Direction.RIGHT: head.x += 1; break;
        }

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            return { ...prev, isGameOver: true };
        }

        // Self collision
        for (let i = 1; i < newSnake.length; i++) {
            if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
                return { ...prev, isGameOver: true };
            }
        }
        
        newSnake.unshift(head);

        // Food collision
        if (head.x === prev.food.x && head.y === prev.food.y) {
            const newScore = prev.score + 1;
            const newSpeed = Math.max(50, prev.speed - 5);
            const newFood = generateFood(newSnake);
            return { ...prev, snake: newSnake, food: newFood, score: newScore, speed: newSpeed, direction: newDirection };
        } else {
            newSnake.pop();
            return { ...prev, snake: newSnake, direction: newDirection };
        }
    });
  };

  useInterval(gameLoop, !isGameOver ? speed : null);

  return (
    <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700">
      <div className="flex justify-between items-center mb-2 px-2 text-cyan-300">
        <span className="font-bold">Score: {score}</span>
        <button onClick={onExit} className="text-sm bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-md transition-colors">Exit</button>
      </div>
      <div
        className="bg-gray-900 border-2 border-slate-600 grid relative mx-auto"
        style={{
          width: '100%',
          maxWidth: GRID_SIZE * CELL_SIZE,
          aspectRatio: '1 / 1',
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        }}
      >
        {isGameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-10">
            <h2 className="text-4xl font-bold text-red-500">Game Over</h2>
            <p className="text-xl mt-2">Your Score: {score}</p>
            <button
              onClick={restartGame}
              className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`${index === 0 ? 'bg-emerald-400' : 'bg-emerald-600'}`}
            style={{ gridRow: segment.y + 1, gridColumn: segment.x + 1 }}
          />
        ))}
        <div
          className="flex items-center justify-center text-base"
          style={{ gridRow: food.y + 1, gridColumn: food.x + 1 }}
        >
          {food.emoji}
        </div>
      </div>
      <Controls onKeyPress={handleKeyPress} onKeyRelease={() => {}} />
    </div>
  );
};

export default SnakeGame;