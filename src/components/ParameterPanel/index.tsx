import { useState } from 'react';
import { Sliders, Info } from 'lucide-react';

export interface Parameter {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean' | 'range';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  unit?: string;
  description?: string;
}

export interface ParameterPanelProps {
  parameters: Parameter[];
  onChange: (id: string, value: number | string | boolean) => void;
  onReset?: () => void;
}

export function ParameterPanel({ parameters, onChange, onReset }: ParameterPanelProps) {
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  const handleChange = (id: string, value: number | string | boolean) => {
    onChange(id, value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white">参数调节</h3>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            重置默认值
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {parameters.map((param) => (
          <div key={param.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {param.name}
              </label>
              {param.description && (
                <button
                  onClick={() => setExpandedParam(expandedParam === param.id ? null : param.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Info size={16} />
                </button>
              )}
            </div>

            {/* 数值输入 */}
            {param.type === 'number' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={param.value as number}
                  min={param.min}
                  max={param.max}
                  step={param.step || 1}
                  onChange={(e) => handleChange(param.id, parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                {param.unit && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">{param.unit}</span>
                )}
              </div>
            )}

            {/* 范围滑块 */}
            {param.type === 'range' && (
              <div className="space-y-2">
                <input
                  type="range"
                  value={param.value as number}
                  min={param.min}
                  max={param.max}
                  step={param.step || 1}
                  onChange={(e) => handleChange(param.id, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{param.min}{param.unit}</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {param.value}{param.unit}
                  </span>
                  <span>{param.max}{param.unit}</span>
                </div>
              </div>
            )}

            {/* 下拉选择 */}
            {param.type === 'select' && param.options && (
              <select
                value={param.value as string}
                onChange={(e) => handleChange(param.id, e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                {param.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {/* 布尔开关 */}
            {param.type === 'boolean' && (
              <button
                onClick={() => handleChange(param.id, !(param.value as boolean))}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${param.value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${param.value ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            )}

            {/* 参数说明 */}
            {expandedParam === param.id && param.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                {param.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
