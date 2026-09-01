import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  Server,
  Layers,
} from 'lucide-react';
import { CloudEvent } from '../../types';

interface CloudConsoleViewProps {
  events: CloudEvent[];
  isLiveActive: boolean;
  setIsLiveActive: (active: boolean) => void;
  onRefresh: () => void;
}

export const CloudConsoleView: React.FC<CloudConsoleViewProps> = ({
  events,
  isLiveActive,
  setIsLiveActive,
  onRefresh,
}) => {
  const [filterService, setFilterService] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const services = ['all', 'Cognito', 'APIGateway', 'Lambda', 'S3', 'DynamoDB', 'Sharp', 'CloudFront'];

  const filteredEvents = events.filter((e) => {
    if (filterService !== 'all' && e.service !== filterService) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        (e.requestId && e.requestId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getServiceBadgeColor = (service: CloudEvent['service']) => {
    switch (service) {
      case 'Cognito':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'APIGateway':
        return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'Lambda':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'S3':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'DynamoDB':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'Sharp':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'CloudFront':
        return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Stream Controls */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">AWS Cloud Architecture Live Stream</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time event traces from Cognito, API Gateway, Lambda, S3, DynamoDB, Sharp & CloudFront CDN.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLiveActive
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isLiveActive ? 'Live Polling: ON' : 'Paused'}</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Service Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {services.map((svc) => (
            <button
              key={svc}
              onClick={() => setFilterService(svc)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterService === svc
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {svc === 'all' ? 'All Services' : svc}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs or Request ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Events Table / Stream */}
      <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-mono">
              No matching cloud telemetry events found.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-xs"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  {/* Status Indicator */}
                  <div className="mt-0.5 flex-shrink-0">
                    {evt.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : evt.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getServiceBadgeColor(
                          evt.service
                        )}`}
                      >
                        {evt.service}
                      </span>
                      <span className="font-semibold text-slate-900">{evt.action}</span>
                    </div>
                    <p className="text-slate-600 font-sans text-xs leading-relaxed break-all">
                      {evt.details}
                    </p>
                  </div>
                </div>

                {/* Meta right */}
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 sm:text-right flex-shrink-0 pl-7 sm:pl-0">
                  {evt.latencyMs && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {evt.latencyMs}ms
                    </span>
                  )}
                  {evt.requestId && (
                    <span className="text-slate-400 hidden lg:inline">{evt.requestId}</span>
                  )}
                  <span className="text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
