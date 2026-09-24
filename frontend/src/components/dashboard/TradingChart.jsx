import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const data = [
    { name: 'Jan', value: 120000 },
    { name: 'Feb', value: 125000 },
    { name: 'Mar', value: 122000 },
    { name: 'Apr', value: 130000 },
    { name: 'May', value: 135000 },
    { name: 'Jun', value: 142000 },
    { name: 'Jul', value: 140000 },
    { name: 'Aug', value: 155000 },
    { name: 'Sep', value: 165000 },
    { name: 'Oct', value: 162000 },
    { name: 'Nov', value: 175000 },
    { name: 'Dec', value: 182450 },
];

export default function TradingChart() {
    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        tickFormatter={(value) => `₹${(value / 1000)}k`}
                        dx={-10}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'var(--card-bg)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '8px', 
                            boxShadow: 'var(--shadow-sm)' 
                        }}
                        itemStyle={{ color: '#10b981', fontWeight: 600 }}
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Portfolio Value']}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
