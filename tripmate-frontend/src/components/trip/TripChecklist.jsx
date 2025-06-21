//src/components/TripChecklist.jsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Circle, Plus, Trash2, Edit3, RotateCcw, 
  Filter, Search, ChevronDown, ChevronUp, AlertCircle,
  BookOpen, Plane, Car, Users, Heart, Building, Backpack,
  Crown, MapPin, UserCheck
} from 'lucide-react';
import api from '../../services/api';

const TripChecklist = ({ trip, onUpdate }) => {
  const [checklist, setChecklist] = useState(trip?.checklist_data || []);
  const [checklistByCategory, setChecklistByCategory] = useState({});
  const [categories, setCategories] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set(['documents', 'booking']));
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('general');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Trip type icons
  const getTripTypeIcon = (type) => {
    const icons = {
      leisure: BookOpen,
      business: Building,
      adventure: MapPin,
      family: Users,
      romantic: Heart,
      cultural: Building,
      backpacking: Backpack,
      luxury: Crown,
      road_trip: Car,
      group: UserCheck
    };
    return icons[type] || BookOpen;
  };

  useEffect(() => {
    if (trip?.checklist_by_category) {
      setChecklistByCategory(trip.checklist_by_category);
      
      // Extract categories info
      const categoriesInfo = {};
      Object.keys(trip.checklist_by_category).forEach(key => {
        categoriesInfo[key] = trip.checklist_by_category[key].metadata;
      });
      setCategories(categoriesInfo);
    }
  }, [trip]);

  const toggleItem = async (itemId) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    
    setChecklist(updatedChecklist);
    await saveChecklist(updatedChecklist);
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const updatedChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(updatedChecklist);
    await saveChecklist(updatedChecklist);
  };

  const addItem = async () => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: Math.max(0, ...checklist.map(item => item.id)) + 1,
      text: newItemText.trim(),
      category: newItemCategory,
      completed: false,
      priority: 'medium'
    };
    
    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    await saveChecklist(updatedChecklist);
    
    setNewItemText('');
    setShowAddForm(false);
  };

  const saveChecklist = async (updatedChecklist) => {
    setSaving(true);
    try {
      const response = await api.put(`/trips/${trip.id}/checklist/`, {
        checklist_data: updatedChecklist
      });
      
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Failed to save checklist:', error);
      alert('Failed to save checklist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const regenerateChecklist = async (mergeWithExisting = true) => {
    if (!confirm(`This will ${mergeWithExisting ? 'update' : 'replace'} your checklist. Continue?`)) return;
    
    setSaving(true);
    try {
      const response = await api.post(`/trips/${trip.id}/checklist/regenerate/`, {
        merge_with_existing: mergeWithExisting
      });
      
      setChecklist(response.data.checklist_data);
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Failed to regenerate checklist:', error);
      alert('Failed to regenerate checklist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getFilteredItems = () => {
    return checklist.filter(item => {
      // Category filter
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      
      // Priority filter
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      
      // Status filter
      if (filterStatus === 'completed' && !item.completed) return false;
      if (filterStatus === 'pending' && item.completed) return false;
      
      // Search filter
      if (searchTerm && !item.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Show completed filter
      if (!showCompleted && item.completed) return false;
      
      return true;
    });
  };

  const getProgress = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getCategoryProgress = (categoryItems) => {
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => item.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const groupItemsByCategory = (items) => {
    const grouped = {};
    items.forEach(item => {
      const category = item.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  };

  const filteredItems = getFilteredItems();
  const groupedItems = groupItemsByCategory(filteredItems);
  const progress = getProgress();
  const TripIcon = getTripTypeIcon(trip?.trip_type);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 text-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TripIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Trip Checklist</h2>
              <p className="text-blue-600">
                {trip?.get_trip_type_display || trip?.trip_type} • {checklist.length} items
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold">{progress}%</div>
            <div className="text-blue-600">Complete</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="bg-blue-200 bg-opacity-50 rounded-full h-3">
            <div
              className="bg-blue-600 rounded-full h-3 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search checklist items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {Object.keys(categories).map(category => (
                <option key={category} value={category}>
                  {categories[category]?.name || category}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>

            <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Show completed</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>

            <button
              onClick={() => regenerateChecklist(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 transition-colors"
              title="Update checklist based on current trip details"
            >
              <RotateCcw className="w-4 h-4" />
              {saving ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter new checklist item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.keys(categories).map(category => (
                  <option key={category} value={category}>
                    {categories[category]?.name || category}
                  </option>
                ))}
              </select>
              <button
                onClick={addItem}
                disabled={!newItemText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Items by Category */}
      <div className="max-h-96 overflow-y-auto">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No items match your current filters</p>
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterStatus('all');
                setSearchTerm('');
                setShowCompleted(true);
              }}
              className="mt-2 text-blue-600 hover:text-blue-700 underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          Object.keys(groupedItems).map(category => {
            const categoryItems = groupedItems[category];
            const categoryInfo = categories[category] || { name: category, icon: '📋', color: 'gray' };
            const categoryProgress = getCategoryProgress(categoryItems);
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border-b border-gray-200 last:border-b-0">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryInfo.icon}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{categoryInfo.name}</h3>
                      <p className="text-sm text-gray-500">
                        {categoryItems.filter(item => item.completed).length} of {categoryItems.length} completed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-lg">{categoryProgress}%</div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`bg-${categoryInfo.color}-500 rounded-full h-2 transition-all duration-300`}
                          style={{ width: `${categoryProgress}%` }}
                        />
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 py-3 border-l-4 pl-4 mb-2 rounded-r-lg transition-all ${
                          item.completed
                            ? 'bg-green-50 border-green-500 opacity-75'
                            : 'bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="flex-shrink-0"
                        >
                          {item.completed ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                          )}
                        </button>

                        <div className="flex-1">
                          <p className={`${
                            item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                            {item.text}
                          </p>
                          {item.priority && (
                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                              item.priority === 'high' ? 'bg-red-100 text-red-800' :
                              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.priority} priority
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {checklist.filter(item => item.completed).length} of {checklist.length} items completed
          </div>
          
          {saving && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripChecklist;