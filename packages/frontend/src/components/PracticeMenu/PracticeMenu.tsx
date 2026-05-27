import './PracticeMenu.css';

/** 练习类型 */
type PracticeType = 'scale' | 'arpeggio' | 'chord-inversion';

interface PracticeMenuProps {
  onSelect: (type: PracticeType) => void;
}

/** 练习菜单组件 */
export function PracticeMenu({ onSelect }: PracticeMenuProps) {
  return (
    <div className="practice-menu">
      <h2>选择练习</h2>
      <div className="practice-cards">
        <button className="practice-card" onClick={() => onSelect('scale')}>
          <div className="card-icon">🎵</div>
          <h3>音阶练习</h3>
          <p>自然大调 / 自然小调</p>
          <p>五度圈顺序或随机</p>
        </button>

        <button className="practice-card" onClick={() => onSelect('arpeggio')}>
          <div className="card-icon">🎹</div>
          <h3>和弦琶音</h3>
          <p>大三和弦 / 小三和弦</p>
          <p>五度圈下行 / 就近连接</p>
        </button>

        <button className="practice-card" onClick={() => onSelect('chord-inversion')}>
          <div className="card-icon">🔄</div>
          <h3>和弦转位</h3>
          <p>根位 → 第一转位 → 第二转位</p>
          <p>掌握和弦转位</p>
        </button>
      </div>
    </div>
  );
}
