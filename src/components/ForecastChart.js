import React, { useState, useEffect } from 'react';
import { calculateMonthlyForecast } from '../utils/storage';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ForecastChart() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [forecastData, setForecastData] = useState([]);
  const [currentMonthForecast, setCurrentMonthForecast] = useState(null);

  useEffect(() => {
    loadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    window.addEventListener('expenseAdded', loadForecast);
    window.addEventListener('subscriptionAdded', loadForecast);
    return () => {
      window.removeEventListener('expenseAdded', loadForecast);
      window.removeEventListener('subscriptionAdded', loadForecast);
    };
  }, [])

  const loadForecast = () => {
    const forecast = calculateMonthlyForecast(selectedYear, selectedMonth);
    setCurrentMonthForecast(forecast);

    // Generate forecast for next 12 months
    const data = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, selectedMonth + i);
      const f = calculateMonthlyForecast(d.getFullYear(), d.getMonth());
      data.push({
        month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        Gastos: f.expenses,
        'Mensalidades': f.subscriptions,
        'Anuidades': f.annual,
        Total: f.total
      });
    }
    setForecastData(data);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1
  ];

  if (!currentMonthForecast) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const pieData = [
    { name: 'Gastos', value: currentMonthForecast.expenses },
    { name: 'Mensalidades', value: currentMonthForecast.subscriptions },
    { name: 'Anuidades', value: currentMonthForecast.annual }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Gastos Variáveis</p>
          <p className="text-3xl font-bold">R$ {currentMonthForecast.expenses.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Mensalidades</p>
          <p className="text-3xl font-bold">R$ {currentMonthForecast.subscriptions.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Anuidades (mês)</p>
          <p className="text-3xl font-bold">R$ {currentMonthForecast.annual.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Total Previsto</p>
          <p className="text-3xl font-bold">R$ {currentMonthForecast.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Previsão - Próximos 12 Meses</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={forecastData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Gastos" fill="#3B82F6" />
              <Bar dataKey="Mensalidades" fill="#10B981" />
              <Bar dataKey="Anuidades" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Distribuição - {months[selectedMonth]} {selectedYear}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Evolução Total - Próximos 12 Meses</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="Total" stroke="#EF4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
