import { useState, useEffect, useCallback } from 'react';
import { SceneLayout } from '../../../components/SceneLayout';
import { Play, Pause, RotateCcw, Server, ArrowRight, Layers, Network, Database } from 'lucide-react';

// VXLAN详解场景
export function VXLANDetailScene() {
  // 场景数据
  const sceneData = {
    id: 'vxlan-detail',
    title: 'VXLAN详解',
    description: 'VXLAN报文封装与解封装过程，展示VNI隔离、VTEP隧道、Underlay/Overlay架构',
    phase: 1 as const,
    category: '网络虚拟化',
    difficulty: 'medium' as const,
    duration: '6-8分钟',
  };

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVNI, setSelectedVNI] = useState(100);
  const [showEncapsulation, setShowEncapsulation] = useState(true);

  // VNI选项
  const vniOptions = [
    { vni: 100, tenant: '租户A', color: '#3b82f6', subnet: '10.1.1.0/24' },
    { vni: 200, tenant: '租户B', color: '#10b981', subnet: '10.2.2.0/24' },
    { vni: 300, tenant: '租户C', color: '#f59e0b', subnet: '10.3.3.0/24' },
  ];

  // 步骤定义
  const steps = [
    { id: 'intro', title: 'VXLAN简介', description: '虚拟扩展局域网，基于UDP封装实现大二层扩展' },
    { id: 'architecture', title: 'Underlay vs Overlay', description: '物理网络负责IP转发，虚拟网络提供二层扩展' },
    { id: 'encapsulation', title: '报文封装', description: '原始以太网帧被封装在VXLAN-UDP-IP报文中' },
    { id: 'vni', title: 'VNI隔离', description: '24位VNI标识符支持1600万租户隔离' },
    { id: 'forwarding', title: '数据转发', description: 'VTEP学习MAC地址，建立隧道转发报文' },
  ];

  // 自动播放
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 重置
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSelectedVNI(100);
    setShowEncapsulation(true);
  }, []);

  // 当前VNI信息
  const currentVNI = vniOptions.find(v => v.vni === selectedVNI) || vniOptions[0];

  // 渲染封装过程
  const renderEncapsulation = () => {
    if (!showEncapsulation) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-3">VXLAN报文封装结构</h4>
        
        {/* 原始帧 */}
        <div className="mb-4">
          <div className="text-gray-400 text-sm mb-2">原始以太网帧</div>
          <div className="flex">
            <div className="bg-blue-600 text-white px-3 py-2 text-xs rounded-l">目的MAC</div>
            <div className="bg-blue-500 text-white px-3 py-2 text-xs">源MAC</div>
            <div className="bg-blue-400 text-white px-3 py-2 text-xs">VLAN</div>
            <div className="bg-green-500 text-white px-6 py-2 text-xs flex-1">Payload</div>
            <div className="bg-gray-500 text-white px-3 py-2 text-xs rounded-r">FCS</div>
          </div>
        </div>

        <ArrowRight className="w-6 h-6 text-gray-400 mx-auto mb-4 rotate-90" />

        {/* VXLAN封装后 */}
        <div>
          <div className="text-gray-400 text-sm mb-2">VXLAN封装后（Outer + Inner）</div>
          <div className="flex flex-col gap-1">
            {/* Outer */}
            <div className="flex">
              <div className="bg-purple-600 text-white px-2 py-1 text-xs rounded-l">Outer MAC</div>
              <div className="bg-purple-500 text-white px-2 py-1 text-xs">Outer IP</div>
              <div className="bg-purple-400 text-white px-2 py-1 text-xs">UDP</div>
              <div className="bg-orange-500 text-white px-3 py-1 text-xs" style={{ backgroundColor: currentVNI.color }}>
                VNI:{selectedVNI}
              </div>
              <div className="bg-purple-300 text-white px-2 py-1 text-xs rounded-r">Reserved</div>
            </div>
            {/* Inner */}
            <div className="flex mt-1">
              <div className="bg-blue-600 text-white px-3 py-1 text-xs rounded-l opacity-70">目的MAC</div>
              <div className="bg-blue-500 text-white px-3 py-1 text-xs opacity-70">源MAC</div>
              <div className="bg-green-500 text-white px-8 py-1 text-xs flex-1 opacity-70">原始Payload</div>
              <div className="bg-gray-500 text-white px-3 py-1 text-xs rounded-r opacity-70">FCS</div>
            </div>
          </div>
        </div>

        {/* 关键字段说明 */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-700 rounded p-2">
            <div className="text-orange-400 font-medium">VXLAN Header</div>
            <div className="text-gray-400">8字节，含24位VNI</div>
          </div>
          <div className="bg-gray-700 rounded p-2">
            <div className="text-purple-400 font-medium">UDP Port</div>
            <div className="text-gray-400">4789（IANA分配）</div>
          </div>
          <div className="bg-gray-700 rounded p-2">
            <div className="text-green-400 font-medium">Overhead</div>
            <div className="text-gray-400">额外50字节开销</div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染网络拓扑
  const renderTopology = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-3">VXLAN网络架构</h4>
        
        <div className="relative h-64">
          {/* Underlay - 底层物理网络 */}
          <div className="absolute bottom-0 left-0 right-0 h-24 border-2 border-dashed border-gray-600 rounded-lg p-2">
            <div className="text-gray-500 text-xs mb-2">Underlay（物理网络）</div>
            <div className="flex justify-center items-center gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mb-1">
                  <Network className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-gray-400 text-xs">Spine</div>
              </div>
              <div className="flex gap-12">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center mb-1">
                    <Server className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-gray-400 text-xs">Leaf-1</div>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center mb-1">
                    <Server className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-gray-400 text-xs">Leaf-2</div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay - 虚拟网络 */}
          <div className="absolute top-0 left-0 right-0 h-28 border-2 border-blue-500/50 rounded-lg p-2 bg-blue-500/10">
            <div className="text-blue-400 text-xs mb-2">Overlay（虚拟网络）</div>
            <div className="flex justify-between items-center px-8">
              {/* VTEP 1 */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-1" style={{ backgroundColor: currentVNI.color + '40', border: `2px solid ${currentVNI.color}` }}>
                  <Layers className="w-7 h-7" style={{ color: currentVNI.color }} />
                </div>
                <div className="text-white text-xs font-medium">VTEP-1</div>
                <div className="text-gray-400 text-xs">10.0.1.1</div>
              </div>

              {/* 隧道 */}
              <div className="flex-1 mx-4">
                <div className="h-0.5 bg-gradient-to-r from-blue-500 to-green-500 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-300">
                    VXLAN隧道
                  </div>
                  {/* 数据流动画 */}
                  {currentStep >= 4 && (
                    <div className="absolute top-0 left-0 w-4 h-4 bg-white rounded-full animate-ping" style={{ animation: 'slideRight 2s infinite' }} />
                  )}
                </div>
              </div>

              {/* VTEP 2 */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-1" style={{ backgroundColor: currentVNI.color + '40', border: `2px solid ${currentVNI.color}` }}>
                  <Layers className="w-7 h-7" style={{ color: currentVNI.color }} />
                </div>
                <div className="text-white text-xs font-medium">VTEP-2</div>
                <div className="text-gray-400 text-xs">10.0.1.2</div>
              </div>
            </div>
          </div>

          {/* 连接虚线 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="25%" y1="75%" x2="20%" y2="100%" stroke="#6b7280" strokeWidth="1" strokeDasharray="4" />
            <line x1="75%" y1="75%" x2="80%" y2="100%" stroke="#6b7280" strokeWidth="1" strokeDasharray="4" />
          </svg>
        </div>

        {/* VNI映射表 */}
        <div className="mt-4 bg-gray-900 rounded p-3">
          <div className="text-gray-400 text-xs mb-2">VTEP VNI映射表</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">VNI</th>
                <th className="text-left py-1">租户</th>
                <th className="text-left py-1">子网</th>
                <th className="text-left py-1">VTEP IP</th>
              </tr>
            </thead>
            <tbody>
              {vniOptions.map(vni => (
                <tr 
                  key={vni.vni} 
                  className={`${selectedVNI === vni.vni ? 'bg-gray-700' : ''} cursor-pointer hover:bg-gray-800`}
                  onClick={() => setSelectedVNI(vni.vni)}
                >
                  <td className="py-1">
                    <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: vni.color }}>
                      {vni.vni}
                    </span>
                  </td>
                  <td className="py-1 text-gray-300">{vni.tenant}</td>
                  <td className="py-1 text-gray-400">{vni.subnet}</td>
                  <td className="py-1 text-gray-400">10.0.1.1, 10.0.1.2</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <SceneLayout scene={sceneData}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：控制面板 */}
        <div className="space-y-4">
          {/* 步骤进度 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">学习步骤</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      index === currentStep
                        ? 'bg-white text-blue-600'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-400'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </div>
                  {index === currentStep && (
                    <p className="text-sm mt-2 opacity-90">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 播放控制 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>

          {/* VNI选择 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">选择租户（VNI）</h3>
            <div className="space-y-2">
              {vniOptions.map(vni => (
                <button
                  key={vni.vni}
                  onClick={() => setSelectedVNI(vni.vni)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    selectedVNI === vni.vni
                      ? 'bg-gray-700 ring-2 ring-blue-500'
                      : 'bg-gray-700/50 hover:bg-gray-700'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: vni.color }}
                  >
                    {vni.vni}
                  </div>
                  <div className="text-left">
                    <div className="text-white text-sm">{vni.tenant}</div>
                    <div className="text-gray-400 text-xs">{vni.subnet}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：可视化区域 */}
        <div className="lg:col-span-2 space-y-4">
          {renderTopology()}
          {renderEncapsulation()}

          {/* 关键知识点 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">关键知识点</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-700 rounded p-3">
                <div className="text-blue-400 text-sm font-medium mb-1">VNI（VXLAN Network Identifier）</div>
                <div className="text-gray-400 text-xs">24位标识符，支持16M（16,777,216）个隔离网络</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-green-400 text-sm font-medium mb-1">VTEP（VXLAN Tunnel EndPoint）</div>
                <div className="text-gray-400 text-xs">VXLAN隧道端点，负责封装/解封装VXLAN报文</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-purple-400 text-sm font-medium mb-1">Underlay网络</div>
                <div className="text-gray-400 text-xs">底层物理IP网络，负责VXLAN报文的三层转发</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-orange-400 text-sm font-medium mb-1">Overlay网络</div>
                <div className="text-gray-400 text-xs">虚拟二层网络，通过VXLAN隧道跨越三层边界</div>
              </div>
            </div>
          </div>

          {/* 配置示例 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">华为设备配置示例</h4>
            <pre className="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-x-auto">
{`# 创建NVE接口（VXLAN隧道端点）
interface Nve1
 source 10.0.1.1
 vni 100 head-end peer-list 10.0.1.2
 vni 200 head-end peer-list 10.0.1.2

# 创建BD域并绑定VNI
bridge-domain 100
 vxlan vni 100

# 接口加入BD域
interface 10GE1/0/1
 bridge-domain 100`}
            </pre>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
