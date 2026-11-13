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
import { tr } from '../../utils/i18n';

export const AdminAiAgentMonitorPanel: React.FC = () => {
  const { language, showToast } = useApp();
  const isKm = language === 'km';
  const [telemetry, setTelemetry] = useState<AiAgentTelemetrySnapshot>(() => loadAiAgentTelemetry());

  const handleRefresh = () => {
    setTelemetry(loadAiAgentTelemetry());
    showToast(
      tr(language, 'បានផ្ទុកទិន្នន័យតាមដាន AI Agent ថ្មីបំផុត!', 'Refreshed AI Agent telemetry!', '已刷新 AI Agent 遥测数据！'),
      'success'
    );
  };

  const handleReset = () => {
    if (
      !window.confirm(
        tr(language, 'តើអ្នកពិតជាចង់សម្អាតស្ថិតិតាមដាន AI Agent ឱ្យទៅជា 0 មែនទេ? (មិនប៉ះពាល់ដល់ទិន្នន័យហាង ម្ហូប ឬអ្នកប្រើប្រាស់ឡើយ)', 'Reset AI Agent monitoring counters to zero? (User, shop, and food data are never affected)', '将 AI Agent 监控计数器重置为零？（用户、店铺和美食数据不受任何影响）')
      )
    ) {
      return;
    }
    setTelemetry(resetAiAgentTelemetry());
    showToast(tr(language, 'បានកំណត់ស្ថិតិ AI ឡើងវិញរួចរាល់។', 'AI telemetry reset complete.', 'AI 遥测数据重置完成。'), 'info');
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
                {tr(language, '$0.00 ឥតគិតថ្លៃជារៀងរហូត • Hybrid MCP AI Agent Active', '$0.00 Forever Mode • Hybrid MCP AI Agent Active', '$0.00 永久免费模式 • 混合 MCP AI Agent 运行中')}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold font-khmer">
              {tr(language, 'ផ្ទាំងគ្រប់គ្រង និងតាមដានប្រព័ន្ធ AI Agent (Cambodia Flavors & Tourism)', 'Cambodia Flavors & Tourism — AI Agent Monitoring Dashboard', '柬埔寨风味与旅游 — AI Agent 监控仪表板')}
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {tr(language, 'ដំណើរការដោយ Local Smart MCP Engine ($0/ខែ) + LRU Cache + Rate Limit (25 សំណើ/នាទី) + ការត្រួតពិនិត្យសិទ្ធិ ៣ កម្រិត (Normal User / Shop Owner / Admin) គាំទ្រអ្នកប្រើប្រាស់ 10,000+ នាក់។', 'Powered by Local Smart MCP Engine ($0/mo) + LRU Cache + Rate Limiter (25 req/min) + 3-Tier Role Security supporting 10,000+ users.', '由本地智能 MCP 引擎 ($0/月) + LRU 缓存 + 速率限制器 (25 次请求/分钟) + 3 层角色安全架构驱动，支持 10,000+ 用户。')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{tr(language, 'ផ្ទុកឡើងវិញ', 'Refresh', '刷新')}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-red-500/25 hover:bg-red-500/40 border border-red-300/30 text-red-100 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{tr(language, 'សម្អាតស្ថិតិ', 'Reset', '重置')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'សំណើ AI សរុប', 'Total AI Requests', 'AI 请求总数')}</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.totalRequests.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            {tr(language, 'រាប់ទាំងអស់ក្នុងប្រព័ន្ធ', 'All MCP + Food turns', '所有 MCP 与美食交互轮次')}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'ចំណាយប៉ាន់ស្មាន', 'Est. API Cost', '预估 API 费用')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
            ${telemetry.estimatedTotalCostUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
            {tr(language, 'ឥតគិតថ្លៃ 100% ($0 Mode)', '100% Free ($0 Mode)', '100% 免费 ($0 模式)')}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'ល្បឿនឆ្លើយតបមធ្យម', 'Avg Response', '平均响应时间')}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {avgLatencyMs} ms
          </div>
          <div className="text-[10px] text-stone-500">
            {tr(language, 'លឿនភ្លាមៗ (<20ms Local)', 'Instant local execution', '本地即时执行')}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'អត្រា LRU Cache', 'Cache Hit Rate', '缓存命中率')}</span>
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {cacheHitRate}%
          </div>
          <div className="text-[10px] text-sky-600 font-semibold">
            {telemetry.cacheHits} {tr(language, 'ដងពី Cache', 'cached hits', '次缓存命中')}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'អ្នកប្រើប្រាស់សកម្ម', 'Active AI Users', '活跃 AI 用户')}</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.activeUserIds.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-500">
            {tr(language, 'គាំទ្រដល់ 10,000+ នាក់', '10,000+ ready', '支持 10,000+ 用户')}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold">
            <span>{tr(language, 'ទប់ស្កាត់ / បរាជ័យ', 'Blocked / Errors', '已拦截 / 错误')}</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-white">
            {telemetry.blockedRequests + telemetry.failedRequests}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold">
            {telemetry.blockedRequests} {tr(language, 'ទប់ស្កាត់សិទ្ធិ', 'permission/rate blocks', '次权限/速率拦截')}
          </div>
        </div>
      </div>

      {/* MCP Tools Usage Breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-white font-khmer">
              {tr(language, 'មុខងារ AI Agent ទាំង ១០ (MCP Tool Registry & Role Permissions)', 'MCP AI Agent Tool Usage & Role Security', 'MCP AI Agent 工具使用与角色安全')}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            {AI_AGENT_MCP_TOOL_CATALOG.length} {tr(language, 'មុខងារសកម្ម', 'Active Tools', '活跃工具')}
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
                        ? tr(language, 'ម្ចាស់ហាង + បញ្ជាក់មុនរក្សាទុក', 'Owner + Confirm', '店主 + 确认')
                        : tr(language, 'អ្នកប្រើទូទៅ', 'All Users', '所有用户')}
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
              {tr(language, 'មុខម្ហូបដែលគេសួរ AI ច្រើនបំផុត', 'Most Searched Dishes via AI', 'AI 搜索最多的菜品')}
            </h4>
          </div>
          {topFoods.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">
              {tr(language, 'មិនទាន់មានទិន្នន័យស្វែងរកម្ហូបនៅឡើយទេ។', 'No dish queries recorded yet.', '暂无菜品查询记录。')}
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
                    {cnt} {tr(language, 'ដង', 'queries', '次查询')}
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
              {tr(language, 'ហាង និងសណ្ឋាគារដែល AI ណែនាំច្រើនបំផុត', 'Most Recommended Shops & Hotels', 'AI 推荐最多的店铺与酒店')}
            </h4>
          </div>
          {topShops.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">
              {tr(language, 'មិនទាន់មានទិន្នន័យស្វែងរកហាង/សណ្ឋាគារនៅឡើយទេ។', 'No shop or hotel queries recorded yet.', '暂无店铺或酒店查询记录。')}
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
                    {cnt} {tr(language, 'ដង', 'hits', '次推荐')}
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
              {tr(language, 'កំណត់ហេតុសកម្មភាព និងសុវត្ថិភាព AI ថ្មីៗ (Audit & Error Logs)', 'Recent AI Agent Action & Security Logs', '近期 AI Agent 操作与安全日志')}
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            {telemetry.recentAuditLogs.length} {tr(language, 'កំណត់ហេតុចុងក្រោយ', 'recent events', '条近期事件')}
          </span>
        </div>

        {telemetry.recentAuditLogs.length === 0 ? (
          <p className="text-xs text-stone-500 py-3">
            {tr(language, 'សាកល្បងសួរ AI នៅក្នុងផ្ទាំង «ញ៉ាំអីថ្ងៃនេះ / AI Assistant» ដើម្បីមើលកំណត់ហេតុផ្ទាល់នៅទីនេះ។', 'Try asking the AI Assistant a question to see live tool execution logs here.', '尝试向 AI 助手提问，即可在此查看实时工具执行日志。')}
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
