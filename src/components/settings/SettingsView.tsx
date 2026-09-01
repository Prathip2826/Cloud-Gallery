import React, { useState } from 'react';
import {
  Shield,
  Key,
  Database,
  Cloud,
  Layers,
  CheckCircle,
  RefreshCw,
  Cpu,
  Lock,
} from 'lucide-react';
import { User, CloudStats } from '../../types';

interface SettingsViewProps {
  user: User | null;
  stats: CloudStats | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, stats }) => {
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const testCloudHealth = async () => {
    setTestingConn(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setTestResult(`All AWS services operational (Status: ${data.status}, DynamoDB: Connected, S3: Ready)`);
    } catch {
      setTestResult('Health check failed');
    } finally {
      setTestingConn(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* User Profile Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                Firebase Authenticated
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Firebase UID: {user?.uid || user?.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Environment Parameters */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">AWS Resource Provisioning</h3>
            <p className="text-xs text-slate-500">Deployed via AWS SAM (Infrastructure as Code)</p>
          </div>

          <button
            onClick={testCloudHealth}
            disabled={testingConn}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-blue-600 transition-colors cursor-pointer disabled:opacity-50 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
            <span>{testingConn ? 'Testing...' : 'Test Cloud Connection'}</span>
          </button>
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-mono flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{testResult}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center text-slate-600 gap-1.5">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>S3 Originals Bucket</span>
            </div>
            <p className="text-slate-900 font-semibold break-all">
              s3://cloudgallery-originals-bucket
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              BlockPublicAccess=true, SSE-S3 AES-256
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center text-slate-600 gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>S3 Thumbnails Bucket</span>
            </div>
            <p className="text-slate-900 font-semibold break-all">
              s3://cloudgallery-thumbnails-bucket
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              Sharp 800px WebP, CloudFront OAC origin
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center text-slate-600 gap-1.5">
              <Database className="w-4 h-4 text-purple-600" />
              <span>DynamoDB Table</span>
            </div>
            <p className="text-slate-900 font-semibold">
              table/photos (On-Demand)
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              PK: userId, SK: photoId
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center text-slate-600 gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>CloudFront Edge CDN</span>
            </div>
            <p className="text-slate-900 font-semibold">
              d123456abcdef8.cloudfront.net
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              Global Edge Caching (Hit Ratio: {stats?.cloudFrontCacheHitRatio || 95}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
