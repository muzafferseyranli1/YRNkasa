import React from 'react';
import { Calculator, Bike, Coins, Calendar, FileText } from 'lucide-react';

export default function NavigationBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'entry', label: 'Kasa Girişi', icon: Calculator, badge: null },
    { id: 'courier_report', label: 'Kurye Raporu', icon: Bike, badge: null },
    { id: 'tip_report', label: 'Bahşiş Raporu', icon: Coins, badge: null },
    { id: 'archive', label: 'Geçmiş Arşiv', icon: Calendar, badge: null },
  ];

  return (
    <>
      {/* Desktop / Tablet Header Nav Tabs */}
      <nav className="bg-white border-b border-slate-200 px-4 md:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex space-x-1 sm:space-x-4 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around shadow-lg print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
