import { NoteDetectionResult } from '../../hooks';
import './PracticeSummary.css';

interface PracticeSummaryProps {
  /** 练习标题 */
  title: string;
  /** 检测结果列表 */
  results: NoteDetectionResult[];
  /** 总音符数 */
  totalNotes: number;
  /** 练习时长（秒） */
  duration?: number;
  /** 关闭回调 */
  onClose: () => void;
  /** 重新练习回调 */
  onRetry?: () => void;
}

/**
 * 练习总结组件
 * 显示练习完成后的统计数据
 */
export function PracticeSummary({
  title,
  results,
  totalNotes,
  duration,
  onClose,
  onRetry,
}: PracticeSummaryProps) {
  // 计算统计数据
  const correctCount = results.filter((r) => r.isCorrect).length;
  const wrongCount = results.filter((r) => !r.isCorrect).length;
  const accuracy = totalNotes > 0 ? Math.round((correctCount / totalNotes) * 100) : 0;

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取错误音符列表
  const wrongNotes = results
    .filter((r) => !r.isCorrect)
    .map((r) => ({
      index: r.index + 1,
      playedNote: r.playedNoteName || '未知',
    }));

  return (
    <div className="practice-summary-overlay" onClick={onClose}>
      <div className="practice-summary" onClick={(e) => e.stopPropagation()}>
        <h2 className="summary-title">{title}</h2>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value accuracy">{accuracy}%</div>
            <div className="stat-label">正确率</div>
          </div>
          <div className="stat-card">
            <div className="stat-value correct">{correctCount}</div>
            <div className="stat-label">正确</div>
          </div>
          <div className="stat-card">
            <div className="stat-value wrong">{wrongCount}</div>
            <div className="stat-label">错误</div>
          </div>
          {duration !== undefined && (
            <div className="stat-card">
              <div className="stat-value duration">{formatDuration(duration)}</div>
              <div className="stat-label">时长</div>
            </div>
          )}
        </div>

        {/* 进度条 */}
        <div className="accuracy-bar">
          <div
            className="accuracy-fill"
            style={{ width: `${accuracy}%` }}
          />
        </div>

        {/* 错误音符列表 */}
        {wrongNotes.length > 0 && (
          <div className="wrong-notes-section">
            <h3>错误音符</h3>
            <div className="wrong-notes-list">
              {wrongNotes.slice(0, 10).map((note, index) => (
                <div key={index} className="wrong-note-item">
                  <span className="note-index">#{note.index}</span>
                  <span className="note-played">弹奏: {note.playedNote}</span>
                </div>
              ))}
              {wrongNotes.length > 10 && (
                <div className="wrong-notes-more">
                  ...还有 {wrongNotes.length - 10} 个错误
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="summary-actions">
          {onRetry && (
            <button className="retry-button" onClick={onRetry}>
              重新练习
            </button>
          )}
          <button className="close-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
