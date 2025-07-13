import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../ui/Layout';
import { BookOpen, Clock, Target, TrendingUp, Calendar, Flame } from 'lucide-react';

interface SubjectProgress {
  id: string;
  name: string;
  total_sections: number;
  completed_sections: number;
  progress_percentage: number;
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [studyStreak, setStudyStreak] = useState(12);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      // Fetch subjects with progress
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          modules(
            id,
            sections(id)
          )
        `)
        .eq('is_active', true)
        .order('order_index');

      if (subjectsError) throw subjectsError;

      // Fetch user progress
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', profile?.id);

      if (progressError) throw progressError;

      // Calculate progress for each subject
      const progressData: SubjectProgress[] = subjects?.map(subject => {
        const totalSections = subject.modules?.reduce((total, module) => 
          total + (module.sections?.length || 0), 0) || 0;
        
        const userSubjectProgress = userProgress?.find(p => p.subject_id === subject.id);
        const completedSections = userSubjectProgress?.completed_sections || 0;
        const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

        return {
          id: subject.id,
          name: subject.name,
          total_sections: totalSections,
          completed_sections: completedSections,
          progress_percentage: progressPercentage
        };
      }) || [];

      setSubjectProgress(progressData);
      generateMotivationalMessage(progressData);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMotivationalMessage = (progress: SubjectProgress[]) => {
    if (progress.length === 0) {
      setMotivationalMessage("This speed can't help you reach your goal - you have to be faster! 🚀");
      return;
    }

    const overallProgress = progress.reduce((sum, subject) => sum + subject.progress_percentage, 0) / progress.length;
    
    if (overallProgress < 25) {
      setMotivationalMessage("This speed can't help you reach your goal - you have to be faster! 🚀");
    } else if (overallProgress < 50) {
      setMotivationalMessage("Good start! Keep pushing yourself to maintain momentum 💪");
    } else if (overallProgress < 75) {
      setMotivationalMessage("You're making solid progress! Stay consistent with your efforts 📈");
    } else if (overallProgress < 90) {
      setMotivationalMessage("Almost there! You're perfectly aligned with your goal 🎯");
    } else {
      setMotivationalMessage("Outstanding progress! You're excelling in your UPSC preparation 🌟");
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
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

  const totalSections = subjectProgress.reduce((sum, subject) => sum + subject.total_sections, 0);
  const totalCompleted = subjectProgress.reduce((sum, subject) => sum + subject.completed_sections, 0);
  const overallProgress = totalSections > 0 ? (totalCompleted / totalSections) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header - Matching the design from image */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  Welcome back, Aspirant! 🎯
                </h1>
                <p className="text-blue-100 text-sm">{getCurrentDate()}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-300" />
                  <span className="text-sm font-medium">Study Streak</span>
                </div>
                <div className="text-2xl font-bold">{studyStreak} days</div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-lg font-medium mb-2">{motivationalMessage}</p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>Active Subjects: {subjectProgress.length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>Completed: {totalCompleted}/{totalSections}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{subjectProgress.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{totalCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{totalSections - totalCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">{overallProgress.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Subject Progress</h2>
          </div>
          <div className="p-6">
            {subjectProgress.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">No subjects available</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Contact your admin to add subjects and modules.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectProgress.map((subject) => (
                  <div key={subject.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">{subject.name}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {subject.completed_sections}/{subject.total_sections}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${subject.progress_percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {subject.progress_percentage.toFixed(1)}% complete
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
