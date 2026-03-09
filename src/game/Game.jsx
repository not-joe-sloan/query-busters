import React, { useState, useEffect, useRef } from "react";
import "./game.css";
import { SQL_LINES } from "./sqlLines"; // Import the SQL lines


const Game = () => {

  //Game Parameters
  const [gameWidth, setGameWidth] = useState(window.innerWidth);
  const autoFireIntervalRef = useRef(null);
  // Add this near your other ref
  const positionRef = useRef(500);

  //Object States
  const [isMoving, setIsMoving] = useState(false);
  const [bullets, setBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [position, setPosition] = useState(500);
  const [textPosition, setTextPosition] = useState(window.innerHeight - 1); // Start from bottom
  const [isAutoFiring, setIsAutoFiring] = useState(false);

  //Numbering
  const lineNumbers = [];
  for (let i = 1; i <= 10; i++) {
    lineNumbers.push(i); // Add each number to the array
  }


  //Game States
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const restartGame = () => {
    lastTimeRef.current = 0; // Reset the time reference
    setGameOver(false);
    setBullets([]);
    setEnemies([]);
    setTextPosition(window.innerHeight - 40);
    setPosition(500);
    setVelocity(0);
    setIsMoving(true);
    generateEnemies();
    setScore(0);
  };

  //Control States
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);


  // Add rate limiting state


  //Timing Constants
  const speed = 8; // Player Speed
  const bulletSpeed = 5;
  const textSpeed = 1.2;
  const [velocity, setVelocity] = useState(0); // Player's current velocity
  const lastTimeRef = useRef(0); //Track framerate
  const fireDelay = 100; // Milliseconds between shots


  //Syntax highlighting
  const SQL_SYNTAX = {
    keywords: ['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'AND', 'AS', 'JOIN', 'VARCHAR', 'DEFAULT', 'CREATE', 'TABLE', 'DESC,', 'ASC,', 'PRIMARY', 'KEY', 'VALUES', 'INSERT', 'LEFT', 'RIGHT'],
    functions: ['CURRENT_TIMESTAMP', 'COUNT', 'timestamp'],
    operators: ['=', '>', 'TRUE', 'TRUE,', 'FALSE,', 'FALSE'],
    strings: ["'"],
    punctuation: [',', ';']
  };

  const SQL_COLORS = {
    keywords: '#0000FF',    // blue
    functions: '#C700C7',   // magenta
    operators: '#597EF7',   // blue
    strings: '#FF0000',     // red
    punctuation: '#000000', // black 
    default: '#000000'      // green
  };

  const getSqlTokenType = (word) => {
    const upperWord = word.toUpperCase();

    // Check if it contains a quote (either at start or end)
    if (word.includes("'")) {
      return 'strings';
    }

    // Check if it's a keyword
    if (SQL_SYNTAX.keywords.includes(upperWord)) {
      return 'keywords';
    }

    // Check if it's a function
    if (SQL_SYNTAX.functions.includes(upperWord)) {
      return 'functions';
    }

    // Check if it's an operator
    if (SQL_SYNTAX.operators.includes(upperWord)) {
      return 'operators';
    }

    // Check if it's punctuation
    if (SQL_SYNTAX.punctuation.includes(word)) {
      return 'punctuation';
    }

    return 'default';
  };

  useEffect(() => {
    const handleStart = (event) => {
      if (event.key === " ") {
        setGameStarted(true);
      }
    };

    window.addEventListener("keydown", handleStart);
    return () => window.removeEventListener("keydown", handleStart);
  }, []);

  useEffect(() => {
    const handleResize = () => setGameWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    generateEnemies();
  }, []);

  // Auto-firing effect
  useEffect(() => {
    // This effect handles the auto-firing logic
    if (isAutoFiring && !gameOver) {
      // Fire the first bullet immediately
      fireBullet();

      // Set up the interval for continuous firing
      autoFireIntervalRef.current = setInterval(() => {
        fireBullet();
      }, fireDelay);
    }

    // Clean up the interval when auto-firing stops or component unmounts
    return () => {
      if (autoFireIntervalRef.current) {
        clearInterval(autoFireIntervalRef.current);
        autoFireIntervalRef.current = null;
      }
    };
  }, [isAutoFiring, gameOver, fireDelay]);

  // Key handling effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && gameOver) {
        restartGame();
        return;
      }
      if (gameOver) return;

      if (event.key === "ArrowLeft") {
        setVelocity(-speed);
      } else if (event.key === "ArrowRight") {
        setVelocity(speed);
      } else if (event.key === " " || event.key === "ArrowDown") {
        setIsSpaceHeld(true);
        setIsAutoFiring(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === " " || event.key === "ArrowDown") {
        setIsSpaceHeld(false);
        setIsAutoFiring(false);
      } else if (
        (event.key === "ArrowLeft" && velocity < 0) ||
        (event.key === "ArrowRight" && velocity > 0)
      ) {
        setVelocity(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [velocity, gameOver, speed]);

  // Create a unified game loop to handle all animations
useEffect(() => {
  let animationFrameId;
  
  const gameLoop = (timestamp) => {
    if (gameOver) {
      cancelAnimationFrame(animationFrameId);
      return;
    }
    
    // Calculate delta time in seconds
    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = timestamp;
    
    // 1. Update player position
    setPosition((prev) => {
      const actualVelocity = (isSpaceHeld ? velocity * 0.5 : velocity) * deltaTime * 60;
      const newPos = prev + actualVelocity;
      const minPosition = 60;
      const clampedPos = Math.max(minPosition, Math.min(gameWidth, newPos));
      
      // Update the ref with the latest position
      positionRef.current = clampedPos;
      
      return clampedPos;
    });
    
    // 2. Update bullets
    if (!gameOver) {
      setBullets((prevBullets) =>
        prevBullets
          .map((bullet) => ({ 
            ...bullet, 
            top: bullet.top + (bulletSpeed * deltaTime * 60) // Normalized for 60fps
          }))
          .filter((bullet) => bullet.top < window.innerHeight)
      );
      
      checkCollisions();
    }
    
    // 3. Update text position
    if (isMoving && !gameOver) {
      setTextPosition((prev) => {
        const frameAdjustedSpeed = textSpeed * deltaTime * 60; // Normalized for 60fps
        const newPos = prev - frameAdjustedSpeed;
        
        // Find enemies that have reached the top
        const enemiesAtTop = enemies.filter(
          enemy => enemy.isWord && !enemy.isHit && newPos + (enemy.lineIndex * 30) <= 0
        );
        
        if (enemiesAtTop.length > 0) {
          // Get the actual line that reached the top
          const reachedLine = Math.min(...enemiesAtTop.map(enemy => enemy.lineIndex + 1));
          setScore(reachedLine);
          setGameOver(true);
          return prev;
        }
        return newPos;
      });
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
  };
  
  animationFrameId = requestAnimationFrame(gameLoop);
  
  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}, [velocity, gameWidth, isSpaceHeld, isMoving, gameOver, enemies]);

  const fireBullet = () => {
    if (gameOver) return;

    setBullets((prevBullets) => [
      ...prevBullets,
      { left: positionRef.current, top: 20 }
    ]);

    // Start text movement after first shot
    if (!isMoving) {
      setIsMoving(true);
    }
  };

  const generateEnemies = () => {
    const newEnemies = [];

    SQL_LINES.forEach((line, lineIndex) => {
      let currentLeft = 50;
      const words = line.split(" ");

      // Track if we're inside a string for this line
      let insideString = false;

      words.forEach((word, wordIndex) => {
        const measuringDiv = document.createElement("div");
        measuringDiv.style.position = "absolute";
        measuringDiv.style.visibility = "hidden";
        measuringDiv.style.whiteSpace = "nowrap";
        measuringDiv.className = "enemy";
        measuringDiv.textContent = word;
        document.body.appendChild(measuringDiv);

        const wordWidth = measuringDiv.getBoundingClientRect().width;
        document.body.removeChild(measuringDiv);

        // Get the token type using the original function
        let tokenType = getSqlTokenType(word);

        // Count single quotes in this word
        const quoteCount = (word.match(/'/g) || []).length;

        // If odd number of quotes, toggle string state
        if (quoteCount % 2 === 1) {
          insideString = !insideString;
        }

        // Override token type only if we're inside a string and it's not already detected as a string
        if (insideString && tokenType !== 'strings') {
          tokenType = 'strings';
        }

        const color = SQL_COLORS[tokenType];

        newEnemies.push({
          id: `${lineIndex}-${wordIndex}`,
          left: currentLeft,
          lineIndex: lineIndex,
          width: wordWidth - 20,
          text: word,
          color: color,
          isHit: false,
          isWord: word.trim().length > 0
        });

        currentLeft += wordWidth;
      });

      // Reset string state at the end of each line
      insideString = false;
    });

    setEnemies(newEnemies);
  };

  const checkCollisions = () => {
    setBullets((prevBullets) => {
      return prevBullets.filter((bullet) => {
        const hitEnemy = enemies.find(
          (enemy) =>
            enemy.isWord &&  // Only check actual words
            !enemy.isHit &&
            bullet.top >= textPosition + (enemy.lineIndex * 30) - 10 &&
            bullet.top <= textPosition + (enemy.lineIndex * 30) + 30 &&
            bullet.left >= enemy.left - 10 &&
            bullet.left <= enemy.left + enemy.width + 10
        );

        if (hitEnemy) {
          setEnemies((prevEnemies) =>
            prevEnemies.map(enemy =>
              enemy.id === hitEnemy.id
                ? { ...enemy, isHit: true }
                : enemy
            )
          );
          return false;
        }
        return true;
      });
    });
  };

  if (!gameStarted) {
    return (
      <>
        <header></header>
        <div className="start-screen">
          <pre className="ascii-art">
            {`
                    40404040404            
                4040404       4040        
              40       404       4040     
           40            40       40 40    
         40 404040        40      40  40   
        404      4040     40     40     40  
       404           40  40    40       40  
       40        4040  4040  40        4040 
       40     404    40404040        40  40
       40  40        40404040      40    40
       4040       404  4040  40404       40 
        404     40   40   40             40 
         40    40    40     4040        40   
          40   40     40       40404   40   
            40  40     40            404    
              40404      404       40      
                  4040      404040        
                      404040404                      
          `}
          </pre>
          <div className="error-title">
            <h1>404 ERROR:</h1>
            <h2>Workspace "joes_test_snowflake_db" not found</h2>
          </div>
          <p>
            If the issue persists, please visit our{" "}
            <a href="https://help.coalesce.io/hc/en-us" target="_blank" rel="noopener noreferrer">
              support page.
            </a>
          </p>
          <p className="press-space">[Press Space]</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header></header>
      <div className="game-container">
        {gameOver && (
          <div className="game-over-screen">
            <h1>GAME OVER</h1>
            <h2>ERROR: Query terminated at line {score}</h2>
            <h2>[Press Enter to Restart]</h2>
          </div>
        )}
        <div
          className="player"
          style={{
            left: `${position}px`,
            position: 'absolute',
            top: '20px'
          }} />
        {bullets.map((bullet, index) => (
          <div
            key={index}
            className="bullet"
            style={{
              left: `${bullet.left}px`,
              top: `${bullet.top}px`,
              position: 'absolute'
            }} />
        ))}
        <div
          className="blockRow"
          style={{
            position: 'absolute',
            top: `${textPosition}px`,
            left: '0',
            width: '100%'
          }}
        >
          {enemies.reduce((acc, enemy) => {
            if (!acc.some(item => item.key === `row-${enemy.lineIndex}`)) {
              return [
                ...acc,
                <div
                  key={`row-${enemy.lineIndex}`}
                  className="row-number"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: `${enemy.lineIndex * 30}px`
                  }}
                >
                  {(enemy.lineIndex + 1).toString().padStart(2, '0')}
                </div>
              ];
            }
            return acc;
          }, [])}
          {enemies.map((enemy) => (
            <div
              key={enemy.id}
              className="enemy"
              style={{
                position: 'absolute',
                left: `${enemy.left}px`,
                top: `${enemy.lineIndex * 30}px`, // Space each line vertically
                width: `${enemy.width}px`,
                visibility: enemy.isHit ? 'hidden' : 'visible',
                color: enemy.color
              }}
            >
              {enemy.text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Game;