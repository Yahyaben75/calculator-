import React from 'react';

interface ControlsProps {
  onKeyPress: (key: string) => void;
  onKeyRelease: (key: string) => void;
  actionButtonKey?: string;
  actionButtonLabel?: string;
  variant?: 'dpad' | 'platformer';
}

const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const ControlButton: React.FC<{
  onPress: () => void;
  onRelease: () => void;
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'platformer';
}> = ({ onPress, onRelease, className, children, variant = 'default' }) => {
  const handlePress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onPress();
  };
  const handleRelease = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onRelease();
  };

  const baseClasses = 'flex items-center justify-center rounded-full text-white select-none transition-all duration-100';

  const variantClasses = variant === 'platformer'
    ? 'bg-red-600 active:bg-red-700 border-2 border-red-400 text-3xl font-bold shadow-[inset_0_4px_6px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.3)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
    : 'bg-gray-500 bg-opacity-50 active:bg-opacity-75 active:bg-gray-400 text-2xl';

  return (
    <div
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </div>
  );
};


const Controls: React.FC<ControlsProps> = ({ onKeyPress, onKeyRelease, actionButtonKey, actionButtonLabel = 'A', variant = 'dpad' }) => {
  if (!isMobile) {
    return null;
  }
  
  if (variant === 'platformer') {
    return (
        <div className="p-4 sm:p-6 flex justify-between items-center h-36 pointer-events-none">
            {/* Left/Right movement */}
            <div className="flex space-x-4 pointer-events-auto">
                <ControlButton
                    onPress={() => onKeyPress('ArrowLeft')}
                    onRelease={() => onKeyRelease('ArrowLeft')}
                    className="w-20 h-20"
                    variant="platformer"
                >
                    ←
                </ControlButton>
                <ControlButton
                    onPress={() => onKeyPress('ArrowRight')}
                    onRelease={() => onKeyRelease('ArrowRight')}
                    className="w-20 h-20"
                    variant="platformer"
                >
                    →
                </ControlButton>
            </div>
            
            {/* Jump button */}
            <div className="pointer-events-auto">
                <ControlButton
                    onPress={() => onKeyPress('ArrowUp')}
                    onRelease={() => onKeyRelease('ArrowUp')}
                    className="w-24 h-24"
                    variant="platformer"
                >
                    ↑
                </ControlButton>
            </div>
        </div>
    );
  }

  // Default D-pad layout
  return (
    <div className="p-4 flex justify-between items-end h-48 pointer-events-none">
      {/* D-Pad */}
      <div className="grid grid-cols-3 grid-rows-3 w-48 h-48 pointer-events-auto">
        <div className="col-start-2">
          <ControlButton onPress={() => onKeyPress('ArrowUp')} onRelease={() => onKeyRelease('ArrowUp')} className="w-16 h-16">↑</ControlButton>
        </div>
        <div className="row-start-2">
          <ControlButton onPress={() => onKeyPress('ArrowLeft')} onRelease={() => onKeyRelease('ArrowLeft')} className="w-16 h-16">←</ControlButton>
        </div>
        <div className="row-start-2 col-start-3">
          <ControlButton onPress={() => onKeyPress('ArrowRight')} onRelease={() => onKeyRelease('ArrowRight')} className="w-16 h-16">→</ControlButton>
        </div>
        <div className="row-start-3 col-start-2">
          <ControlButton onPress={() => onKeyPress('ArrowDown')} onRelease={() => onKeyRelease('ArrowDown')} className="w-16 h-16">↓</ControlButton>
        </div>
      </div>
      
      {/* Action Button */}
      {actionButtonKey && (
         <div className="pointer-events-auto">
            <ControlButton 
              onPress={() => onKeyPress(actionButtonKey)} 
              onRelease={() => onKeyRelease(actionButtonKey)}
              className="w-20 h-20"
            >
              {actionButtonLabel}
            </ControlButton>
         </div>
      )}
    </div>
  );
};

export default Controls;