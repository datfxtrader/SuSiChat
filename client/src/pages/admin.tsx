
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { WhitelistManager } from '@/components/admin/WhitelistManager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Admin: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user?.is_admin) {
    return (
      <MainLayout title="Access Denied" subtitle="Admin access required">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Admin Panel"
      subtitle="Manage chatbot access and content"
      headerRight={
        <div className="flex items-center space-x-3">
          <Settings className="h-5 w-5 text-neutral-500" />
        </div>
      }
    >
      <div className="space-y-6 p-6">
        {/* Admin Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Users className="w-5 h-5" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">24</div>
              <p className="text-sm text-gray-400">Users in whitelist</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">High</div>
              <p className="text-sm text-gray-400">Whitelist protection</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Settings className="w-5 h-5" />
                System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">Online</div>
              <p className="text-sm text-gray-400">All services running</p>
            </CardContent>
          </Card>
        </div>

        {/* Whitelist Management */}
        <WhitelistManager />

        {/* Additional Admin Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-100">System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>New user registered</span>
                  <span className="text-gray-500">2 min ago</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Whitelist updated</span>
                  <span className="text-gray-500">5 min ago</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Chat session started</span>
                  <span className="text-gray-500">8 min ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
                  Backup User Data
                </button>
                <button className="w-full p-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm">
                  Export Chat Logs
                </button>
                <button className="w-full p-2 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm">
                  Clear System Cache
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Admin;
