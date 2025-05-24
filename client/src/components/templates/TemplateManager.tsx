import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, Search, Edit, Star, TrendingUp, Database, AlertCircle, 
  Sparkles, Settings, FileText, Copy, Share2, Zap, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  category: string;
  icon: string;
  variables: string[];
  created_by: string;
  created_at: string;
  usage_count: number;
  effectiveness_score: number;
  tags: string[];
  is_public: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
}

const iconMap = {
  TrendingUp,
  Database,
  AlertCircle,
  Sparkles,
  Settings,
  FileText,
  Search,
  Zap
};

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<ResearchTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state for creating templates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_template: '',
    category: 'custom',
    icon: 'FileText',
    tags: ''
  });

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/templates/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates/user');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Template Created!",
          description: "Your research template has been created successfully.",
        });
        setIsCreateDialogOpen(false);
        setFormData({
          name: '',
          description: '',
          prompt_template: '',
          category: 'custom',
          icon: 'FileText',
          tags: ''
        });
        loadTemplates();
      } else {
        toast({
          title: "Creation Failed",
          description: data.error || "Failed to create template",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUseTemplate = async (template: ResearchTemplate) => {
    const variables: Record<string, string> = {};
    
    template.variables.forEach(variable => {
      const value = prompt(`Enter value for ${variable}:`);
      if (value) variables[variable] = value;
    });

    try {
      const response = await fetch('/api/templates/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: template.prompt_template,
          variables
        })
      });

      const data = await response.json();
      if (data.success) {
        navigator.clipboard.writeText(data.filled_template);
        toast({
          title: "Template Ready!",
          description: "Filled template copied to clipboard. Paste it into your research chat.",
        });

        fetch(`/api/templates/${template.id}/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process template",
        variant: "destructive"
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileText;
    return IconComponent;
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Template Manager</h1>
          <p className="text-gray-400 mt-1">Create and manage your research templates</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Create Research Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Template name"
                    className="bg-slate-800 border-slate-600 text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this template does"
                  className="bg-slate-800 border-slate-600 text-gray-100"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Template Content
                  <span className="text-xs text-gray-500 ml-2">Use {"{variable_name}"} for dynamic content</span>
                </label>
                <Textarea
                  value={formData.prompt_template}
                  onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                  placeholder="Analyze current market trends for {company} in the {industry} sector..."
                  rows={6}
                  className="bg-slate-800 border-slate-600 text-gray-100"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Tags</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="market, analysis, financial (comma-separated)"
                  className="bg-slate-800 border-slate-600 text-gray-100"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} className="bg-primary hover:bg-primary/80">
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-10 bg-slate-800 border-slate-600 text-gray-100"
          />
        </div>
      </div>

      {/* Personal Favorites Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Personal Favorites</h2>
            <p className="text-sm text-gray-400">Your most-used research prompts</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Market Analysis Research",
              description: "Deep dive into current market trends and opportunities",
              prompt: "Analyze current market trends and identify emerging investment opportunities with detailed financial data and forecasts",
              icon: "TrendingUp",
              usage: 45
            },
            {
              title: "Financial Data Analysis", 
              description: "Comprehensive financial metrics and performance review",
              prompt: "Generate a comprehensive financial analysis including key metrics, ratios, and performance indicators with latest quarterly data",
              icon: "Database",
              usage: 38
            },
            {
              title: "Competitive Intelligence",
              description: "Research competitors and market positioning",
              prompt: "Research competitive landscape, market positioning, and strategic advantages with detailed competitor analysis",
              icon: "Search",
              usage: 29
            },
            {
              title: "Risk Assessment Report",
              description: "Evaluate investment risks and opportunities",
              prompt: "Assess investment risks, market volatility, and potential opportunities with risk-adjusted return analysis",
              icon: "AlertCircle",
              usage: 22
            }
          ].map((favorite, idx) => {
            const IconComponent = getIconComponent(favorite.icon);
            return (
              <Card key={idx} className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border-primary/20 hover:border-primary/40 transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-100">{favorite.title}</h3>
                        <p className="text-xs text-gray-400">{favorite.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {favorite.usage} uses
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(favorite.prompt);
                        toast({
                          title: "Copied!",
                          description: "Template copied to clipboard. Paste it into your research chat.",
                        });
                      }}
                      className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary text-xs border border-primary/30"
                      variant="outline"
                    >
                      Use Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="p-2 border-slate-600 hover:border-primary/30"
                      onClick={() => {
                        navigator.clipboard.writeText(favorite.prompt);
                        toast({
                          title: "Copied!",
                          description: "Prompt copied to clipboard.",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Templates Section */}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Custom Templates</h2>
            <p className="text-sm text-gray-400">Templates you've created</p>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-4">Create your first research template to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary hover:bg-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const IconComponent = getIconComponent(template.icon);
            return (
              <Card key={template.id} className="bg-slate-900/50 border-slate-700/50 hover:border-primary/30 transition-all duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-gray-100 text-sm font-medium">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs border-slate-600 text-gray-400">
                            {categories.find(c => c.id === template.category)?.name || template.category}
                          </Badge>
                          <div className={cn("flex items-center space-x-1 text-xs", getEffectivenessColor(template.effectiveness_score))}>
                            <Star className="w-3 h-3" />
                            <span>{(template.effectiveness_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-gray-400 text-sm mb-4">
                    {template.description}
                  </CardDescription>
                  
                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">Variables:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-slate-800 text-gray-300">
                            {"{" + variable + "}"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>{template.usage_count} uses</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1 bg-primary hover:bg-primary/80 text-white text-xs"
                    >
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm" className="p-2 border-slate-600 hover:border-primary/30">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="p-2 border-slate-600 hover:border-primary/30">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;