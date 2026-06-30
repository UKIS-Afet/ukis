import React from 'react';
import { useFontSize, FontSize } from './FontSizeProvider';
import { Minus, Plus, Type } from 'lucide-react';

export function FontSizeToggle() {
  const { size, setSize } = useFontSize();
  const sizes: FontSize[] = ['small', 'normal', 'large', 'extra-large'];

  const increaseSize = () => {
    const currentIndex = sizes.indexOf(size);
    if (currentIndex < sizes.length - 1) {
      setSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseSize = () => {
    const currentIndex = sizes.indexOf(size);
    if (currentIndex > 0) {
      setSize(sizes[currentIndex - 1]);
    }
  };

  return (
    <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 p-1 rounded-lg">
      <button
        onClick={decreaseSize}
        disabled={size === 'small'}
        className={`p-1.5 rounded-md transition-all ${
          size === 'small' 
            ? 'opacity-50 cursor-not-allowed text-white/30' 
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Metni Küçült"
        aria-label="Metni Küçült"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      
      <div className="px-1 flex items-center justify-center text-white/60 pointer-events-none" title="Metin Boyutu">
        <Type className="w-3.5 h-3.5" />
      </div>

      <button
        onClick={increaseSize}
        disabled={size === 'extra-large'}
        className={`p-1.5 rounded-md transition-all ${
          size === 'extra-large' 
            ? 'opacity-50 cursor-not-allowed text-white/30' 
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Metni Büyüt"
        aria-label="Metni Büyüt"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
