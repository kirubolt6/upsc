import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../ui/Layout';
import { Plus, Edit2, Trash2, BookOpen, GripVertical, ArrowLeft, FileText, Play, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Module {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  sections: Section[];
}

interface Section {
  id: string;
  name: string;
  type: 'source' | 'test' | 'resource' | 'pyq';
  content: string | null;
  link_url: string | null;
  order_index: number;
  is_required: boolean;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

function SortableSection({ section, onEdit, onDelete }: { 
  section: Section; 
  onEdit: (section: Section) => void; 
  onDelete: (id: string) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'source': return 'bg-blue-100 text-blue-800';
      case 'test': return 'bg-red-100 text-red-800';
      case 'resource': return 'bg-green-100 text-green-800';
      case 'pyq': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'source': return <BookOpen className="h-4 w-4" />;
      case 'test': return <Play className="h-4 w-4" />;
      case 'resource': return <FileText className="h-4 w-4" />;
      case 'pyq': return <Play className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">
              {section.order_index + 1}.
            </span>
            {getTypeIcon(section.type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">{section.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(section.type)}`}>
                {section.type.toUpperCase()}
              </span>
            </div>
            {section.content && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {section.content.substring(0, 100)}...
              </p>
            )}
            {section.link_url && (
              <div className="flex items-center space-x-1 mt-1">
                <LinkIcon className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">Has external link</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(section)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModuleManagement() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [moduleFormData, setModuleFormData] = useState({
    name: '',
    description: ''
  });
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    type: 'source' as 'source' | 'test' | 'resource' | 'pyq',
    content: '',
    link_url: '',
    is_required: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (subjectId) {
      fetchData();
    }
  }, [subjectId]);

  const fetchData = async () => {
    try {
      // Fetch subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch modules with sections
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          sections(*)
        `)
        .eq('subject_id', subjectId)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Sort sections within each module
      const sortedModules = modulesData?.map(module => ({
        ...module,
        sections: module.sections?.sort((a: Section, b: Section) => a.order_index - b.order_index) || []
      })) || [];

      setModules(sortedModules);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleFormData.name.trim()) {
      toast.error('Module name is required');
      return;
    }

    try {
      if (editingModule) {
        // Update existing module
        const { error } = await supabase
          .from('modules')
          .update({
            name: moduleFormData.name,
            description: moduleFormData.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModule.id);

        if (error) throw error;
        toast.success('Module updated successfully');
      } else {
        // Create new module
        const maxOrder = Math.max(...modules.map(m => m.order_index), -1);
        const { error } = await supabase
          .from('modules')
          .insert({
            subject_id: subjectId,
            name: moduleFormData.name,
            description: moduleFormData.description || null,
            order_index: maxOrder + 1
          });

        if (error) throw error;
        toast.success('Module created successfully');
      }

      setShowModuleModal(false);
      setEditingModule(null);
      setModuleFormData({ name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving module:', error);
      toast.error('Failed to save module');
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionFormData.name.trim() || !selectedModuleId) {
      toast.error('Section name and module are required');
      return;
    }

    try {
      const selectedModule = modules.find(m => m.id === selectedModuleId);
      if (!selectedModule) throw new Error('Module not found');

      if (editingSection) {
        // Update existing section
        const { error } = await supabase
          .from('sections')
          .update({
            name: sectionFormData.name,
            type: sectionFormData.type,
            content: sectionFormData.content || null,
            link_url: sectionFormData.link_url || null,
            is_required: sectionFormData.is_required,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSection.id);

        if (error) throw error;
        toast.success('Section updated successfully');
      } else {
        // Create new section
        const maxOrder = Math.max(...selectedModule.sections.map(s => s.order_index), -1);
        const { error } = await supabase
          .from('sections')
          .insert({
            module_id: selectedModuleId,
            name: sectionFormData.name,
            type: sectionFormData.type,
            content: sectionFormData.content || null,
            link_url: sectionFormData.link_url || null,
            order_index: maxOrder + 1,
            is_required: sectionFormData.is_required
          });

        if (error) throw error;
        toast.success('Section created successfully');
      }

      setShowSectionModal(false);
      setEditingSection(null);
      setSelectedModuleId('');
      setSectionFormData({
        name: '',
        type: 'source',
        content: '',
        link_url: '',
        is_required: true
      });
      fetchData();
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Failed to save section');
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleFormData({
      name: module.name,
      description: module.description || ''
    });
    setShowModuleModal(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionFormData({
      name: section.name,
      type: section.type,
      content: section.content || '',
      link_url: section.link_url || '',
      is_required: section.is_required
    });
    // Find the module that contains this section
    const module = modules.find(m => m.sections.some(s => s.id === section.id));
    if (module) {
      setSelectedModuleId(module.id);
    }
    setShowSectionModal(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This will also delete all sections.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      toast.success('Module deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      toast.success('Section deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  const handleDragEnd = async (event: any, moduleId: string) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const module = modules.find(m => m.id === moduleId);
      if (!module) return;

      const oldIndex = module.sections.findIndex(s => s.id === active.id);
      const newIndex = module.sections.findIndex(s => s.id === over.id);

      const newSections = arrayMove(module.sections, oldIndex, newIndex);

      // Update local state immediately
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, sections: newSections } : m
      ));

      // Update order in database
      try {
        const updates = newSections.map((section, index) => ({
          id: section.id,
          order_index: index
        }));

        for (const update of updates) {
          await supabase
            .from('sections')
            .update({ order_index: update.order_index })
            .eq('id', update.id);
        }

        toast.success('Section order updated');
      } catch (error) {
        console.error('Error updating section order:', error);
        toast.error('Failed to update section order');
        fetchData(); // Reload data on error
      }
    }
  };

  const closeModuleModal = () => {
    setShowModuleModal(false);
    setEditingModule(null);
    setModuleFormData({ name: '', description: '' });
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSection(null);
    setSelectedModuleId('');
    setSectionFormData({
      name: '',
      type: 'source',
      content: '',
      link_url: '',
      is_required: true
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

  if (!subject) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Subject not found</h3>
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
              to="/admin/subjects"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
              <p className="text-gray-600">Manage modules and sections</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSectionModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </button>
            <button
              onClick={() => setShowModuleModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </button>
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-6">
          {modules.map((module) => (
            <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
                    {module.description && (
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditModule(module)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModule(module.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="p-6">
                {module.sections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">No sections in this module</p>
                    <button
                      onClick={() => {
                        setSelectedModuleId(module.id);
                        setShowSectionModal(true);
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add first section
                    </button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, module.id)}
                  >
                    <SortableContext
                      items={module.sections.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {module.sections.map((section) => (
                          <SortableSection
                            key={section.id}
                            section={section}
                            onEdit={handleEditSection}
                            onDelete={handleDeleteSection}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ))}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No modules yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first module.
            </p>
            <button
              onClick={() => setShowModuleModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </button>
          </div>
        )}

        {/* Module Modal */}
        {showModuleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingModule ? 'Edit Module' : 'Add New Module'}
                </h3>
              </div>
              <form onSubmit={handleModuleSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="module-name" className="block text-sm font-medium text-gray-700">
                    Module Name *
                  </label>
                  <input
                    type="text"
                    id="module-name"
                    value={moduleFormData.name}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter module name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="module-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="module-description"
                    value={moduleFormData.description}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter module description"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModuleModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {editingModule ? 'Update' : 'Create'} Module
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section Modal */}
        {showSectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSection ? 'Edit Section' : 'Add New Section'}
                </h3>
              </div>
              <form onSubmit={handleSectionSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="section-module" className="block text-sm font-medium text-gray-700">
                    Module *
                  </label>
                  <select
                    id="section-module"
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="section-name" className="block text-sm font-medium text-gray-700">
                    Section Name *
                  </label>
                  <input
                    type="text"
                    id="section-name"
                    value={sectionFormData.name}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter section name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="section-type" className="block text-sm font-medium text-gray-700">
                    Section Type *
                  </label>
                  <select
                    id="section-type"
                    value={sectionFormData.type}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, type: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="source">Source</option>
                    <option value="test">Test</option>
                    <option value="resource">Resource</option>
                    <option value="pyq">PYQ</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="section-content" className="block text-sm font-medium text-gray-700">
                    Content
                  </label>
                  <textarea
                    id="section-content"
                    value={sectionFormData.content}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, content: e.target.value })}
                    rows={6}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter section content, study material, instructions, etc."
                  />
                </div>

                <div>
                  <label htmlFor="section-link" className="block text-sm font-medium text-gray-700">
                    External Link (Optional)
                  </label>
                  <input
                    type="url"
                    id="section-link"
                    value={sectionFormData.link_url}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, link_url: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/resource"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="section-required"
                    checked={sectionFormData.is_required}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, is_required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="section-required" className="ml-2 block text-sm text-gray-900">
                    Required section
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeSectionModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {editingSection ? 'Update' : 'Create'} Section
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
