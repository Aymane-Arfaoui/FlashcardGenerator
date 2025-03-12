import React, { useState, useEffect } from 'react';
import './App.css';
// import flashcardsContent from './flashcards.md'; // This requires special webpack loader configuration
import flashcardsJson from './flashcards.json';

function App() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCards, setCorrectCards] = useState([]);
  const [incorrectCards, setIncorrectCards] = useState([]);
  const [remainingCards, setRemainingCards] = useState([]);
  const [activeSection, setActiveSection] = useState('main'); // 'main', 'correct', or 'incorrect'
  const [storageAvailable, setStorageAvailable] = useState(true);

  // Check if localStorage is available
  const isLocalStorageAvailable = () => {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.error('localStorage is not available:', e);
      return false;
    }
  };

  // Load data from localStorage on initial render
  useEffect(() => {
    // Check if localStorage is available
    const storageWorks = isLocalStorageAvailable();
    setStorageAvailable(storageWorks);
    
    // Use the flashcards from JSON file
    const hardcodedCards = flashcardsJson;
    setFlashcards(hardcodedCards);
    
    if (storageWorks) {
      try {
        // Load saved state from localStorage
        const savedCorrectCards = JSON.parse(localStorage.getItem('flashcards_correctCards')) || [];
        const savedIncorrectCards = JSON.parse(localStorage.getItem('flashcards_incorrectCards')) || [];
        const savedActiveSection = localStorage.getItem('flashcards_activeSection') || 'main';
        const savedCurrentIndex = parseInt(localStorage.getItem('flashcards_currentCardIndex')) || 0;
        
        console.log('Loaded from localStorage:', {
          correctCards: savedCorrectCards,
          incorrectCards: savedIncorrectCards,
          activeSection: savedActiveSection,
          currentIndex: savedCurrentIndex
        });
        
        setCorrectCards(savedCorrectCards);
        setIncorrectCards(savedIncorrectCards);
        setActiveSection(savedActiveSection);
        
        // Calculate remaining cards based on saved correct and incorrect cards
        // Sort them to ensure sequential order
        const newRemainingCards = [...Array(hardcodedCards.length).keys()]
          .filter(id => !savedCorrectCards.includes(id) && !savedIncorrectCards.includes(id))
          .sort((a, b) => a - b);
        
        setRemainingCards(newRemainingCards);
        
        // Set current index, but make sure it's valid for the current section
        if (savedActiveSection === 'main' && savedCurrentIndex < newRemainingCards.length) {
          setCurrentCardIndex(savedCurrentIndex);
        } else if (savedActiveSection === 'correct' && savedCurrentIndex < savedCorrectCards.length) {
          setCurrentCardIndex(savedCurrentIndex);
        } else if (savedActiveSection === 'incorrect' && savedCurrentIndex < savedIncorrectCards.length) {
          setCurrentCardIndex(savedCurrentIndex);
        } else {
          setCurrentCardIndex(0);
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Fall back to initial state with sorted IDs
        setRemainingCards([...Array(hardcodedCards.length).keys()].sort((a, b) => a - b));
      }
    } else {
      // If localStorage is not available, just set the initial state with sorted IDs
      setRemainingCards([...Array(hardcodedCards.length).keys()].sort((a, b) => a - b));
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (storageAvailable && flashcards.length > 0) {
      try {
        // Use a prefix to avoid potential conflicts with other apps
        localStorage.setItem('flashcards_correctCards', JSON.stringify(correctCards));
        localStorage.setItem('flashcards_incorrectCards', JSON.stringify(incorrectCards));
        localStorage.setItem('flashcards_activeSection', activeSection);
        localStorage.setItem('flashcards_currentCardIndex', currentCardIndex.toString());
        
        console.log('Saved to localStorage:', {
          correctCards,
          incorrectCards,
          activeSection,
          currentIndex: currentCardIndex
        });
        
        // Update remaining cards whenever correct or incorrect cards change
        // Sort them to ensure sequential order
        const newRemainingCards = [...Array(flashcards.length).keys()]
          .filter(id => !correctCards.includes(id) && !incorrectCards.includes(id))
          .sort((a, b) => a - b);
        
        setRemainingCards(newRemainingCards);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [correctCards, incorrectCards, activeSection, currentCardIndex, flashcards.length, storageAvailable]);

  const parseMarkdown = (markdown) => {
    // Improved parsing logic
    const questionRegex = /\*\*(Q\d+:.*?)\*\*/g;
    const answerRegex = /\*\*(A\d+:.*?)\*\*/g;
    
    const questions = [...markdown.matchAll(questionRegex)].map(m => m[1]);
    const answers = [...markdown.matchAll(answerRegex)].map(m => m[1]);
    
    console.log(`Found ${questions.length} questions and ${answers.length} answers`);
    
    const cards = [];
    for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
      cards.push({
        id: i,
        question: questions[i],
        answer: answers[i]
      });
    }
    
    return cards;
  };

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleCorrect = () => {
    if (activeSection === 'main') {
      // Move from main deck to correct
      const currentId = remainingCards[currentCardIndex];
      setCorrectCards([...correctCards, currentId]);
      handleNext();
    } else if (activeSection === 'incorrect') {
      // Move from incorrect to correct
      const currentId = incorrectCards[currentCardIndex];
      setIncorrectCards(incorrectCards.filter(id => id !== currentId));
      setCorrectCards([...correctCards, currentId]);
      
      // If this was the last card in incorrect section, go back to main
      if (incorrectCards.length === 1) {
        setActiveSection('main');
        setCurrentCardIndex(0);
      } else if (currentCardIndex >= incorrectCards.length - 1) {
        // If it was the last card in the list, go to the previous card
        setCurrentCardIndex(currentCardIndex - 1);
      }
      setShowAnswer(false);
    } else if (activeSection === 'correct') {
      // Already correct, just go to next card
      handleNext();
    }
  };

  const handleIncorrect = () => {
    if (activeSection === 'main') {
      // Move from main deck to incorrect
      const currentId = remainingCards[currentCardIndex];
      setIncorrectCards([...incorrectCards, currentId]);
      handleNext();
    } else if (activeSection === 'correct') {
      // Move from correct to incorrect
      const currentId = correctCards[currentCardIndex];
      setCorrectCards(correctCards.filter(id => id !== currentId));
      setIncorrectCards([...incorrectCards, currentId]);
      
      // If this was the last card in correct section, go back to main
      if (correctCards.length === 1) {
        setActiveSection('main');
        setCurrentCardIndex(0);
      } else if (currentCardIndex >= correctCards.length - 1) {
        // If it was the last card in the list, go to the previous card
        setCurrentCardIndex(currentCardIndex - 1);
      }
      setShowAnswer(false);
    } else if (activeSection === 'incorrect') {
      // Already incorrect, just go to next card
      handleNext();
    }
  };

  const handleNext = () => {
    setShowAnswer(false);
    const currentCards = getCurrentCards();
    
    if (currentCardIndex < currentCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // All cards in this section have been reviewed
      setCurrentCardIndex(0);
    }
  };

  const switchSection = (section) => {
    setActiveSection(section);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const getCurrentCards = () => {
    switch (activeSection) {
      case 'correct':
        return correctCards
          .sort((a, b) => a - b)
          .map(id => ({ ...flashcards[id], originalId: id }));
      case 'incorrect':
        return incorrectCards
          .sort((a, b) => a - b)
          .map(id => ({ ...flashcards[id], originalId: id }));
      default:
        return remainingCards
          .sort((a, b) => a - b)
          .map(id => ({ ...flashcards[id], originalId: id }));
    }
  };

  // Add a reset function to clear all progress
  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      setCorrectCards([]);
      setIncorrectCards([]);
      // Initialize with sorted IDs
      setRemainingCards([...Array(flashcards.length).keys()].sort((a, b) => a - b));
      setActiveSection('main');
      setCurrentCardIndex(0);
      setShowAnswer(false);
      
      // Clear localStorage with the prefix
      if (storageAvailable) {
        try {
          localStorage.removeItem('flashcards_correctCards');
          localStorage.removeItem('flashcards_incorrectCards');
          localStorage.removeItem('flashcards_activeSection');
          localStorage.removeItem('flashcards_currentCardIndex');
          console.log('Reset: Cleared localStorage');
        } catch (error) {
          console.error('Error clearing localStorage:', error);
        }
      }
    }
  };

  const currentCards = getCurrentCards();
  const currentCard = currentCards[currentCardIndex];

  // Create indicator dots for cards
  const renderIndicatorDots = () => {
    return (
      <div className="card-indicators">
        {currentCards.map((_, index) => (
          <div 
            key={index} 
            className={`indicator-dot ${index === currentCardIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  };

  if (!currentCard) {
    return (
      <div className="flashcard-app">
        <h1>Flashcards</h1>
        <div className="section-buttons">
          <button 
            onClick={() => switchSection('main')}
            className={activeSection === 'main' ? 'active-section' : ''}
          >
            Main Deck ({remainingCards.length})
          </button>
          <button 
            onClick={() => switchSection('correct')}
            className={activeSection === 'correct' ? 'active-section' : ''}
          >
            Correct ({correctCards.length})
          </button>
          <button 
            onClick={() => switchSection('incorrect')}
            className={activeSection === 'incorrect' ? 'active-section' : ''}
          >
            Incorrect ({incorrectCards.length})
          </button>
        </div>
        <div className="empty-message">
          {activeSection === 'main' 
            ? "You've completed all flashcards! Review your correct or incorrect cards." 
            : `No cards in the ${activeSection} section yet.`}
        </div>
        <div className="reset-container">
          <button className="reset-button" onClick={resetProgress}>Reset All Progress</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-app">
      <h1>Flashcards</h1>
      
      <div className="section-buttons">
        <button 
          onClick={() => switchSection('main')}
          className={activeSection === 'main' ? 'active-section' : ''}
        >
          Main Deck ({remainingCards.length})
        </button>
        <button 
          onClick={() => switchSection('correct')}
          className={activeSection === 'correct' ? 'active-section' : ''}
        >
          Correct ({correctCards.length})
        </button>
        <button 
          onClick={() => switchSection('incorrect')}
          className={activeSection === 'incorrect' ? 'active-section' : ''}
        >
          Incorrect ({incorrectCards.length})
        </button>
      </div>
      
      <div className="progress">
        Card {currentCardIndex + 1} of {currentCards.length}
      </div>
      
      {renderIndicatorDots()}
      
      <div className="flashcard" onClick={handleFlip}>
        <div className={`flashcard-inner ${showAnswer ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <p>{currentCard.question}</p>
          </div>
          <div className="flashcard-back">
            <p>{currentCard.answer}</p>
          </div>
        </div>
      </div>
      
      <div className="flip-hint">
        {!showAnswer ? "Click card to reveal answer" : "Click buttons below to continue"}
      </div>
      
      <div className="controls">
        {showAnswer && (
          <>
            <button className="correct-btn" onClick={handleCorrect}>Got it right</button>
            <button className="incorrect-btn" onClick={handleIncorrect}>Need more practice</button>
          </>
        )}
        {!showAnswer && (
          <button onClick={handleFlip}>Show Answer</button>
        )}
      </div>
      
      <div className="section-indicator">
        {activeSection === 'main' ? 'Main Deck' : 
         activeSection === 'correct' ? 'Reviewing Correct Cards' : 
         'Reviewing Incorrect Cards'}
      </div>
      
      <div className="reset-container">
        <button className="reset-button" onClick={resetProgress}>Reset All Progress</button>
      </div>
    </div>
  );
}

export default App;