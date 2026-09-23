'use client';

import React, { useState } from 'react';
import {
  Layers,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Terminal,
  Cpu,
  Database,
  Globe,
  Shield,
  Server,
  Zap,
  HardDrive,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ArchitectureDiagramProps {
  diagram: string;
  title?: string;
  category?: string;
}

export function ArchitectureDiagram({ diagram, title, category }: ArchitectureDiagramProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'blueprint'>('visual');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(diagram);
    setIsCopied(true);
    toast.success('Architecture diagram copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`mt-3 rounded-xl border border-dark-200 dark:border-dark-700/80 bg-dark-50/70 dark:bg-dark-900/60 overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary-500 shadow-2xl' : 'shadow-sm'}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-dark-100/80 dark:bg-dark-800/80 border-b border-dark-200/80 dark:border-dark-700/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-mono text-xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-dark-800 dark:text-dark-200">
            {title || 'System Architecture & Data Flow Diagram'}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
            System Design
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-dark-200/60 dark:bg-dark-700/60 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'}`}
            >
              Visual Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blueprint')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${viewMode === 'blueprint' ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'}`}
            >
              <Terminal className="w-3 h-3" />
              ASCII
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-100 hover:bg-dark-200/60 dark:hover:bg-dark-700/60 rounded-md transition-colors"
            title="Copy ASCII Diagram"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Expand / Minimize */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-100 hover:bg-dark-200/60 dark:hover:bg-dark-700/60 rounded-md transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand full diagram'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`p-4 transition-all ${isExpanded ? 'max-h-[800px]' : 'max-h-[480px]'} overflow-auto`}>
        {viewMode === 'visual' ? (
          <VisualArchitectureFlow diagram={diagram} />
        ) : (
          <pre className="p-3.5 bg-dark-950 text-emerald-400 font-mono text-xs leading-relaxed rounded-lg border border-dark-800 overflow-x-auto whitespace-pre selection:bg-emerald-900 selection:text-white">
            {diagram}
          </pre>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3.5 py-1.5 bg-dark-100/50 dark:bg-dark-800/40 border-t border-dark-200/60 dark:border-dark-700/60 flex items-center justify-between text-[11px] text-dark-500 dark:text-dark-400">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-500" />
          Production-grade architectural flow with failover & async queues
        </span>
        <span className="font-mono text-[10px]">Tier-1 System Pattern</span>
      </div>
    </div>
  );
}

/**
 * Visual interactive graph representation of the architecture layers
 */
function VisualArchitectureFlow({ diagram }: { diagram: string }) {
  const isEventPipeline = diagram.toLowerCase().includes('kafka') || diagram.toLowerCase().includes('pipeline') || diagram.toLowerCase().includes('ingestion');
  const isRateLimiter = diagram.toLowerCase().includes('rate limit') || diagram.toLowerCase().includes('redis') && diagram.toLowerCase().includes('token');
  const isPartnerB2B = diagram.toLowerCase().includes('webhook') || diagram.toLowerCase().includes('partner') || diagram.toLowerCase().includes('onboarding');

  return (
    <div className="space-y-4">
      {/* Layer 1: Edge & Client Ingestion */}
      <div className="p-3 rounded-lg border border-blue-200/60 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>1. Inbound Clients & Edge Entrypoint</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-blue-100 dark:border-blue-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">Traffic Sources</span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Mobile Apps, Web SPAs, B2B Webhooks & Partner APIs</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-blue-100 dark:border-blue-900/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-dark-800 dark:text-white">Edge WAF / CDN</span>
              <Shield className="w-3 h-3 text-emerald-500" />
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Cloudflare / AWS CloudFront, SSL/TLS 1.3 Termination, DDoS Guard</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-blue-100 dark:border-blue-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">API Gateway / Envoy</span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">JWT Token Auth, Rate Limiter (Token Bucket), Reverse Proxy</span>
          </div>
        </div>
      </div>

      {/* Downward Connector */}
      <div className="flex items-center justify-center -my-2 text-dark-400 dark:text-dark-500">
        <div className="h-4 w-0.5 bg-gradient-to-b from-blue-400 to-indigo-500" />
      </div>

      {/* Layer 2: Compute & Services Tier */}
      <div className="p-3 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-800 dark:text-indigo-300">
          <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>2. Stateless Service & Application Processing Tier</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center gap-1 mb-1">
              <Cpu className="w-3 h-3 text-indigo-500" />
              <span className="text-[11px] font-bold text-dark-800 dark:text-white">Stateless API Node Pool</span>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Auto-scaled Kubernetes pods handling schema validation & business logic</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-[11px] font-bold text-dark-800 dark:text-white">
                {isPartnerB2B ? 'Transformation & HMAC Engine' : 'Stream / Queue Worker Group'}
              </span>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">
              {isPartnerB2B
                ? 'Custom partner JSON mapping, cryptographic signatures, retry dispatcher'
                : 'Decoupled consumer pods processing background mutations & analytics'}
            </span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">Resilience Guard</span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Circuit breakers, bulkhead isolation, and dead-letter queue (DLQ) alerts</span>
          </div>
        </div>
      </div>

      {/* Downward Connector */}
      <div className="flex items-center justify-center -my-2 text-dark-400 dark:text-dark-500">
        <div className="h-4 w-0.5 bg-gradient-to-b from-indigo-500 to-emerald-500" />
      </div>

      {/* Layer 3: Persistence, Caching & Data Store */}
      <div className="p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>3. Data Storage, Event Streams & Caching Tier</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">
              {isEventPipeline ? 'Kafka Cluster' : 'Event Stream / Redis'}
            </span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Replicated event log with partition key sharding</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">Redis In-Memory Cache</span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">Sub-millisecond read cache, token buckets, and distributed locks</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <span className="text-[11px] font-bold text-dark-800 dark:text-white block">Primary Database</span>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">PostgreSQL / Aurora with multi-AZ failover and read replicas</span>
          </div>
          <div className="p-2.5 rounded-md bg-white dark:bg-dark-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span className="text-[11px] font-bold text-dark-800 dark:text-white">Cold Store / DLQ</span>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400">S3 Parquet / GCS, audit trails & unprocessable message quarantine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
