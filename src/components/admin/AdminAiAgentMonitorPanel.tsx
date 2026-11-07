import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Store,
  Trash2,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AI_AGENT_MCP_TOOL_CATALOG,
  loadAiAgentTelemetry,
  resetAiAgentTelemetry,
  type AiAgentTelemetrySnapshot,
} from '../../services/aiAgentPlatformService';

export const AdminAiAgentMonitorPanel: React.FC = () => {
  const { language, showToast } = useApp();
  const isKm = language === 'km';
  const [telemetry, setTelemetry] = useState<AiAgentTelemetrySnapshot>(() => loadAiAgentTelemetry());

  const handleRefresh = () => {
    setTelemetry(loadAiAgentTelemetry());
    showToast(
      isKm ? 'បានផ្ទុកទិន្នន័យតាមដាន AI Agent ថ្មីបំផុត!' : 'Refreshed AI Agent telemetry!',
      'success'
    );
  };

  const handleReset = () => {
    if (
      !window.confirm(
        isKm
          ? 'តើអ្នកពិតជាចង់សម្អាតស្ថិតិតាមដាន AI Agent ឱ្យទៅជា 0 មែនទេ? (មិនប៉ះពាល់ដល់ទិន្នន័យហាង ម្ហូប ឬអ្នកប្រើប្រាស់ឡើយ)'
          : 'Reset AI Agent monitoring counters to zero? (User, shop, and food data are never affected)'
      )
    ) {
      return;
    }
    setTelemetry(resetAiAgentTelemetry());
    showToast(isKm ? 'បានកំណត់ស្ថិតិ AI ឡើងវិញរួចរាល់។' : 'AI telemetry reset complete.', 'info');
  };

  const avgLatencyMs = useMemo(() => {
    if (!telemetry.totalRequests) return 0;
    return Math.max(1, Math.round(telemetry.totalLatencyMs / telemetry.totalRequests));
  }, [telemetry]);

  const cacheHitRate = useMemo(() => {
    if (!telemetry.totalRequests) return 0;
    return Math.round((telemetry.cacheHits / telemetry.totalRequests) * 100);
  }, [telemetry]);

  const topFoods = useMemo(() => {
    return Object.entries(telemetry.topSearchedFoods || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [telemetry]);

  const topShops = useMemo(() => {
    return Object.entries(telemetry.topSearchedShops || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [telemetry]);

  return (
    <div className="space-y-4">
      {/* Zero-Cost Architecture Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-800 to-teal-900 text-white shadow-sm border border-emerald-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[11px] font-extrabold">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {isKm
                  ? '$0.00 ឥតគិតថ្លៃជារៀងរហូត • Hybrid MCP AI Agent Active'
                  : '$0.00 Forever Mode • Hybrid MCP AI Agent Active'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold font-khmer">
              {isKm
                ? 'ផ្ទាំងគ្រប់គ្រង និងតាមដានប្រព័ន្ធ AI Agent (Cambodia Flavors & Tourism)'
                : 'Cambodia Flavors & Tourism — AI Agent Monitoring Dashboard'}
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {isKm
                ? 'ដំណើរការដោយ Local Smart MCP Engine ($0/ខែ) + LRU Cache + Rate Limit (25 សំណើ/នាទី) + ការត្រួតពិនិត្យសិទ្ធិ ៣ កម្រិត (Normal User / Shop Owner / Admin) គាំទ្រអ្នកប្រើប្រាស់ 10,000+ នាក់។'
                : 'Powered by Local Smart MCP Engine ($0/mo) + LRU Cache + Rate Limiter (25 req/min) + 3-Tier Role Security supporting 10,000+ users.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isKm ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-red-500/25 hover:bg-red-500/40 border border-red-300/30 text-red-100 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isKm ? 'សម្អាតស្ថិតិ' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'សំណើ AI សរុប' : 'Total AI Requests'}</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.totalRequests.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            {isKm ? 'រាប់ទាំងអស់ក្នុងប្រព័ន្ធ' : 'All MCP + Food turns'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'ចំណាយប៉ាន់ស្មាន' : 'Est. API Cost'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
            ${telemetry.estimatedTotalCostUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
            {isKm ? 'ឥតគិតថ្លៃ 100% ($0 Mode)' : '100% Free ($0 Mode)'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'ល្បឿនឆ្លើយតបមធ្យម' : 'Avg Response'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {avgLatencyMs} ms
          </div>
          <div className="text-[10px] text-stone-500">
            {isKm ? 'លឿនភ្លាមៗ (<20ms Local)' : 'Instant local execution'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'អត្រា LRU Cache' : 'Cache Hit Rate'}</span>
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {cacheHitRate}%
          </div>
          <div className="text-[10px] text-sky-600 font-semibold">
            {telemetry.cacheHits} {isKm ? 'ដងពី Cache' : 'cached hits'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'អ្នកប្រើប្រាស់សកម្ម' : 'Active AI Users'}</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.activeUserIds.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-500">
            {isKm ? 'គាំទ្រដល់ 10,000+ នាក់' : '10,000+ ready'}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{isKm ? 'ទប់ស្កាត់ / បរាជ័យ' : 'Blocked / Errors'}</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.blockedRequests + telemetry.failedRequests}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold">
            {telemetry.blockedRequests} {isKm ? 'ទប់ស្កាត់សិទ្ធិ' : 'permission/rate blocks'}
          </div>
        </div>
      </div>

      {/* MCP Tools Usage Breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-white font-khmer">
              {isKm
                ? 'មុខងារ AI Agent ទាំង ១០ (MCP Tool Registry & Role Permissions)'
                : 'MCP AI Agent Tool Usage & Role Security'}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            {AI_AGENT_MCP_TOOL_CATALOG.length} {isKm ? 'មុខងារសកម្ម' : 'Active Tools'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {AI_AGENT_MCP_TOOL_CATALOG.map((tool) => {
            const count = telemetry.toolCounts[tool.name] || 0;
            const pct = telemetry.totalRequests > 0 ? Math.min(100, Math.round((count / telemetry.totalRequests) * 100)) : 0;
            return (
              <div
                key={tool.name}
                className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700/80 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                      {isKm ? tool.titleKh : tool.titleEn}
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 truncate">{tool.name}()</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        tool.minRole === 'shop_owner'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      }`}
                    >
                      {tool.minRole === 'shop_owner'
                        ? isKm
                          ? 'ម្ចាស់ហាង + បញ្ជាក់មុនរក្សាទុក'
                          : 'Owner + Confirm'
                        : isKm
                        ? 'អ្នកប្រើទូទៅ'
                        : 'All Users'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-white text-[11px] font-black">
                      {count}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Searched Foods & Shops/Hotels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-600" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-white font-khmer">
              {isKm ? 'មុខម្ហូបដែលគេសួរ AI ច្រើនបំផុត' : 'Most Searched Dishes via AI'}
            </h4>
          </div>
          {topFoods.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">
              {isKm ? 'មិនទាន់មានទិន្នន័យស្វែងរកម្ហូបនៅឡើយទេ។' : 'No dish queries recorded yet.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {topFoods.map(([name, cnt], idx) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
                >
                  <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                    #{idx + 1} {name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-[10px] font-black shrink-0">
                    {cnt} {isKm ? 'ដង' : 'queries'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-white font-khmer">
              {isKm ? 'ហាង និងសណ្ឋាគារដែល AI ណែនាំច្រើនបំផុត' : 'Most Recommended Shops & Hotels'}
            </h4>
          </div>
          {topShops.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">
              {isKm ? 'មិនទាន់មានទិន្នន័យស្វែងរកហាង/សណ្ឋាគារនៅឡើយទេ។' : 'No shop or hotel queries recorded yet.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {topShops.map(([name, cnt], idx) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
                >
                  <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                    #{idx + 1} {name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 text-[10px] font-black shrink-0">
                    {cnt} {isKm ? 'ដង' : 'hits'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit & Security Log Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-white font-khmer">
              {isKm ? 'កំណត់ហេតុសកម្មភាព និងសុវត្ថិភាព AI ថ្មីៗ (Audit & Error Logs)' : 'Recent AI Agent Action & Security Logs'}
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            {telemetry.recentAuditLogs.length} {isKm ? 'កំណត់ហេតុចុងក្រោយ' : 'recent events'}
          </span>
        </div>

        {telemetry.recentAuditLogs.length === 0 ? (
          <p className="text-xs text-stone-500 py-3">
            {isKm
              ? 'សាកល្បងសួរ AI នៅក្នុងផ្ទាំង «ញ៉ាំអីថ្ងៃនេះ / AI Assistant» ដើម្បីមើលកំណត់ហេតុផ្ទាល់នៅទីនេះ។'
              : 'Try asking the AI Assistant a question to see live tool execution logs here.'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {telemetry.recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/70 dark:border-stone-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-[#064E3B] dark:text-emerald-300">
                      {log.toolName}()
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-[10px] font-bold">
                      {log.userRole}
                    </span>
                    <span className="text-[10px] text-stone-500">{log.userName}</span>
                    {log.fromCache && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 text-[9px] font-extrabold">
                        CACHE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-700 dark:text-stone-300 truncate">
                    “{log.queryPreview}”
                  </div>
                  {log.note && <div className="text-[10px] text-amber-700 dark:text-amber-300">{log.note}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-stone-500">{log.latencyMs}ms</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      log.status === 'ok'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : log.status === 'confirm_required'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                    }`}
                  >
                    {log.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
