import React, { useState } from 'react';
import './VirtualKeyboard.css';

function VirtualKeyboard({ onInput, onBackspace, onClear, onEnter, inputType = 'text' }) {
  const [isShifted, setIsShifted] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);

  const letterKeys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const numberKeys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ['0'],
    []
  ];

  const getDisplayKey = (key) => {
    if (inputType === 'number') {
      return key;
    }
    
    if (isShifted && !isCapsLock) {
      const shiftMap = {
        'Q': '!', 'W': '@', 'E': '#', 'R': '$', 'T': '%',
        'Y': '^', 'U': '&', 'I': '*', 'O': '(', 'P': ')',
        'A': '_', 'S': '+', 'D': '{', 'F': '}', 'G': '|',
        'H': ':', 'J': '"', 'K': '<', 'L': '>',
        'Z': '?', 'X': '~', 'C': '`', 'V': '[', 'B': ']',
        'N': '\\', 'M': '#'
      };
      return shiftMap[key] || key;
    }
    if (isCapsLock || (isShifted && /^[a-z]$/.test(key.toLowerCase()))) {
      return key.toUpperCase();
    }
    return key.toLowerCase();
  };

  const handleKeyPress = (key) => {
    const displayKey = getDisplayKey(key);
    onInput(displayKey);
    
    // Reset shift after typing a letter (like real keyboard)
    if (isShifted && !isCapsLock) {
      setIsShifted(false);
    }
  };

  const handleShift = () => {
    setIsShifted(!isShifted);
  };

  const handleCapsLock = () => {
    setIsCapsLock(!isCapsLock);
    if (isShifted) {
      setIsShifted(false);
    }
  };

  const handleSpace = () => {
    onInput(' ');
  };

  const currentKeys = inputType === 'number' ? numberKeys : letterKeys;

  return (
    <div className="virtual-keyboard">
      {inputType === 'number' ? (
        <>
          <div className="keyboard-row">
            {currentKeys[0].map((key) => (
              <button
                key={key}
                className="key key-wide"
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
          </div>
          
          <div className="keyboard-row">
            {currentKeys[1].map((key) => (
              <button
                key={key}
                className="key key-wide"
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
          </div>
          
          <div className="keyboard-row">
            <button className="key key-space" onClick={onBackspace}>
              ⌫ Backspace
            </button>
            <button className="key key-special" onClick={onClear}>
              Clear
            </button>
            <button className="key key-enter" onClick={onEnter}>
              Enter ↵
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="keyboard-row">
            {currentKeys[0].map((key) => (
              <button
                key={key}
                className="key key-wide"
                onClick={() => handleKeyPress(key)}
              >
                {getDisplayKey(key)}
              </button>
            ))}
            <button className="key key-wide" onClick={onBackspace}>
              ⌫
            </button>
          </div>
          
          <div className="keyboard-row">
            {currentKeys[1].map((key) => (
              <button
                key={key}
                className="key key-wide"
                onClick={() => handleKeyPress(key)}
              >
                {getDisplayKey(key)}
              </button>
            ))}
          </div>
          
          <div className="keyboard-row">
            <button
              className={`key key-special ${isCapsLock ? 'active' : ''}`}
              onClick={handleCapsLock}
            >
              ⇪ Caps
            </button>
            {currentKeys[2].map((key) => (
              <button
                key={key}
                className="key key-wide"
                onClick={() => handleKeyPress(key)}
              >
                {getDisplayKey(key)}
              </button>
            ))}
            <button
              className={`key key-special ${isShifted ? 'active' : ''}`}
              onClick={handleShift}
            >
              ⇧ Shift
            </button>
          </div>
          
          <div className="keyboard-row">
            <button className="key key-space" onClick={handleSpace}>
              Space
            </button>
            <button className="key key-special" onClick={onClear}>
              Clear
            </button>
            <button className="key key-enter" onClick={onEnter}>
              Enter ↵
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VirtualKeyboard;
