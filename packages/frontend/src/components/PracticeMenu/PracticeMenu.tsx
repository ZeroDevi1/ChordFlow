import { Link } from 'react-router-dom';
import './PracticeMenu.css';

/** 练习菜单组件 */
export function PracticeMenu() {
  return (
    <div className="practice-menu">
      <h2>选择练习</h2>
      <div className="practice-cards">
        <Link to="/scale" className="practice-card">
          <div className="card-icon">🎵</div>
          <h3>音阶练习</h3>
          <p>自然大调 / 自然小调</p>
          <p>五度圈顺序或随机</p>
        </Link>

        <Link to="/arpeggio" className="practice-card">
          <div className="card-icon">🎹</div>
          <h3>和弦琶音</h3>
          <p>大三和弦 / 小三和弦</p>
          <p>五度圈下行 / 就近连接</p>
        </Link>

        <Link to="/inversion" className="practice-card">
          <div className="card-icon">🔄</div>
          <h3>和弦转位</h3>
          <p>根位 → 第一转位 → 第二转位</p>
          <p>掌握和弦转位</p>
        </Link>
      </div>
    </div>
  );
}
