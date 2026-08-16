'use client';

import { useEffect, useState } from 'react';

interface ArchitectureDiagramProps {
  mermaid: string;
  title?: string;
}

// Renders a Mermaid diagram (from the README Architecture section) as SVG,
// using the mermaid package on the client side (SSR disabled).
export default function ArchitectureDiagram({
  mermaid,
  title = 'Architecture',
}: ArchitectureDiagramProps) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaidModule = await import('mermaid');
        const mermaidInstance = mermaidModule.default;
        mermaidInstance.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          themeVariables: {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '14px',
            primaryColor: '#eef2ff',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#c7d2fe',
            lineColor: '#9ca3af',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#ffffff',
          },
        });
        const id = 'architecture-diagram-' + Date.now();
        const { svg: renderedSvg } = await mermaidInstance.render(id, mermaid);
        if (!cancelled) setSvg(renderedSvg);
      } catch (e) {
        console.error('Failed to render architecture diagram:', e);
        if (!cancelled) setError(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [mermaid]);

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Architecture diagram could not be rendered.
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-200 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 transition-colors duration-200 dark:text-white">
        {title}
      </h2>
      <div className="min-w-max" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
