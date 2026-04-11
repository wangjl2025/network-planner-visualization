import React, { useState } from 'react';
import { getRFCsBySceneId, getRelatedStandardsBySceneId, RFCReference } from '../../data/rfcReferences';
import { allTerminology, Terminology, searchTerminology } from '../../data/terminology';

interface ReferencesPanelProps {
  sceneId: string;
  className?: string;
}

export const ReferencesPanel: React.FC<ReferencesPanelProps> = ({ sceneId, className = '' }) => {
  const [activeTab, setActiveTab] = useState<'rfc' | 'terminology'>('rfc');
  const [searchQuery, setSearchQuery] = useState('');
  
  const rfcs = getRFCsBySceneId(sceneId);
  const relatedStandards = getRelatedStandardsBySceneId(sceneId);
  
  const filteredTerms = searchQuery 
    ? searchTerminology(searchQuery)
    : allTerminology.slice(0, 20); // 默认显示前20个

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rfc')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'rfc'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📚 RFC标准
        </button>
        <button
          onClick={() => setActiveTab('terminology')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'terminology'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📝 术语对照
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'rfc' ? (
          <div className="space-y-4">
            {/* RFC列表 */}
            {rfcs.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  相关RFC标准
                </h4>
                <ul className="space-y-2">
                  {rfcs.map((rfc, index) => (
                    <RFCItem key={index} rfc={rfc} />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                本场景暂无特定RFC引用
              </p>
            )}

            {/* 相关标准 */}
            {relatedStandards.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  相关技术概念
                </h4>
                <div className="flex flex-wrap gap-2">
                  {relatedStandards.map((std, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* 搜索框 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索术语（中英文/缩写）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 术语列表 */}
            <div className="space-y-2">
              {filteredTerms.map((term, index) => (
                <TerminologyItem key={index} term={term} />
              ))}
              {filteredTerms.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  未找到匹配的术语
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// RFC条目组件
const RFCItem: React.FC<{ rfc: RFCReference }> = ({ rfc }) => {
  return (
    <li className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 
                         text-blue-800 dark:text-blue-300 rounded mb-1">
            {rfc.number}
          </span>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {rfc.title}
          </p>
        </div>
        {rfc.url && (
          <a
            href={rfc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 
                     dark:hover:text-blue-300 text-xs whitespace-nowrap"
          >
            查看 →
          </a>
        )}
      </div>
    </li>
  );
};

// 术语条目组件
const TerminologyItem: React.FC<{ term: Terminology }> = ({ term }) => {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {term.en}
        </span>
        {term.abbreviation && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 
                         text-blue-800 dark:text-blue-300 rounded">
            {term.abbreviation}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {term.cn}
      </p>
    </div>
  );
};

export default ReferencesPanel;
