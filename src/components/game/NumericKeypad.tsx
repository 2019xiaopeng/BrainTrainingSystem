interface NumericKeypadProps {
  value: string;
  onInput: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  canInput: boolean;
}

/**
 * NumericKeypad - 数字键盘组件
 * 提供 0-9 数字输入、删除和提交功能
 */
export function NumericKeypad({
  value,
  onInput,
  onBackspace,
  onSubmit,
  disabled = false,
  canInput,
}: NumericKeypadProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-zen-200">
      {/* 输入显示 */}
      <div className="text-center mb-3">
        <div className="text-xs text-zen-400 mb-1">
          {canInput ? '请输入答案' : '记住这道题的答案'}
        </div>
        <div className="text-4xl font-mono text-zen-700 h-12 flex items-center justify-center">
          {canInput ? (value || '_') : '—'}
        </div>
      </div>

      {/* 数字键盘 */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            onClick={() => onInput(digit.toString())}
            disabled={!canInput || disabled}
            className="h-14 rounded-xl text-xl font-medium bg-zen-50 text-zen-700
                       hover:bg-zen-100 active:scale-95 active:bg-zen-200
                       transition-all duration-150
                       disabled:opacity-30 disabled:cursor-not-allowed
                       disabled:active:scale-100"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={onBackspace}
          disabled={!canInput || disabled}
          className="h-14 rounded-xl text-sm font-medium bg-red-50 text-red-600
                     hover:bg-red-100 active:scale-95 active:bg-red-200
                     transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:active:scale-100"
        >
          ← 删除
        </button>
        <button
          onClick={() => onInput('0')}
          disabled={!canInput || disabled}
          className="h-14 rounded-xl text-xl font-medium bg-zen-50 text-zen-700
                     hover:bg-zen-100 active:scale-95 active:bg-zen-200
                     transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:active:scale-100"
        >
          0
        </button>
        <button
          onClick={onSubmit}
          disabled={!canInput || value === '' || disabled}
          className="h-14 rounded-xl text-sm font-medium bg-sage-500 text-white
                     hover:bg-sage-600 active:scale-95 active:bg-sage-700
                     transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:active:scale-100"
        >
          ✓ 确认
        </button>
      </div>
    </div>
  );
}
