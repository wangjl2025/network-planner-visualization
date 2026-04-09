import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface InfoPanelProps {
  title: string;
  content: ReactNode;
  className?: string;
}

export function InfoPanel({ title, content, className = '' }: InfoPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-cyan-400" />
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      </div>
      <div className="text-slate-300">{content}</div>
    </motion.div>
  );
}
