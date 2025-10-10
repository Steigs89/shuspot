import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Upload, Shield, Users, Settings, BookOpen, Plus, FileText, Award } from 'lucide-react';

export default function AdminUpload() {
  const { isAdmin, isSuperAdmin, loading, adminRoles } = useAdmin();
  const [activeTab, setActiveTab] = useState('upload');

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-white/20 rounded"></div>
            <div className="h-24 bg-white/20 rounded"></div>
            <div className="h-24 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: 'upload', label: 'Upload Books', icon: Upload },
    { id: 'manage', label: 'Manage Content', icon: Settings },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Manage Admins', icon: Users }] : [])
  ];

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">
                {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
              </h2>
              <p className="text-white/80 text-sm">
                Roles: {adminRoles.join(', ')}
              </p>
            </div>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/20 border-b-2 border-white'
                  : 'hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'manage' && <ManageTab />}
        {activeTab === 'admins' && isSuperAdmin && <AdminsTab />}
      </div>
    </div>
  );
}

function UploadTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Upload New Content</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UploadCard
          icon={BookOpen}
          title="Upload Book"
          description="Add PDF, video, or audio books"
          onClick={() => {/* TODO: Implement book upload */}}
        />
        <UploadCard
          icon={FileText}
          title="Create Quiz"
          description="Add comprehension quizzes"
          onClick={() => {/* TODO: Implement quiz creation */}}
        />
        <UploadCard
          icon={Plus}
          title="Add Category"
          description="Create new book categories"
          onClick={() => {/* TODO: Implement category creation */}}
        />
        <UploadCard
          icon={Award}
          title="Create Achievement"
          description="Design new achievements"
          onClick={() => {/* TODO: Implement achievement creation */}}
        />
      </div>
    </div>
  );
}

function ManageTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Manage Existing Content</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ManageCard
          title="Books Library"
          description="Edit, delete, or update existing books"
          count="0 books"
          onClick={() => {/* TODO: Navigate to books management */}}
        />
        <ManageCard
          title="Categories"
          description="Organize and manage book categories"
          count="0 categories"
          onClick={() => {/* TODO: Navigate to categories management */}}
        />
        <ManageCard
          title="User Analytics"
          description="View reading statistics and user engagement"
          count="0 users"
          onClick={() => {/* TODO: Navigate to analytics */}}
        />
        <ManageCard
          title="Content Reports"
          description="Review flagged content and user reports"
          count="0 reports"
          onClick={() => {/* TODO: Navigate to reports */}}
        />
      </div>
    </div>
  );
}

function AdminsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Manage Administrators</h3>
      <div className="bg-white/10 rounded-lg p-4">
        <p className="text-white/80 mb-4">
          As a Super Admin, you can grant admin privileges to other users.
        </p>
        <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors">
          Add New Admin
        </button>
      </div>
    </div>
  );
}

interface UploadCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function UploadCard({ icon: Icon, title, description, onClick }: UploadCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors text-left group"
    >
      <Icon className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-white/80">{description}</div>
    </button>
  );
}

interface ManageCardProps {
  title: string;
  description: string;
  count: string;
  onClick: () => void;
}

function ManageCard({ title, description, count, onClick }: ManageCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors text-left"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold">{title}</div>
        <div className="text-xs bg-white/20 px-2 py-1 rounded">{count}</div>
      </div>
      <div className="text-sm text-white/80">{description}</div>
    </button>
  );
}