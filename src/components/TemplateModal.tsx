import React from 'react';
import { X, Sparkles, CloudSun, RotateCw, Monitor } from 'lucide-react';
import { projectManager } from '../project/projectManager';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const templates = projectManager.getTemplates();

  const handleSelectTemplate = (templateId: string) => {
    projectManager.createFromTemplate(templateId);
    onClose();
  };

  const getTemplateIcon = (iconName: string) => {
    if (iconName === 'CloudSun') return <CloudSun className="w-6 h-6 text-amber-400" />;
    if (iconName === 'RotateCw') return <RotateCw className="w-6 h-6 text-emerald-400" />;
    if (iconName === 'Monitor') return <Monitor className="w-6 h-6 text-sky-400" />;
    return <Sparkles className="w-6 h-6 text-violet-400" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Új Projekt Sablon Választása
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl.id)}
              className="group p-3.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition flex items-start space-x-3.5 shadow-sm"
            >
              <div className="p-2 bg-slate-900 group-hover:bg-slate-800 rounded-lg border border-slate-800 transition">
                {getTemplateIcon(tpl.icon)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">
                    {tpl.name}
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {tpl.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {tpl.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
