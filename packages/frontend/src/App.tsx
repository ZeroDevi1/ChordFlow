import { useState } from 'react';
import { PracticeMenu } from './components/PracticeMenu';
import { ScalePractice } from './components/ScalePractice';
import { ArpeggioPractice } from './components/ArpeggioPractice';
import './App.css';

/** 练习类型 */
type PracticeType = 'menu' | 'scale' | 'arpeggio' | 'chord-inversion';

function App() {
  const [currentPractice, setCurrentPractice] = useState<PracticeType>('menu');

  return (
    <div className="app">
      <header className="app-header">
        <h1>ChordFlow</h1>
        <p>键盘练习工具</p>
      </header>
      <main className="app-main">
        {currentPractice === 'menu' && (
          <PracticeMenu onSelect={setCurrentPractice} />
        )}
        {currentPractice === 'scale' && (
          <ScalePractice onBack={() => setCurrentPractice('menu')} />
        )}
        {currentPractice === 'arpeggio' && (
          <ArpeggioPractice onBack={() => setCurrentPractice('menu')} />
        )}
        {/* TODO: 和弦转位练习 */}
      </main>
    </div>
  );
}

export default App;
