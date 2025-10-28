import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import axios from 'axios'

const API_URL = 'https://client-database-api.ghwmelite.workers.dev'

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [dbStats, setDbStats] = useState(null)
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    language: 'en',
    timezone: 'America/New_York'
  })

  // Load user profile and preferences on mount
  useEffect(() => {
    loadProfile()
    loadPreferences()
    if (user?.role === 'admin') {
      loadDatabaseStats()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/settings/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfileData({
        username: response.data.user.username,
        email: response.data.user.email,
        role: response.data.user.role
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/settings/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPreferences(response.data.preferences)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const loadDatabaseStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/settings/database/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDbStats(response.data.stats)
    } catch (error) {
      console.error('Failed to load database stats:', error)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API_URL}/api/settings/profile`, 
        { username: profileData.username, email: profileData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Profile updated successfully!')
      loadProfile()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API_URL}/api/settings/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API_URL}/api/settings/preferences`,
        preferences,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Preferences updated successfully!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'database', label: 'Database', icon: '🗄️', adminOnly: true }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-4">
              {tabs
                .filter(tab => !tab.adminOnly || user?.role === 'admin')
                .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-2xl">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="text-3xl">👤</span>
                  Profile Information
                </h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={profileData.role}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                      disabled
                    />
                    <p className="text-sm text-gray-500 mt-1">Contact administrator to change role</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="text-3xl">🔒</span>
                  Security Settings
                </h2>
                
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      required
                      minLength="8"
                    />
                    <p className="text-sm text-gray-500 mt-1">Minimum 8 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-blue-900 mb-2">Password Requirements:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Minimum 8 characters</li>
                    <li>• Mix of letters, numbers, and symbols recommended</li>
                    <li>• Avoid common passwords</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="text-3xl">⚙️</span>
                  Preferences
                </h2>
                
                <form onSubmit={handlePreferencesUpdate} className="space-y-8">
                  {/* Notifications */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Notifications</h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-medium text-gray-800">Email Notifications</div>
                          <div className="text-sm text-gray-600">Receive notifications via email</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.emailNotifications}
                          onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                          className="w-5 h-5 text-blue-600"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-medium text-gray-800">SMS Notifications</div>
                          <div className="text-sm text-gray-600">Receive notifications via SMS</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.smsNotifications}
                          onChange={(e) => setPreferences({...preferences, smsNotifications: e.target.checked})}
                          className="w-5 h-5 text-blue-600"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Display */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Display</h3>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-medium text-gray-800">Dark Mode</div>
                        <div className="text-sm text-gray-600">Use dark theme (Coming soon)</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.darkMode}
                        onChange={(e) => setPreferences({...preferences, darkMode: e.target.checked})}
                        className="w-5 h-5 text-blue-600"
                        disabled
                      />
                    </label>
                  </div>

                  {/* Localization */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Localization</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </form>
              </div>
            )}

            {/* Database Tab (Admin Only) */}
            {activeTab === 'database' && user?.role === 'admin' && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="text-3xl">🗄️</span>
                  Database Statistics
                </h2>

                {dbStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                        <div className="text-3xl font-bold mb-2">{dbStats.totalClients}</div>
                        <div className="text-sm opacity-90">Total Clients</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                        <div className="text-3xl font-bold mb-2">{dbStats.totalUsers}</div>
                        <div className="text-sm opacity-90">Total Users</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="text-3xl font-bold mb-2">{dbStats.totalNotes}</div>
                        <div className="text-sm opacity-90">Total Notes</div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                        <div className="text-3xl font-bold mb-2">{dbStats.totalFiles}</div>
                        <div className="text-sm opacity-90">Total Files</div>
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                      <h3 className="font-semibold text-gray-800 mb-4">Database Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Database Type:</span>
                          <span className="font-medium">Cloudflare D1 (SQLite)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Storage Location:</span>
                          <span className="font-medium">Cloudflare Edge Network</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Encryption:</span>
                          <span className="font-medium">AES-256 (SSN Data)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Backup:</span>
                          <span className="font-medium">Automatic Daily Backups</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={loadDatabaseStats}
                      className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Refresh Statistics
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading database statistics...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
