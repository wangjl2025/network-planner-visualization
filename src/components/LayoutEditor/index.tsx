import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Move, Copy, Grid3X3, RotateCcw, Check } from 'lucide-react';

interface LayoutItem {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface LayoutEditorProps {
  initialItems: LayoutItem[];
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  onChange?: (items: LayoutItem[]) => void;
}

export function LayoutEditor({ 
  initialItems, 
  viewBoxWidth = 1000, 
  viewBoxHeight = 600,
  onChange 
}: LayoutEditorProps) {
  const [items, setItems] = useState<LayoutItem[]>(initialItems);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDraggingId(id);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // 限制在画布内
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    setItems(prev => prev.map(item => 
      item.id === draggingId 
        ? { ...item, x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 }
        : item
    ));
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null);
      onChange?.(items);
    }
  }, [draggingId, items, onChange]);

  // 全局鼠标事件
  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  // 重置位置
  const handleReset = () => {
    setItems(initialItems);
    onChange?.(initialItems);
  };

  // 复制代码
  const handleCopyCode = () => {
    const code = `const positions = [
${items.map(item => `  { x: ${item.x}, y: ${item.y} },   // ${item.name}`).join('\n')}
];`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 生成SVG连线坐标
  const getSvgCoordinates = (item: LayoutItem) => ({
    x: (item.x / 100) * viewBoxWidth,
    y: (item.y / 100) * viewBoxHeight
  });

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">布局编辑器</span>
          <span className="text-xs text-slate-500 ml-2">拖拽调整位置</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏网格"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="重置位置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
      </div>

      {/* 画布 */}
      <div className="p-4">
        <div 
          ref={containerRef}
          className="relative w-full bg-slate-800/50 rounded-lg overflow-hidden cursor-crosshair"
          style={{ paddingBottom: `${(viewBoxHeight / viewBoxWidth) * 100}%` }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="absolute inset-0">
            {/* 网格 */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <defs>
                  <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                    <path d="M 10% 0 L 0 0 0 10%" fill="none" stroke="#64748b" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                {/* 中心线 */}
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4"/>
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4"/>
              </svg>
            )}

            {/* 连线预览 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" 
                 viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                 preserveAspectRatio="none">
              {items.length >= 2 && (
                <>
                  <line
                    x1={getSvgCoordinates(items[0]).x}
                    y1={getSvgCoordinates(items[0]).y}
                    x2={getSvgCoordinates(items[1]).x}
                    y2={getSvgCoordinates(items[1]).y}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    opacity="0.6"
                  />
                  <line
                    x1={getSvgCoordinates(items[0]).x}
                    y1={getSvgCoordinates(items[0]).y}
                    x2={getSvgCoordinates(items[2]).x}
                    y2={getSvgCoordinates(items[2]).y}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="8,8"
                    opacity="0.6"
                  />
                </>
              )}
            </svg>

            {/* 可拖拽元素 */}
            {items.map((item) => (
              <motion.div
                key={item.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none ${
                  draggingId === item.id ? 'z-50' : 'z-10'
                }`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.1 }}
              >
                <div 
                  className={`w-24 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-shadow ${
                    draggingId === item.id 
                      ? 'shadow-lg shadow-blue-500/30 border-blue-400' 
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  style={{ 
                    backgroundColor: `${item.color}20`,
                    borderColor: draggingId === item.id ? item.color : undefined
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-slate-200 text-center px-1">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.x}%, {item.y}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 坐标显示 */}
      <div className="px-4 pb-4">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-xs font-medium text-slate-400 mb-2">当前坐标配置</div>
          <div className="space-y-1 font-mono text-xs">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-slate-500">{item.name}:</span>
                <span className="text-blue-400">
                  x: {item.x.toFixed(1)}, y: {item.y.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutEditor;
