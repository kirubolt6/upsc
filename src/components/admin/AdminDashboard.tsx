import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../ui/Layout';
import { BookOpen, Users, FileText, BarChart3 } from 'lucide-react';

interface DashboardStats {
  totalSubjects: number;
  totalModules: number;
  totalSections: number;
  totalStudents: number;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubjects: 0,
    totalModules: 0,
    totalSections: 0,
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch subjects count
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch modules count
      const { count: modulesCount } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch sections count
      const { count: sectionsCount } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });

      // Fetch students count
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      setStats({
        totalSubjects: subjectsCount || 0,
        totalModules: modulesCount || 0,
        totalSections: sectionsCount || 0,
        totalStudents: studentsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Admin Dashboard
          </h1>
          <p className="text-blue-100">
            Welcome, {profile?.full_name}! Manage your UPSC content and track student progress.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Modules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalModules}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="text-sm font-medium text-gray-900">Create New Subject</h3>
                <p className="text-xs text-gray-500">Add a new subject to the curriculum</p>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <FileText className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="text-sm font-medium text-gray-900">Add Content</h3>
                <p className="text-xs text-gray-500">Create modules and sections</p>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="text-sm font-medium text-gray-900">View Analytics</h3>
                <p className="text-xs text-gray-500">Track student progress</p>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Create your first subject from the Manage Subjects page</p>
                  <p className="text-xs text-gray-500">Set up the foundational structure for your content</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Add modules to organize your content</p>
                  <p className="text-xs text-gray-500">Break down subjects into manageable learning units</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Create sections with sources, tests, and resources</p>
                  <p className="text-xs text-gray-500">Add detailed content for student learning</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
