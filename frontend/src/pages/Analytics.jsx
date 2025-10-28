import { useState, useEffect } from 'react'
import { clientsAPI } from '../services/api'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6months')
  const [analytics, setAnalytics] = useState({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    archivedClients: 0,
    growthRate: 0,
    avgClientsPerMonth: 0,
    statusDistribution: [],
    monthlyTrend: [],
    acquisitionByMonth: [],
    stateDistribution: []
  })

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await clientsAPI.getAll()
      const allClients = response.data.clients
      
      setClients(allClients)
      calculateAnalytics(allClients)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (clientsData) => {
    const total = clientsData.length
    const active = clientsData.filter(c => c.status === 'active').length
    const inactive = clientsData.filter(c => c.status === 'inactive').length
    const archived = clientsData.filter(c => c.status === 'archived').length

    // Status distribution for pie chart
    const statusDist = [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#f59e0b' },
      { name: 'Archived', value: archived, color: '#6b7280' }
    ]

    // Calculate time-based data
    const monthsToShow = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12
    const monthlyData = {}
    const stateData = {}
    
    // Initialize months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = { new: 0, cumulative: 0 }
    }

    // Process clients
    clientsData.forEach(client => {
      if (client.created_at) {
        const date = new Date(client.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey].new++
        }
      }

      // State distribution
      if (client.state) {
        stateData[client.state] = (stateData[client.state] || 0) + 1
      }
    })

    // Calculate cumulative and format
    let cumulative = 0
    const monthlyTrendData = Object.keys(monthlyData).sort().map(month => {
      cumulative += monthlyData[month].new
      const [year, monthNum] = month.split('-')
      const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })
      
      return {
        month: monthName,
        new: monthlyData[month].new,
        total: cumulative
      }
    })

    const acquisitionData = Object.keys(monthlyData).sort().map(month => {
      const [year, monthNum] = month.split('-')
      const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })
      return {
        month: monthName,
        clients: monthlyData[month].new
      }
    })

    // Top 10 states
    const stateDistData = Object.entries(stateData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([state, count]) => ({ state, clients: count }))

    // Calculate growth rate
    const firstMonthNew = monthlyTrendData[0]?.new || 0
    const lastMonthNew = monthlyTrendData[monthlyTrendData.length - 1]?.new || 0
    const growthRate = firstMonthNew > 0 
      ? ((lastMonthNew - firstMonthNew) / firstMonthNew * 100).toFixed(1)
      : 0

    const avgPerMonth = (total / monthsToShow).toFixed(1)

    setAnalytics({
      totalClients: total,
      activeClients: active,
      inactiveClients: inactive,
      archivedClients: archived,
      growthRate,
      avgClientsPerMonth: avgPerMonth,
      statusDistribution: statusDist,
      monthlyTrend: monthlyTrendData,
      acquisitionByMonth: acquisitionData,
      stateDistribution: stateDistData
    })
  }

  const exportReport = () => {
    const csvContent = [
      ['Analytics Report', new Date().toLocaleDateString()],
      [],
      ['Metric', 'Value'],
      ['Total Clients', analytics.totalClients],
      ['Active Clients', analytics.activeClients],
      ['Inactive Clients', analytics.inactiveClients],
      ['Archived Clients', analytics.archivedClients],
      ['Growth Rate', `${analytics.growthRate}%`],
      ['Avg Clients/Month', analytics.avgClientsPerMonth],
      [],
      ['Monthly Trend'],
      ['Month', 'New Clients', 'Total Clients'],
      ...analytics.monthlyTrend.map(m => [m.month, m.new, m.total])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${Date.now()}.csv`
    a.click()
    toast.success('Report exported successfully!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Analytics & Reports
            </h1>
            <p className="text-gray-600">Comprehensive insights into your client database</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
            </select>
            <button
              onClick={exportReport}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm uppercase tracking-wide mb-1">Total Clients</p>
            <p className="text-4xl font-bold">{analytics.totalClients}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-sm uppercase tracking-wide mb-1">Growth Rate</p>
            <p className="text-4xl font-bold">{analytics.growthRate}%</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm uppercase tracking-wide mb-1">Avg/Month</p>
            <p className="text-4xl font-bold">{analytics.avgClientsPerMonth}</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm uppercase tracking-wide mb-1">Active Clients</p>
            <p className="text-4xl font-bold">{analytics.activeClients}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Client Growth Area Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Client Growth Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.monthlyTrend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  name="Total Clients"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* New Clients Acquisition Bar Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              New Client Acquisition
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.acquisitionByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clients" fill="#3b82f6" name="New Clients" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* State Distribution Bar Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              Top 10 States
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.stateDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="state" type="category" width={50} />
                <Tooltip />
                <Legend />
                <Bar dataKey="clients" fill="#10b981" name="Clients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Monthly Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">New Clients</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Clients</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Growth</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthlyTrend.map((month, index) => {
                  const prevMonth = index > 0 ? analytics.monthlyTrend[index - 1] : null
                  const growth = prevMonth && prevMonth.total > 0
                    ? (((month.total - prevMonth.total) / prevMonth.total) * 100).toFixed(1)
                    : '0'
                  
                  return (
                    <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{month.month}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                          +{month.new}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{month.total}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          parseFloat(growth) > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {parseFloat(growth) > 0 ? '+' : ''}{growth}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
