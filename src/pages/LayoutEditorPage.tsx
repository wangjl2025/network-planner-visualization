import { useState } from 'react';
import { LayoutEditor } from '../components/LayoutEditor';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

// 初始布局配置 - 两地三中心
const INITIAL_ITEMS = [
  { id: 'production', name: '生产中心', x: 50, y: 20, color: '#3b82f6' },
  { id: 'sameCity', name: '同城灾备', x: 25, y: 70, color: '#22c55e' },
  { id: 'remote', name: '异地灾备', x: 75, y: 70, color: '#f59e0b' }
];

export function LayoutEditorPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [copied, setCopied] = useState(false);

  // 生成完整代码
  const generateCode = () => {
    return `// 获取数据中心位置（使用百分比坐标，与SVG viewBox一致）
// viewBox="0 0 1000 600"，所以 x*10, y*6 得到SVG坐标
const getCenterPosition = (index: number) => {
  const positions = [
${items.map(item => `    { x: ${item.x}, y: ${item.y} },   // ${item.name}`).join('\n')}
  ];
  return positions[index];
};`;
  };

  const handleCopyFullCode = () => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 头部 */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/scene/disaster-recovery"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回场景</span>
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <h1 className="text-lg font-semibold text-slate-100">
              两地三中心布局编辑器
            </h1>
          </div>
          <button
            onClick={handleCopyFullCode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制完整代码' : '复制完整代码'}
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：编辑器 */}
          <div>
            <LayoutEditor 
              initialItems={INITIAL_ITEMS}
              viewBoxWidth={1000}
              viewBoxHeight={600}
              onChange={setItems}
            />
          </div>

          {/* 右侧：代码预览 */}
          <div className="space-y-6">
            {/* 使用说明 */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">使用说明</h2>
              <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                <li>在左侧画布中拖拽三个数据中心卡片调整位置</li>
                <li>蓝色实线表示同步复制链路</li>
                <li>蓝色虚线表示异步复制链路</li>
                <li>点击"复制完整代码"获取可直接使用的代码</li>
                <li>将代码粘贴到 DisasterRecovery/index.tsx 中替换 getCenterPosition 函数</li>
              </ol>
            </div>

            {/* 代码预览 */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                <span className="text-sm font-medium text-slate-200">生成的代码</span>
                <span className="text-xs text-slate-500">实时更新</span>
              </div>
              <div className="p-4">
                <pre className="text-xs text-slate-300 overflow-x-auto">
                  <code>{generateCode()}</code>
                </pre>
              </div>
            </div>

            {/* 坐标参考 */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">坐标参考</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="text-slate-500">画布范围</div>
                  <div className="text-slate-300">X: 0% ~ 100%</div>
                  <div className="text-slate-300">Y: 0% ~ 100%</div>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-500">SVG 转换</div>
                  <div className="text-slate-300">svgX = x% × 10</div>
                  <div className="text-slate-300">svgY = y% × 6</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LayoutEditorPage;
