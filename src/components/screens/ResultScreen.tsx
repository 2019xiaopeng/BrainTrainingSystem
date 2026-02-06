import type { SessionSummary, SessionHistoryEntry, UserProfile } from '../../types/game';

interface ResultScreenProps {
  summary: SessionSummary;
  sessionHistory: SessionHistoryEntry[];
  userProfile: UserProfile;
  onPlayAgain: () => void;
  onBackHome: () => void;
}

/**
 * ResultScreen - 结果展示界面
 */
export function ResultScreen({ summary, sessionHistory, userProfile, onPlayAgain, onBackHome }: ResultScreenProps) {
  // Check for new achievements
  const isNewHighScore = summary.score && sessionHistory.length > 1 && 
    summary.score > Math.max(...sessionHistory.slice(0, -1).map(s => s.score));
  
  const isNewMaxNLevel = summary.accuracy >= 80 && summary.config.nLevel === userProfile.maxNLevel &&
    sessionHistory.length > 1;

  // Get last 5 sessions for chart
  const recentSessions = sessionHistory.slice(-5);
  const maxAccuracy = Math.max(...recentSessions.map(s => s.accuracy), 100);

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-3xl font-light text-zen-700 text-center animate-fade-in">训练完成</h1>

      {/* Achievement Badges */}
      {(isNewHighScore || isNewMaxNLevel) && (
        <div className="flex gap-2 justify-center animate-bounce">
          {isNewHighScore && (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              🏆 新纪录！
            </div>
          )}
          {isNewMaxNLevel && (
            <div className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              ⭐ 新难度解锁！
            </div>
          )}
        </div>
      )}

      {/* 成绩卡片 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-zen-200 space-y-4 animate-slide-up">
        <div className="text-center">
          <div className="text-6xl font-light text-sage-600">{summary.accuracy}%</div>
          <div className="text-sm text-zen-400 mt-1">准确率</div>
          {summary.score && (
            <div className="text-lg font-medium text-zen-600 mt-2">+{summary.score} 分</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-zen-50 rounded-xl p-3">
            <div className="text-2xl font-mono text-zen-700">{summary.config.nLevel}-Back</div>
            <div className="text-xs text-zen-400">难度</div>
          </div>
          <div className="bg-zen-50 rounded-xl p-3">
            <div className="text-2xl font-mono text-zen-700">
              {summary.avgReactionTimeMs}
              <span className="text-sm">ms</span>
            </div>
            <div className="text-xs text-zen-400">平均反应时间</div>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs border-t border-zen-200 pt-4">
          <div>
            <div className="text-2xl font-mono text-green-600">{summary.correctCount}</div>
            <div className="text-zen-400">正确</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-red-500">{summary.incorrectCount}</div>
            <div className="text-zen-400">错误</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-zen-400">{summary.missedCount}</div>
            <div className="text-zen-400">超时</div>
          </div>
        </div>

        <div className="text-center text-xs text-zen-400 pt-2 border-t border-zen-200">
          用时: {(summary.durationMs / 1000).toFixed(1)}秒 · 共 {summary.totalRounds} 题
        </div>
      </div>



      {/* 操作按钮 */}
      <div className="space-y-3">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                     hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
        >
          再来一局
        </button>
        <button
          onClick={onBackHome}
          className="w-full py-3 rounded-xl bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-[0.98] transition-all"
        >
          ← 返回首页
        </button>
      </div>
    </div>
  );
}
