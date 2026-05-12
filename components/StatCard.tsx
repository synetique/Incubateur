import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  colorClass: string;
  bgClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, colorClass, bgClass }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-start justify-between transition-transform hover:-translate-y-1 duration-200">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        {trend && <p className="text-xs mt-2 text-gray-400">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );
};

export default StatCard;