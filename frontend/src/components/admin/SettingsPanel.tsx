/**
 * Settings Panel Component
 * Admin platform settings and configuration (Dummy/Placeholder UI)
 */
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Bell,
  Shield,
  Server,
  Save,
  RefreshCw,
  Database,
  Zap,
  Lock,
  Mail,
  Clock,
  AlertCircle,
} from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useToast } from '../../contexts/ToastContext'

const SettingsPanel: React.FC = () => {
  const { success, info } = useToast()

  // Platform Settings
  const [siteName, setSiteName] = useState('EDULEARN Platform')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [defaultUserRole, setDefaultUserRole] = useState('student')
  const [maxStudentsPerBatch, setMaxStudentsPerBatch] = useState(50)
  const [maxAssessmentsPerTeacher, setMaxAssessmentsPerTeacher] = useState(100)

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [assessmentReminders, setAssessmentReminders] = useState(true)
  const [systemAlerts, setSystemAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)

  // System Configuration
  const [cacheSettings, setCacheSettings] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const [logLevel, setLogLevel] = useState('info')

  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [passwordComplexity, setPasswordComplexity] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [ipWhitelist, setIpWhitelist] = useState(false)

  const handleSaveSettings = () => {
    success('Settings Saved', 'Your changes have been saved successfully (Demo only)')
  }

  const handleResetSettings = () => {
    info('Settings Reset', 'All settings have been reset to defaults (Demo only)')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Settings</h2>
          <p className="text-muted-foreground mt-1">Configure platform preferences and system settings</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleResetSettings} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSaveSettings} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3"
      >
        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
        <div>
          <h3 className="font-semibold text-foreground">Demo Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These are placeholder settings for demonstration purposes. Changes are not persisted.
          </p>
        </div>
      </motion.div>

      {/* Platform Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Settings className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Platform Settings</h3>
            <p className="text-sm text-muted-foreground">General platform configuration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Site Name</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium text-foreground">Maintenance Mode</div>
                <div className="text-sm text-muted-foreground">Disable public access</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium text-foreground">Registration Enabled</div>
                <div className="text-sm text-muted-foreground">Allow new user signups</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationEnabled}
                  onChange={(e) => setRegistrationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Default User Role</label>
            <select
              value={defaultUserRole}
              onChange={(e) => setDefaultUserRole(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Max Students Per Batch</label>
              <input
                type="number"
                value={maxStudentsPerBatch}
                onChange={(e) => setMaxStudentsPerBatch(Number(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Max Assessments Per Teacher</label>
              <input
                type="number"
                value={maxAssessmentsPerTeacher}
                onChange={(e) => setMaxAssessmentsPerTeacher(Number(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Bell className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground">Configure system notifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <div className="font-medium text-foreground">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Send email alerts</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-400" />
              <div>
                <div className="font-medium text-foreground">Assessment Reminders</div>
                <div className="text-sm text-muted-foreground">Remind students</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={assessmentReminders}
                onChange={(e) => setAssessmentReminders(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="font-medium text-foreground">System Alerts</div>
                <div className="text-sm text-muted-foreground">Critical notifications</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemAlerts}
                onChange={(e) => setSystemAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="font-medium text-foreground">Weekly Reports</div>
                <div className="text-sm text-muted-foreground">Send weekly summaries</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={weeklyReports}
                onChange={(e) => setWeeklyReports(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* System Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Server className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">System Configuration</h3>
            <p className="text-sm text-muted-foreground">Technical system settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-foreground">Database Status</span>
              </div>
              <div className="text-lg font-semibold text-green-400">Connected</div>
              <div className="text-xs text-muted-foreground mt-1">MongoDB v7.0.4</div>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-foreground">API Version</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">v1.0.0</div>
              <div className="text-xs text-muted-foreground mt-1">FastAPI Backend</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium text-foreground">Cache Settings</div>
                <div className="text-sm text-muted-foreground">Enable response caching</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cacheSettings}
                  onChange={(e) => setCacheSettings(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium text-foreground">Debug Mode</div>
                <div className="text-sm text-muted-foreground">Enable debug logging</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Log Level</label>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
            >
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
            <p className="text-sm text-muted-foreground">Platform security configuration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-yellow-400" />
                <div>
                  <div className="font-medium text-foreground">Password Complexity</div>
                  <div className="text-sm text-muted-foreground">Require strong passwords</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={passwordComplexity}
                  onChange={(e) => setPasswordComplexity(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-400" />
                <div>
                  <div className="font-medium text-foreground">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">Enable 2FA for users</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-red-400" />
                <div>
                  <div className="font-medium text-foreground">IP Whitelist</div>
                  <div className="text-sm text-muted-foreground">Restrict admin access by IP</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleResetSettings} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset All
        </Button>
        <Button onClick={handleSaveSettings} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}

export default SettingsPanel

