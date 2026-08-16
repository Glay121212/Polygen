'use client';

import { useState } from 'react';
import ModelViewer from '@/components/ModelViewer';
import { Loader2, Download, Sparkles, Box, Cpu } from 'lucide-react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [objContent, setObjContent] = useState<string>('');
  const [error, setError] = useState('');

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError('');
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate');
      }
      
      setObjContent(data.obj);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!objContent) return;
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.replace(/\s+/g, '_').toLowerCase() || 'model'}.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Box size={18} />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">PolyGen 3D</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-full flex items-center gap-1.5">
            <Cpu size={13} />
            <span>{selectedModel}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Input Panel */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Text to 3D</h2>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-sm">
              Describe an object to generate a colorful 3D Wavefront .OBJ file ready to preview, customize, and download.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A low poly medieval broadsword with a glowing ruby gem..."
                className="w-full h-28 p-3 bg-transparent resize-none outline-none text-sm placeholder:text-zinc-400"
                disabled={isGenerating}
                autoFocus
              />
            </div>

            {/* AI Model Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="text-zinc-500 font-medium flex items-center gap-1">
                <Cpu size={14} />
                AI Model:
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isGenerating}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommended)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating 3D Model...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate 3D Model
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Prompts */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-400">Try a sample prompt:</span>
            <div className="flex flex-wrap gap-2">
              {['Medieval Sword', 'Space Rocket', 'Treasure Chest', 'Magic Wand', 'Golden Crown', 'Cyberpunk Car'].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setPrompt(`A low poly ${sample.toLowerCase()}`);
                  }}
                  disabled={isGenerating}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-auto hidden lg:block text-xs text-zinc-400 space-y-1">
            <p>• Powered by Gemini 3.6 Flash model</p>
            <p>• Multi-part color palette & vertex colors supported</p>
            <p>• Customize colors, materials, roughness & lighting</p>
          </div>
        </div>

        {/* Right Column: 3D Viewer */}
        <div className="flex-1 min-h-[440px] lg:min-h-0 relative flex flex-col">
          <div className="flex-1 rounded-2xl overflow-hidden relative">
            <ModelViewer objContent={objContent} />
          </div>
          
          {/* Action Bar */}
          {objContent && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                <Download size={16} />
                Download .OBJ
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

