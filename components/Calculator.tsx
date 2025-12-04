
import React, { useState } from 'react';

interface CalculatorProps {
  onActivateGame: (game: string) => void;
}

const CalculatorButton: React.FC<{
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className = '', children }) => (
  <button
    onClick={onClick}
    className={`bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-2xl font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${className}`}
  >
    {children}
  </button>
);

const Calculator: React.FC<CalculatorProps> = ({ onActivateGame }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const handleNumberClick = (num: string) => {
    if (display === 'Error') {
        setDisplay(num);
        setExpression(num);
        return;
    }
    if (display === '0' && num !== '.') {
      setDisplay(num);
      setExpression(num);
    } else {
      setDisplay(prev => prev + num);
      setExpression(prev => prev + num);
    }
  };
  
  const handleOperatorClick = (op: string) => {
    if (display === 'Error') return;
    setDisplay(display + op);
    setExpression(expression + op);
  };
  
  const handleEquals = () => {
    // Secret Codes
    if (display === '0') {
        onActivateGame('social');
        return;
    }
    if (display === '1+1') {
      onActivateGame('snake');
      return;
    }
    if (display === '2+2') {
      onActivateGame('sky');
      return;
    }
    if (display === '3+3') {
      onActivateGame('danger');
      return;
    }
    if (display === '4+4') {
      onActivateGame('racing');
      return;
    }
    if (display === '5+5') {
      onActivateGame('platformer');
      return;
    }
    if (display === '6+6') {
      onActivateGame('shooter');
      return;
    }
    if (display === '7+7') {
      onActivateGame('keepup');
      return;
    }
    if (display === '8+8') {
      onActivateGame('dotrunner');
      return;
    }
    if (display === '0+0') {
      onActivateGame('marketplace');
      return;
    }

    try {
      // Avoid using eval in real production apps, but it's fine for this self-contained example.
      // A safer approach would be to parse the expression.
      const result = new Function('return ' + expression)();
      if (Number.isNaN(result) || !Number.isFinite(result)) {
        throw new Error("Invalid calculation");
      }
      const finalResult = String(Number(result.toFixed(10)));
      setDisplay(finalResult);
      setExpression(finalResult);
    } catch (error) {
      setDisplay('Error');
      setExpression('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };
  
  const handleDecimal = () => {
    const parts = display.split(/[\+\-\*\/]/);
    const lastPart = parts[parts.length - 1];
    if (!lastPart.includes('.')) {
      setDisplay(display + '.');
      setExpression(expression + '.');
    }
  };

  return (
    <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700 w-full">
      <div className="bg-gray-900 text-right p-4 rounded-lg mb-4 text-4xl font-semibold break-all border-2 border-slate-600">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-4 min-h-[300px]">
        <CalculatorButton onClick={handleClear} className="col-span-2 bg-rose-500 hover:bg-rose-400">C</CalculatorButton>
        <CalculatorButton onClick={() => handleOperatorClick('/')} className="bg-cyan-600 hover:bg-cyan-500">/</CalculatorButton>
        <CalculatorButton onClick={() => handleOperatorClick('*')} className="bg-cyan-600 hover:bg-cyan-500">*</CalculatorButton>
        
        <CalculatorButton onClick={() => handleNumberClick('7')}>7</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('8')}>8</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('9')}>9</CalculatorButton>
        <CalculatorButton onClick={() => handleOperatorClick('-')} className="bg-cyan-600 hover:bg-cyan-500">-</CalculatorButton>
        
        <CalculatorButton onClick={() => handleNumberClick('4')}>4</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('5')}>5</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('6')}>6</CalculatorButton>
        <CalculatorButton onClick={() => handleOperatorClick('+')} className="bg-cyan-600 hover:bg-cyan-500">+</CalculatorButton>
        
        <CalculatorButton onClick={() => handleNumberClick('1')}>1</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('2')}>2</CalculatorButton>
        <CalculatorButton onClick={() => handleNumberClick('3')}>3</CalculatorButton>
        <CalculatorButton onClick={handleEquals} className="row-span-2 bg-emerald-500 hover:bg-emerald-400">=</CalculatorButton>

        <CalculatorButton onClick={() => handleNumberClick('0')} className="col-span-2">0</CalculatorButton>
        <CalculatorButton onClick={handleDecimal}>.</CalculatorButton>
      </div>
    </div>
  );
};

export default Calculator;
