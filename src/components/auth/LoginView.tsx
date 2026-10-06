import React from 'react';
import { useApp } from '../../context/AppContext';
import { Layers, ShieldCheck, Factory, LogIn } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, login } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Left Branding Panel */}
        <div className="bg-slate-900 p-10 h-full flex flex-col justify-between hidden md:flex relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,0 L100,100 M100,0 L0,100" stroke="white" strokeWidth="1" fill="none" />
              <path d="M50,0 L50,100 M0,50 L100,50" stroke="white" strokeWidth="1" fill="none" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Apex MRP</h1>
                <p className="text-slate-400 text-sm font-medium tracking-wide">Enterprise Manufacturing Planning</p>
              </div>
            </div>

            <div className="space-y-6 mt-16 text-slate-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                  <Factory className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Production Tracking</h3>
                  <p className="text-sm leading-relaxed">End-to-end component traceability with live manufacturing defect logs.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">AQL Quality Control</h3>
                  <p className="text-sm leading-relaxed">Integrated ISO-compliant inbound shipment inspections.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 text-xs text-slate-500 font-medium">
            &copy; 2026 Apex Manufacturing Technologies. All rights reserved.
          </div>
        </div>

        {/* Right Login Panel */}
        <div className="p-5 sm:p-8 md:p-12 h-full flex flex-col justify-center relative">
          
          <div className="md:hidden flex items-center gap-2 mb-6">
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Apex MRP</h1>
          </div>

          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Welcome Back</h2>
            <p className="text-slate-500 text-xs sm:text-sm">Select your role to access the workspace.</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => login(user.id)}
                className="w-full flex items-center p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 bg-white transition-all group text-left relative overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 mr-4 ${user.avatarColor}`}>
                  <span className="font-bold text-lg">{user.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {user.name.split(' (')[0]}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                    {user.roles[0]}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <LogIn className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10 text-center text-xs text-slate-400">
            Secure login required. Contact your systems administrator for access issues.
          </div>
        </div>
      </div>
    </div>
  );
};
