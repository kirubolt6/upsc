import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Layout } from '../ui/Layout';
import { Plus, Edit2, Trash2, ArrowLeft, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
  order_index: number;
}

interface Section {
  id: string;
  name: string;
  type: string;
}

export function QuestionManagement() {
  const { subjectId, moduleId, sectionId } = useParams();
  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: ''
  });

  useEffect(() => {
    if (sectionId) {
      fetchData();
    }
  }, [sectionId]);

  const fetchData = async () => {
    try {
      // Fetch section details
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (sectionError) throw sectionError;
      setSection(sectionData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', sectionId)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question_text.trim() || !formData.option_a.trim() || 
        !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim()) {
      toast.error('All question fields are required');
      return;
    }

    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: formData.question_text,
            option_a: formData.option_a,
            option_b: formData.option_b,
            option_c: formData.option_c,
            option_d: formData.option_d,
            correct_answer: formData.correct_answer,
            explanation: formData.explanation || null
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Question updated successfully');
      } else {
        // Create new question
        const maxOrder = Math.max(...questions.map(q => q.order_index), -1);
        const { error } = await supabase
          .from('questions')
          .insert({
            section_id: sectionId,
            question_text: formData.question_text,
            option_a: formData.option_a,
            option_b: formData.option_b,
            option_c: formData.option_c,
            option_d: formData.option_d,
            correct_answer: formData.correct_answer,
            explanation: formData.explanation || null,
            order_index: maxOrder + 1
          });

        if (error) throw error;
        toast.success('Question created successfully');
      }

      setShowModal(false);
      setEditingQuestion(null);
      setFormData({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        explanation: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      explanation: question.explanation || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingQuestion(null);
    setFormData({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      explanation: ''
    });
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

  if (!section) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Section not found</h3>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to={`/admin/subjects/${subjectId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Questions</h1>
              <p className="text-gray-600">Section: {section.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No questions yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first question.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </button>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}.</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        question.correct_answer === 'A' ? 'bg-blue-100 text-blue-800' :
                        question.correct_answer === 'B' ? 'bg-green-100 text-green-800' :
                        question.correct_answer === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        Correct: {question.correct_answer}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {question.question_text}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">A. </span>
                        <span className="text-gray-900">{question.option_a}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">B. </span>
                        <span className="text-gray-900">{question.option_b}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">C. </span>
                        <span className="text-gray-900">{question.option_c}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">D. </span>
                        <span className="text-gray-900">{question.option_d}</span>
                      </div>
                    </div>
                    
                    {question.explanation && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-blue-900">Explanation: </span>
                        <span className="text-blue-800">{question.explanation}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Question Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="question-text" className="block text-sm font-medium text-gray-700">
                    Question Text *
                  </label>
                  <textarea
                    id="question-text"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter the question"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="option-a" className="block text-sm font-medium text-gray-700">
                      Option A *
                    </label>
                    <input
                      type="text"
                      id="option-a"
                      value={formData.option_a}
                      onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Option A"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="option-b" className="block text-sm font-medium text-gray-700">
                      Option B *
                    </label>
                    <input
                      type="text"
                      id="option-b"
                      value={formData.option_b}
                      onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Option B"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="option-c" className="block text-sm font-medium text-gray-700">
                      Option C *
                    </label>
                    <input
                      type="text"
                      id="option-c"
                      value={formData.option_c}
                      onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Option C"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="option-d" className="block text-sm font-medium text-gray-700">
                      Option D *
                    </label>
                    <input
                      type="text"
                      id="option-d"
                      value={formData.option_d}
                      onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Option D"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="correct-answer" className="block text-sm font-medium text-gray-700">
                    Correct Answer *
                  </label>
                  <select
                    id="correct-answer"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">
                    Explanation (Optional)
                  </label>
                  <textarea
                    id="explanation"
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain why this is the correct answer"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {editingQuestion ? 'Update' : 'Create'} Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
