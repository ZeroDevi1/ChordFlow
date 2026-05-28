import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { PracticeMenu } from './components/PracticeMenu';
import { ScalePractice } from './components/ScalePractice';
import { ArpeggioPractice } from './components/ArpeggioPractice';
import { ChordInversionPractice } from './components/ChordInversionPractice';
import { MetronomeSettingsModal } from './components/MetronomeSettingsModal';
import { MetronomeProvider } from './contexts';
import './App.css';

/** 路径对应的中文名称 */
const PATH_NAMES: Record<string, string> = {
  '/': '选择练习',
  '/scale': '音阶练习',
  '/arpeggio': '和弦琶音',
  '/inversion': '和弦转位',
};

/**
 * 应用主布局组件
 */
function AppLayout() {
  const location = useLocation();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 打开设置模态框
  const openSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  // 关闭设置模态框
  const closeSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // 获取当前路径名称
  const currentPathName = PATH_NAMES[location.pathname] || '选择练习';
  const isHome = location.pathname === '/';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>
            <Link to="/" className="header-link">ChordFlow</Link>
          </h1>
          <p>键盘练习工具</p>
        </div>
        <button
          className="settings-btn"
          onClick={openSettings}
          title="节拍器设置"
        >
          ⚙
        </button>
      </header>

      {/* 面包屑导航 */}
      <nav className="breadcrumb">
        <Link
          to="/"
          className={`breadcrumb-link ${isHome ? 'active' : ''}`}
        >
          ChordFlow
        </Link>
        {!isHome && (
          <>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentPathName}</span>
          </>
        )}
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<PracticeMenu />} />
          <Route path="/scale" element={<ScalePractice />} />
          <Route path="/arpeggio" element={<ArpeggioPractice />} />
          <Route path="/inversion" element={<ChordInversionPractice />} />
        </Routes>
      </main>

      {/* 节拍器设置模态框 */}
      <MetronomeSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettings}
      />
    </div>
  );
}

/**
 * 应用根组件
 */
function App() {
  return (
    <BrowserRouter>
      <MetronomeProvider>
        <AppLayout />
      </MetronomeProvider>
    </BrowserRouter>
  );
}

export default App;
