import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clientsAPI } from '../services/api'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisWeek: 0
  })
  const [chartData, setChartData] = useState({
    statusDistribution: [],
    monthlyGrowth: [],
    clientsByMonth: []
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await clientsAPI.getAll()
      const clients = response.data.clients
      
      const active = clients.filter(c => c.status === 'active').length
      const inactive = clients.filter(c => c.status === 'inactive').length
      const archived = clients.filter(c => c.status === 'archived').length
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const newThisWeek = clients.filter(c => {
        return c.created_at && new Date(c.created_at) > oneWeekAgo
      }).length
      
      setStats({
        total: clients.length,
        active,
        inactive,
        newThisWeek
      })

      // Prepare chart data
      const statusData = [
        { name: 'Active', value: active, color: '#10b981' },
        { name: 'Inactive', value: inactive, color: '#f59e0b' },
        { name: 'Archived', value: archived, color: '#6b7280' }
      ]

      // Monthly growth data (last 6 months)
      const monthlyData = []
      const monthlyClients = {}
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyClients[monthKey] = 0
      }

      clients.forEach(client => {
        if (client.created_at) {
          const date = new Date(client.created_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (monthlyClients[monthKey] !== undefined) {
            monthlyClients[monthKey]++
          }
        }
      })

      let cumulative = 0
      Object.keys(monthlyClients).sort().forEach(month => {
        cumulative += monthlyClients[month]
        const [year, monthNum] = month.split('-')
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })
        monthlyData.push({
          month: monthName,
          clients: cumulative,
          new: monthlyClients[month]
        })
      })

      setChartData({
        statusDistribution: statusData,
        monthlyGrowth: monthlyData,
        clientsByMonth: monthlyData
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const COLORS = ['#10b981', '#f59e0b', '#6b7280']

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-gray-600 text-lg">Here's your client overview for today</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="bg-white bg-opacity-20 rounded-xl p-3 w-fit mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm uppercase tracking-wide mb-2">Total Clients</p>
            <p className="text-5xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="bg-white bg-opacity-20 rounded-xl p-3 w-fit mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm uppercase tracking-wide mb-2">Active Clients</p>
            <p className="text-5xl font-bold">{stats.active}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="bg-white bg-opacity-20 rounded-xl p-3 w-fit mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm uppercase tracking-wide mb-2">New This Week</p>
            <p className="text-5xl font-bold">{stats.newThisWeek}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="bg-white bg-opacity-20 rounded-xl p-3 w-fit mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-sm uppercase tracking-wide mb-2">Inactive</p>
            <p className="text-5xl font-bold">{stats.inactive}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">Client Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Growth Line Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">Client Growth Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="clients" stroke="#8b5cf6" strokeWidth={2} name="Total Clients" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Bar Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:col-span-2">
            <h3 className="text-xl font-bold mb-4">New Clients by Month</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.clientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new" fill="#3b82f6" name="New Clients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/clients" className="group bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 w-fit mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Manage Clients</h3>
            <p className="text-gray-600 mb-4">View and manage all client records</p>
            <div className="flex items-center text-blue-600 font-semibold">
              View Clients →
            </div>
          </Link>

          <Link to="/analytics" className="group bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 w-fit mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-gray-600 mb-4">View detailed reports and insights</p>
            <div className="flex items-center text-green-600 font-semibold">
              View Reports →
            </div>
          </Link>

          <Link to="/users" className="group bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 w-fit mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">User Management</h3>
            <p className="text-gray-600 mb-4">Manage system users and access</p>
            <div className="flex items-center text-purple-600 font-semibold">
              Manage Users →
            </div>
          </Link>

          <Link to="/settings" className="group bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-3 w-fit mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Settings</h3>
            <p className="text-gray-600 mb-4">Configure system preferences</p>
            <div className="flex items-center text-pink-600 font-semibold">
              Configure →
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
