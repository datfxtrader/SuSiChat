
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getInitials, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  LogOut, 
  Edit2, 
  Save, 
  X, 
  User, 
  Heart, 
  Briefcase, 
  Home, 
  Sparkles,
  Brain,
  Palette,
  Globe,
  Calendar,
  MessageSquare,
  Shield,
  Bell,
  Zap,
  Trophy,
  Target,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface UserPreference {
  id: string;
  key: string;
  value: string;
  category: PreferenceCategory;
  icon?: string;
  isPrivate?: boolean;
  createdAt: string;
}

interface UserProfile {
  preferences: UserPreference[];
  aiPersonality: AIPersonality;
  learningProfile: LearningProfile;
  privacySettings: PrivacySettings;
  achievements: Achievement[];
}

interface AIPersonality {
  tone: 'professional' | 'friendly' | 'casual' | 'encouraging';
  responseLength: 'concise' | 'detailed' | 'balanced';
  emoji: boolean;
  humor: boolean;
  formality: number; // 0-100
}

interface LearningProfile {
  interests: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  expertise: Record<string, number>; // topic -> proficiency level
  adaptationLevel: number; // 0-100
}

interface PrivacySettings {
  sharePreferences: boolean;
  allowLearning: boolean;
  dataRetention: '30days' | '90days' | '1year' | 'forever';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  progress?: number;
}

enum PreferenceCategory {
  PERSONAL = 'personal',
  WORK = 'work',
  FAMILY = 'family',
  INTERESTS = 'interests',
  COMMUNICATION = 'communication',
  LEARNING = 'learning'
}

// Constants
const CATEGORY_CONFIG = {
  [PreferenceCategory.PERSONAL]: { icon: User, color: 'blue', label: 'Personal' },
  [PreferenceCategory.WORK]: { icon: Briefcase, color: 'purple', label: 'Work' },
  [PreferenceCategory.FAMILY]: { icon: Home, color: 'green', label: 'Family' },
  [PreferenceCategory.INTERESTS]: { icon: Heart, color: 'red', label: 'Interests' },
  [PreferenceCategory.COMMUNICATION]: { icon: MessageSquare, color: 'orange', label: 'Communication' },
  [PreferenceCategory.LEARNING]: { icon: Brain, color: 'indigo', label: 'Learning' }
};

const PERSONALITY_SUGGESTIONS = [
  { key: "Communication style", placeholder: "I prefer direct and concise responses" },
  { key: "Work schedule", placeholder: "I work from 9-5 EST on weekdays" },
  { key: "Learning preference", placeholder: "I learn best with examples and visuals" },
  { key: "Language", placeholder: "I speak English and Spanish" },
  { key: "Dietary preferences", placeholder: "I'm vegetarian and allergic to nuts" },
  { key: "Family members", placeholder: "I have 2 kids: Emma (8) and Jake (6)" },
  { key: "Hobbies", placeholder: "I enjoy hiking, photography, and cooking" },
  { key: "Goals", placeholder: "I'm training for a marathon" }
];

