import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout } from '../../../components/SceneLayout';
import { Shield, Lock, Eye, FileText, Users, Server, CheckCircle, XCircle, AlertCircle, ClipboardCheck, Download, RotateCcw, BarChart3 } from 'lucide-react';

// 内联类型定义
interface SecurityRequirement {
  id: string;
  category: string;
  name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  description: string;
}

interface SecurityDomain {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  requirements: SecurityRequirement[];
}

const securityDomains: SecurityDomain[] = [
  {
    id: 'physical',
    name: '安全物理环境',
    icon: Server,
    color: '#3B82F6',
    requirements: [
      { id: 'p1', category: '物理位置', name: '机房选址', level1: true, level2: true, level3: true, description: '机房应选择在具有防震、防风和防雨等能力的建筑内' },
      { id: 'p2', category: '物理访问', name: '电子门禁', level1: false, level2: true, level3: true, description: '机房出入口应配置电子门禁系统' },
      { id: 'p3', category: '防盗窃', name: '视频监控', level1: false, level2: false, level3: true, description: '机房应设置视频监控系统' },
      { id: 'p4', category: '防雷击', name: '防雷接地', level1: true, level2: true, level3: true, description: '机房应设置防雷保安器或过压保护装置' },
    ],
  },
  {
    id: 'network',
    name: '安全通信网络',
    icon: Shield,
    color: '#10B981',
    requirements: [
      { id: 'n1', category: '网络架构', name: '冗余设计', level1: false, level2: true, level3: true, description: '应避免单点故障，关键网络设备应冗余部署' },
      { id: 'n2', category: '边界防护', name: '访问控制', level1: true, level2: true, level3: true, description: '应在网络边界或区域之间部署访问控制设备' },
      { id: 'n3', category: '入侵防范', name: '入侵检测', level1: false, level2: true, level3: true, description: '应在关键网络节点处检测、防止或限制入侵行为' },
      { id: 'n4', category: '安全审计', name: '日志留存', level1: false, level2: true, level3: true, description: '审计记录应留存不少于六个月' },
    ],
  },
  {
    id: 'device',
    name: '安全区域边界',
    icon: Lock,
    color: '#F59E0B',
    requirements: [
      { id: 'd1', category: '身份鉴别', name: '双因素认证', level1: false, level2: false, level3: true, description: '应对网络管理员进行双因素认证' },
      { id: 'd2', category: '访问控制', name: '最小权限', level1: true, level2: true, level3: true, description: '应重命名或修改默认账户的默认口令' },
      { id: 'd3', category: '安全审计', name: '集中审计', level1: false, level2: true, level3: true, description: '应对审计记录进行保护，定期备份' },
      { id: 'd4', category: '入侵防范', name: '恶意代码', level1: true, level2: true, level3: true, description: '应在关键网络节点处对恶意代码进行检测和清除' },
    ],
  },
  {
    id: 'management',
    name: '安全管理中心',
    icon: Eye,
    color: '#8B5CF6',
    requirements: [
      { id: 'm1', category: '系统管理', name: '集中管控', level1: false, level2: true, level3: true, description: '应划分出特定的管理区域' },
      { id: 'm2', category: '审计管理', name: '日志分析', level1: false, level2: true, level3: true, description: '应对分散的设备进行集中管理' },
      { id: 'm3', category: '安全管理', name: '态势感知', level1: false, level2: false, level3: true, description: '应建立网络安全态势感知平台' },
      { id: 'm4', category: '集中管控', name: '统一管控', level1: false, level2: true, level3: true, description: '应建立统一的安全管理中心' },
    ],
  },
];

