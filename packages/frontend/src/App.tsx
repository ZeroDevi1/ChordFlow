import { useState } from 'react';
import { PracticeMenu } from './components/PracticeMenu';
import { ScalePractice } from './components/ScalePractice';
import { ArpeggioPractice } from './components/ArpeggioPractice';
import { ChordInversionPractice } from './components/ChordInversionPractice';
import './App.css';

/** 练习类型 */
type PracticeType = 'menu' | 'scale' | 'arpeggio' | 'chord-inversion';

/** 练习类型对应的中文名称 */
const PRACTICE_NAMES: Record<PracticeType, string> = {
  menu: '选择练习',
  scale: '音阶练习',
  arpeggio: '和弦琶音',
  'chord-inversion': '和弦转位',
};

function App() {
  const [currentPractice, setCurrentPractice] = useState<PracticeType>('menu');

  return (
    <div className="app">
      <header className="app-header">
        <h1>ChordFlow</h1>
        <p>键盘练习工具</p>
      </header>

      {/* 面包屑导航 */}
      <nav className="breadcrumb">
        <button
          className={`breadcrumb-link ${currentPractice === 'menu' ? 'active' : ''}`}
          onClick={() => setCurrentPractice('menu')}
        >
          ChordFlow
        </button>
        {currentPractice !== 'menu' && (
          <>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{PRACTICE_NAMES[currentPractice]}</span>
          </>
        )}
      </nav>

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
        {currentPractice === 'chord-inversion' && (
          <ChordInversionPractice onBack={() => setCurrentPractice('menu')} />
        )}
      </main>
    </div>
  );
}

export default App;
