import React, { useState, useEffect } from 'react';
import { Camera, Save, User, Calendar, BookOpen, Star } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  avatar_url?: string;
  date_of_birth?: string;
  grade_level?: string;
  reading_level?: string;
  preferred_language: string;
  is_child_account: boolean;
  parent_email?: string;
}

interface UserProfileManagerProps {
  onProfileUpdate?: (profile: UserProfile) => void;
}

const GRADE_LEVELS = [
  'Pre-K', 'K1', 'K2', '1A', '1B', '2A', '2B', '3A', '3B',
  '4A', '4B', '5A', '5B', '6A', '6B'
];

const READING_LEVELS = [
  'Beginner', 'Early Reader', 'Developing Reader', 'Fluent Reader', 'Advanced Reader'
];

export default function UserProfileManager({ onProfileUpdate }: UserProfileManagerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const updatedProfile = {
        ...profile,
        avatar_url: avatarUrl
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updatedProfile)
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
        return;
      }

      setProfile(updatedProfile);
      setAvatarFile(null);
      setAvatarPreview(null);

      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
        <User className="w-6 h-6" />
        <span>Profile Settings</span>
      </h2>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatarPreview || profile.avatar_url ? (
                <img
                  src={avatarPreview || profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{profile.full_name}</h3>
            <p className="text-gray-600">{profile.email}</p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={profile.display_name || ''}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="How others see your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              value={profile.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Language
            </label>
            <select
              value={profile.preferred_language}
              onChange={(e) => handleInputChange('preferred_language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>

        {/* Reading Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Reading Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <select
                value={profile.grade_level || ''}
                onChange={(e) => handleInputChange('grade_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Grade Level</option>
                {GRADE_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 inline mr-1" />
                Reading Level
              </label>
              <select
                value={profile.reading_level || ''}
                onChange={(e) => handleInputChange('reading_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Reading Level</option>
                {READING_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Child Account Settings */}
        <div className="border-t pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="is_child_account"
              checked={profile.is_child_account}
              onChange={(e) => handleInputChange('is_child_account', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_child_account" className="text-sm font-medium text-gray-700">
              This is a child account
            </label>
          </div>

          {profile.is_child_account && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Email
              </label>
              <input
                type="email"
                value={profile.parent_email || ''}
                onChange={(e) => handleInputChange('parent_email', e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}