const levelDescriptions = {
  1: { name: '第一级', description: '自主保护级（用户负主要责任）', color: 'text-green-400', bg: 'bg-green-500/20' },
  2: { name: '第二级', description: '指导保护级（有监管指导）', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  3: { name: '第三级', description: '监督保护级（国家强制监督）', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

export function SecurityComplianceScene() {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(3);
  const [selectedDomain, setSelectedDomain] = useState<string>('network');
  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState<Record<string, string>>({});

  const sceneData = {
    id: 'security-compliance',
    title: '等保2.0三级要求',
    description: '网络安全等级保护2.0标准三级要求详解，含交互式测评检查表',
    phase: 3 as const,
    category: '网络安全',
    duration: '8-10分钟',
    difficulty: 'medium' as const,
  };

  const currentDomain = securityDomains.find(d => d.id === selectedDomain);
  const levelInfo = levelDescriptions[selectedLevel];

  const getRequirementStatus = (req: SecurityRequirement) => {
    const required = selectedLevel === 1 ? req.level1 : selectedLevel === 2 ? req.level2 : req.level3;
    return required;
  };

  // 获取所有要求项
  const allRequirements = useMemo(() => {
    const reqs: { domain: string; domainName: string; req: SecurityRequirement }[] = [];
    securityDomains.forEach(domain => {
      domain.requirements.forEach(req => {
        reqs.push({ domain: domain.id, domainName: domain.name, req });
      });
    });
    return reqs;
  }, []);

  // 计算检查表统计
  const checklistStats = useMemo(() => {
    const requiredReqs = allRequirements.filter(item => {
      const required = selectedLevel === 1 ? item.req.level1 : selectedLevel === 2 ? item.req.level2 : item.req.level3;
      return required;
    });
    
    const totalRequired = requiredReqs.length;
    const checkedCount = requiredReqs.filter(item => checkedItems[item.req.id]).length;
    const progress = totalRequired > 0 ? Math.round((checkedCount / totalRequired) * 100) : 0;
    
    return { totalRequired, checkedCount, progress };
  }, [allRequirements, checkedItems, selectedLevel]);

  // 切换检查项
  const toggleCheckItem = (reqId: string) => {
    setCheckedItems(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  // 更新备注
  const updateNote = (reqId: string, note: string) => {
    setChecklistNotes(prev => ({ ...prev, [reqId]: note }));
  };

  // 重置检查表
  const resetChecklist = () => {
    setCheckedItems({});
    setChecklistNotes({});
  };

  // 导出检查表
  const exportChecklist = () => {
    const requiredReqs = allRequirements.filter(item => {
      const required = selectedLevel === 1 ? item.req.level1 : selectedLevel === 2 ? item.req.level2 : item.req.level3;
      return required;
    });
    
    let report = `等保2.0 ${levelInfo.name} 测评检查表\n`;
    report += `生成时间: ${new Date().toLocaleString()}\n`;
    report += `完成进度: ${checklistStats.checkedCount}/${checklistStats.totalRequired} (${checklistStats.progress}%)\n`;
    report += '='.repeat(50) + '\n\n';
    
    requiredReqs.forEach(item => {
      const status = checkedItems[item.req.id] ? '✓ 已满足' : '✗ 未满足';
      report += `[${status}] ${item.domainName} - ${item.req.name}\n`;
      report += `    描述: ${item.req.description}\n`;
      if (checklistNotes[item.req.id]) {
        report += `    备注: ${checklistNotes[item.req.id]}\n`;
      }
      report += '\n';
    });
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `等保2.0_${levelInfo.name}_检查表_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <SceneLayout scene={sceneData} showSidebar={false}>
      <div className="space-y-6 h-full overflow-y-auto">
        {/* 等级选择 */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            选择等级保护级别
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(levelDescriptions) as unknown as number[]).map((level) => {
              const info = levelDescriptions[level as 1 | 2 | 3];
              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level as 1 | 2 | 3)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedLevel === level
                      ? `${info.bg} border-current ${info.color}`
                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className={`font-bold text-lg ${selectedLevel === level ? info.color : 'text-white'}`}>
                    {info.name}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{info.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 安全域选择 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {securityDomains.map((domain) => {
            const Icon = domain.icon;
            const isSelected = selectedDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  isSelected
                    ? 'bg-opacity-30 border-current'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
                style={{
                  backgroundColor: isSelected ? `${domain.color}30` : undefined,
                  borderColor: isSelected ? domain.color : undefined,
                  color: isSelected ? domain.color : undefined,
                }}
              >
                <Icon className="w-8 h-8" />
                <span className="font-semibold">{domain.name}</span>
              </button>
            );
          })}
        </div>

        {/* 详细要求 */}
        {currentDomain && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <currentDomain.icon className="w-8 h-8" style={{ color: currentDomain.color }} />
              <div>
                <h3 className="text-xl font-bold">{currentDomain.name}</h3>
                <p className="text-gray-400">{levelInfo.name} 安全要求</p>
              </div>
            </div>

            <div className="space-y-4">
              {currentDomain.requirements.map((req, index) => {
                const isRequired = getRequirementStatus(req);
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      isRequired
                        ? 'bg-green-900/20 border-green-500/50'
                        : 'bg-gray-700/30 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            {req.category}
                          </span>
                          <span className="font-semibold">{req.name}</span>
                        </div>
                        <p className="text-sm text-gray-400">{req.description}</p>
                      </div>
                      <div className="ml-4">
                        {isRequired ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${req.level1 ? 'bg-green-500/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                        一级
                      </span>
                      <span className={`px-2 py-1 rounded ${req.level2 ? 'bg-blue-500/30 text-blue-400' : 'bg-gray-700 text-gray-500'}`}>
                        二级
                      </span>
                      <span className={`px-2 py-1 rounded ${req.level3 ? 'bg-orange-500/30 text-orange-400' : 'bg-gray-700 text-gray-500'}`}>
                        三级
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* 交互式检查表 */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-400" />
              等保测评交互式检查表
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChecklist(!showChecklist)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {showChecklist ? '收起检查表' : '展开检查表'}
              </button>
              {showChecklist && (
                <>
                  <button
                    onClick={resetChecklist}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                  <button
                    onClick={exportChecklist}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 进度条 */}
          {showChecklist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  检查进度
                </span>
                <span className="text-sm font-medium">
                  <span className={checklistStats.progress === 100 ? 'text-green-400' : 'text-blue-400'}>
                    {checklistStats.checkedCount}
                  </span>
                  <span className="text-gray-500"> / {checklistStats.totalRequired} </span>
                  <span className="text-gray-400">({checklistStats.progress}%)</span>
                </span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${checklistStats.progress}%` }}
                  className={`h-full rounded-full transition-colors ${
                    checklistStats.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </motion.div>
          )}

          {/* 检查表内容 */}
          <AnimatePresence>
            {showChecklist && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 max-h-[500px] overflow-y-auto"
              >
                {securityDomains.map((domain) => {
                  const domainReqs = domain.requirements.filter(req => {
                    const required = selectedLevel === 1 ? req.level1 : selectedLevel === 2 ? req.level2 : req.level3;
                    return required;
                  });
                  
                  if (domainReqs.length === 0) return null;
                  
                  const domainChecked = domainReqs.filter(req => checkedItems[req.id]).length;
                  const domainProgress = Math.round((domainChecked / domainReqs.length) * 100);
                  
                  return (
                    <div key={domain.id} className="border border-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors"
                        style={{ backgroundColor: `${domain.color}15` }}
                      >
                        <div className="flex items-center gap-3">
                          <domain.icon className="w-5 h-5" style={{ color: domain.color }} />
                          <span className="font-medium">{domain.name}</span>
                          <span className="text-xs text-gray-500">
                            ({domainChecked}/{domainReqs.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${domainProgress}%`,
                                backgroundColor: domainProgress === 100 ? '#22c55e' : domain.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {domainReqs.map((req) => (
                          <div 
                            key={req.id}
                            className={`p-3 rounded-lg border transition-all ${
                              checkedItems[req.id] 
                                ? 'bg-green-900/20 border-green-500/30' 
                                : 'bg-gray-800/50 border-gray-700'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleCheckItem(req.id)}
                                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  checkedItems[req.id]
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-gray-500 hover:border-gray-400'
                                }`}
                              >
                                {checkedItems[req.id] && <CheckCircle className="w-3 h-3 text-white" />}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {req.category}
                                  </span>
                                  <span className="font-medium text-sm">{req.name}</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{req.description}</p>
                                <input
                                  type="text"
                                  placeholder="添加备注..."
                                  value={checklistNotes[req.id] || ''}
                                  onChange={(e) => updateNote(req.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-gray-900/50 border border-gray-700 rounded text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 等保2.0要点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-400" />
              等保2.0主要变化
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <span>从"信息系统安全等级保护"变为"网络安全等级保护"</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <span>扩展了保护对象范围：云计算、物联网、移动互联、工业控制</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <span>强化了可信计算要求，增加"可信验证"控制点</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <span>通用要求+扩展要求的新结构</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              三级系统定级标准
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span>信息系统受到破坏后，会对社会秩序和公共利益造成严重损害</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span>或者对国家安全造成危害</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span>适用于地市级以上国家机关、企业、事业单位内部重要的信息系统</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span>跨省或全国联网运行的用于生产、调度、管理、指挥等的系统</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}