// Sub-components
const ProfileHeader = memo<{
  user: any;
  profileCompletion: number;
  onLogout: () => void;
}>(({ user, profileCompletion, onLogout }) => (
  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
    <CardContent className="p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <Avatar className="w-24 h-24 ring-4 ring-white dark:ring-neutral-800 shadow-xl">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}`)}
            </AvatarFallback>
          </Avatar>
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {user?.email}
          </p>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Profile Completion</span>
                <span className="text-sm font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Trophy className="w-3 h-3" />
                Early Adopter
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                Power User
              </Badge>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline"
          onClick={onLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </CardContent>
  </Card>
));

ProfileHeader.displayName = "ProfileHeader";

const PreferenceCard = memo<{
  preference: UserPreference;
  onEdit: (pref: UserPreference) => void;
  onDelete: (id: string) => void;
}>(({ preference, onEdit, onDelete }) => {
  const config = CATEGORY_CONFIG[preference.category];
  const Icon = config.icon;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card className="hover:shadow-md transition-all border-neutral-200 dark:border-neutral-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              `bg-${config.color}-100 dark:bg-${config.color}-900/20`
            )}>
              <Icon className={cn("w-5 h-5", `text-${config.color}-600 dark:text-${config.color}-400`)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{preference.key}</h4>
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
                {preference.isPrivate && (
                  <Shield className="w-3 h-3 text-neutral-400" />
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {preference.value}
              </p>
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(preference)}
                className="w-8 h-8"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(preference.id)}
                className="w-8 h-8 text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PreferenceCard.displayName = "PreferenceCard";

const PreferenceForm = memo<{
  onSave: (pref: Partial<UserPreference>) => void;
  suggestions?: typeof PERSONALITY_SUGGESTIONS;
}>(({ onSave, suggestions = PERSONALITY_SUGGESTIONS }) => {
  const [preference, setPreference] = useState({
    key: "",
    value: "",
    category: PreferenceCategory.PERSONAL,
    isPrivate: false
  });
  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleSave = () => {
    if (!preference.key.trim() || !preference.value.trim()) return;
    onSave(preference);
    setPreference({
      key: "",
      value: "",
      category: PreferenceCategory.PERSONAL,
      isPrivate: false
    });
  };

  const useSuggestion = (suggestion: typeof PERSONALITY_SUGGESTIONS[0]) => {
    setPreference(prev => ({
      ...prev,
      key: suggestion.key,
      value: ""
    }));
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Preference</CardTitle>
        <CardDescription>
          Help Tongkeeper understand you better by sharing your preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSuggestions && (
          <div className="space-y-2">
            <Label className="text-sm">Quick suggestions:</Label>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion) => (
                <Button
                  key={suggestion.key}
                  variant="outline"
                  size="sm"
                  onClick={() => useSuggestion(suggestion)}
                  className="text-xs"
                >
                  {suggestion.key}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="key">What to remember</Label>
              <Input
                id="key"
                placeholder="e.g., Favorite color"
                value={preference.key}
                onChange={(e) => setPreference({ ...preference, key: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={preference.category}
                onValueChange={(value: PreferenceCategory) => 
                  setPreference({ ...preference, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="value">Details</Label>
            <Textarea
              id="value"
              placeholder={
                suggestions.find(s => s.key === preference.key)?.placeholder ||
                "Enter details..."
              }
              value={preference.value}
              onChange={(e) => setPreference({ ...preference, value: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="private"
                checked={preference.isPrivate}
                onCheckedChange={(checked) => 
                  setPreference({ ...preference, isPrivate: checked })
                }
              />
              <Label htmlFor="private" className="text-sm cursor-pointer">
                Keep this private
              </Label>
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={!preference.key.trim() || !preference.value.trim()}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Preference
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PreferenceForm.displayName = "PreferenceForm";

const AIPersonalitySettings = memo<{
  personality: AIPersonality;
  onChange: (personality: AIPersonality) => void;
}>(({ personality, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        AI Personality
      </CardTitle>
      <CardDescription>
        Customize how Tongkeeper interacts with you
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div>
        <Label>Conversation Tone</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {(['professional', 'friendly', 'casual', 'encouraging'] as const).map((tone) => (
            <Button
              key={tone}
              variant={personality.tone === tone ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...personality, tone })}
              className="capitalize"
            >
              {tone}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Response Length</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(['concise', 'balanced', 'detailed'] as const).map((length) => (
            <Button
              key={length}
              variant={personality.responseLength === length ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...personality, responseLength: length })}
              className="capitalize"
            >
              {length}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Personality Traits</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="emoji" className="text-sm font-normal cursor-pointer">
              Use emojis in responses
            </Label>
            <Switch
              id="emoji"
              checked={personality.emoji}
              onCheckedChange={(checked) => 
                onChange({ ...personality, emoji: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="humor" className="text-sm font-normal cursor-pointer">
              Include humor when appropriate
            </Label>
            <Switch
              id="humor"
              checked={personality.humor}
              onCheckedChange={(checked) => 
                onChange({ ...personality, humor: checked })
              }
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Formality Level</Label>
          <span className="text-sm text-neutral-500">{personality.formality}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={personality.formality}
          onChange={(e) => onChange({ ...personality, formality: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>Casual</span>
          <span>Formal</span>
        </div>
      </div>
    </CardContent>
  </Card>
));

AIPersonalitySettings.displayName = "AIPersonalitySettings";

// Main component
const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("preferences");
  const [editingPreference, setEditingPreference] = useState<UserPreference | null>(null);
  
  // Get user profile data - fallback to existing API for preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/preferences"],
  });

  // Mock profile data with actual preferences
  const profile = useMemo<UserProfile>(() => ({
    preferences: preferences || [],
    aiPersonality: {
      tone: 'friendly',
      responseLength: 'balanced',
      emoji: true,
      humor: true,
      formality: 30
    },
    learningProfile: {
      interests: ['Technology', 'Family', 'Travel', 'Health'],
      learningStyle: 'visual',
      expertise: {
        'Technology': 85,
        'Family Management': 70,
        'Travel Planning': 60
      },
      adaptationLevel: 75
    },
    privacySettings: {
      sharePreferences: true,
      allowLearning: true,
      dataRetention: '1year'
    },
    achievements: [
      {
        id: '1',
        title: 'First Steps',
        description: 'Created your first preference',
        icon: 'trophy',
        unlockedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Personalization Master',
        description: 'Added 10 preferences',
        icon: 'star',
        unlockedAt: new Date().toISOString(),
        progress: 60
      }
    ]
  }), [preferences]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const factors = [
      profile.preferences.length >= 5 ? 20 : (profile.preferences.length / 5) * 20,
      profile.aiPersonality ? 20 : 0,
      profile.learningProfile?.interests.length >= 3 ? 20 : (profile.learningProfile?.interests.length / 3) * 20,
      profile.privacySettings ? 20 : 0,
      user?.profileImageUrl ? 20 : 0
    ];
    return Math.round(factors.reduce((a, b) => a + b, 0));
  }, [profile, user]);

  // Save preference mutation - use existing API
  const savePreference = useMutation({
    mutationFn: async (data: Partial<UserPreference>) => {
      const endpoint = editingPreference 
        ? `/api/preferences/${editingPreference.id}`
        : "/api/preferences";
      const method = editingPreference ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      setEditingPreference(null);
      toast({
        title: "Success",
        description: `Preference ${editingPreference ? 'updated' : 'saved'} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save preference",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });

  // Delete preference mutation - use existing API
  const deletePreference = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/preferences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Preference deleted",
        description: "Your preference has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete preference",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });

  // Update AI personality (mock for now)
  const updatePersonality = useMutation({
    mutationFn: async (personality: AIPersonality) => {
      // This would call a real API in production
      return personality;
    },
    onSuccess: () => {
      toast({
        title: "AI personality updated",
        description: "Tongkeeper will adapt to your preferences.",
      });
    }
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <ProfileHeader 
        user={user} 
        profileCompletion={profileCompletion}
        onLogout={handleLogout}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preferences" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">AI Settings</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          {/* Preferences Form */}
          <PreferenceForm 
            onSave={(pref) => savePreference.mutate(pref)}
          />

          {/* Preferences List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Preferences</h3>
              <Badge variant="secondary">
                {profile?.preferences.length || 0} preferences
              </Badge>
            </div>

            <AnimatePresence mode="popLayout">
              {profile?.preferences.map((pref) => (
                <PreferenceCard
                  key={pref.id}
                  preference={pref}
                  onEdit={setEditingPreference}
                  onDelete={(id) => deletePreference.mutate(id)}
                />
              ))}
            </AnimatePresence>

            {(!profile?.preferences || profile.preferences.length === 0) && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Coffee className="w-12 h-12 text-neutral-400 mb-4" />
                  <p className="text-neutral-500 text-center">
                    No preferences yet. Add some to help Tongkeeper understand you better!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          {profile?.aiPersonality && (
            <AIPersonalitySettings
              personality={profile.aiPersonality}
              onChange={(personality) => updatePersonality.mutate(personality)}
            />
          )}

          {/* Learning Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Learning Profile
              </CardTitle>
              <CardDescription>
                How Tongkeeper adapts to your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Adaptation Level</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Progress value={profile?.learningProfile?.adaptationLevel || 0} className="flex-1" />
                    <span className="text-sm font-medium">
                      {profile?.learningProfile?.adaptationLevel || 0}%
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Tongkeeper learns from your interactions to provide better responses
                  </p>
                </div>

                <div>
                  <Label>Top Interests</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile?.learningProfile?.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control how your data is used and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share-preferences">Share preferences with family</Label>
                    <p className="text-sm text-neutral-500">
                      Allow family members to see your non-private preferences
                    </p>
                  </div>
                  <Switch
                    id="share-preferences"
                    checked={profile?.privacySettings?.sharePreferences}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-learning">Allow AI learning</Label>
                    <p className="text-sm text-neutral-500">
                      Let Tongkeeper learn from your interactions
                    </p>
                  </div>
                  <Switch
                    id="allow-learning"
                    checked={profile?.privacySettings?.allowLearning}
                  />
                </div>

                <div>
                  <Label>Data retention period</Label>
                  <Select value={profile?.privacySettings?.dataRetention}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">30 days</SelectItem>
                      <SelectItem value="90days">90 days</SelectItem>
                      <SelectItem value="1year">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>
                Milestones and accomplishments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {profile?.achievements?.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-neutral-500">{achievement.description}</p>
                      {achievement.progress && (
                        <Progress value={achievement.progress} className="h-2 mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;
