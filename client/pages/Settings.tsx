import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings as SettingsIcon, 
  Key, 
  Brain, 
  Eye, 
  Save, 
  RefreshCw,
  Copy,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemSettings {
  ai_provider?: string;
  openai_api_key?: string;
  openai_model?: string;
  xai_api_key?: string;
  xai_model?: string;
  max_tokens?: string;
  temperature?: string;
}

interface PromptTemplate {
  system_prompt: string;
  resume_analysis_prompt: string;
  skills_extraction_prompt: string;
  response_format: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    ai_provider: 'openai',
    openai_api_key: '',
    openai_model: 'gpt-4o',
    xai_api_key: '',
    xai_model: 'grok-3-mini',
    max_tokens: '1500',
    temperature: '0.7'
  });

  const [promptTemplate, setPromptTemplate] = useState<PromptTemplate>({
    system_prompt: '',
    resume_analysis_prompt: '',
    skills_extraction_prompt: '',
    response_format: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchPromptTemplates();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings-fixed');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchPromptTemplates = async () => {
    try {
      const response = await fetch('/api/settings-fixed?action=prompts');
      if (response.ok) {
        const data = await response.json();
        setPromptTemplate(data.prompts || {});
      }
    } catch (error) {
      console.error('Failed to fetch prompt templates:', error);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePromptChange = (key: string, value: string) => {
    setPromptTemplate(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "AI provider settings have been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAIConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-ai-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        setTestResult('success');
        toast({
          title: "AI Connection Successful",
          description: `${result.data?.provider?.toUpperCase()} is working correctly.`,
        });
      } else {
        setTestResult('error');
        toast({
          title: "AI Connection Failed",
          description: result.error || "Please check your API key and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({
        title: "Test Failed",
        description: "Failed to test AI connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePromptTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings-fixed?action=prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptTemplate),
      });

      if (response.ok) {
        toast({
          title: "Prompts saved",
          description: "AI prompt templates have been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save prompts. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your AI providers, prompts, and system settings.
        </p>
      </div>

      <Tabs defaultValue="ai-provider" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-provider" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-provider" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                🤖 AI Provider Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); saveSettings(); }} className="space-y-6">
                
                {/* AI Provider Selection */}
                <div>
                  <Label className="text-sm font-medium">AI Provider</Label>
                  <select
                    value={settings.ai_provider || 'openai'}
                    onChange={(e) => handleSettingChange('ai_provider', e.target.value)}
                    className="w-full mt-1 p-3 border rounded-md bg-white"
                  >
                    <option value="openai">🤖 OpenAI (GPT Models)</option>
                    <option value="xai">🔥 xAI (Grok Models)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose your preferred AI provider</p>
                </div>

                {/* OpenAI Settings */}
                {(settings.ai_provider === 'openai' || !settings.ai_provider) && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                      🤖 OpenAI Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="openai_api_key" className="text-sm font-medium">
                          OpenAI API Key
                        </Label>
                        <Input
                          id="openai_api_key"
                          type="password"
                          value={settings.openai_api_key || ''}
                          onChange={(e) => handleSettingChange('openai_api_key', e.target.value)}
                          placeholder="sk-..."
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline">OpenAI Platform</a>
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="openai_model" className="text-sm font-medium">
                          OpenAI Model
                        </Label>
                        <select
                          value={settings.openai_model || 'gpt-4o'}
                          onChange={(e) => handleSettingChange('openai_model', e.target.value)}
                          className="w-full mt-1 p-2 border rounded-md"
                        >
                          <option value="gpt-4o">GPT-4o (Latest & Best)</option>
                          <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* xAI Settings */}
                {settings.ai_provider === 'xai' && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                      🔥 xAI Grok Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="xai_api_key" className="text-sm font-medium">
                          xAI API Key
                        </Label>
                        <Input
                          id="xai_api_key"
                          type="password"
                          value={settings.xai_api_key || ''}
                          onChange={(e) => handleSettingChange('xai_api_key', e.target.value)}
                          placeholder="xai-..."
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Get your API key from <a href="https://console.x.ai/" target="_blank" className="text-green-600 underline">xAI Console</a>
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="xai_model" className="text-sm font-medium">
                          xAI Model
                        </Label>
                        <select
                          value={settings.xai_model || 'grok-3-mini'}
                          onChange={(e) => handleSettingChange('xai_model', e.target.value)}
                          className="w-full mt-1 p-2 border rounded-md"
                        >
                          <option value="grok-3-mini">Grok-3 Mini (Fast & Affordable)</option>
                          <option value="grok-3-mini-fast">Grok-3 Mini Fast</option>
                          <option value="grok-3">Grok-3 (Latest)</option>
                          <option value="grok-3-fast">Grok-3 Fast</option>
                          <option value="grok-2-1212">Grok-2</option>
                          <option value="grok-beta">Grok Beta</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_tokens" className="text-sm font-medium">
                      Max Tokens
                    </Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      value={settings.max_tokens || ''}
                      onChange={(e) => handleSettingChange('max_tokens', e.target.value)}
                      placeholder="1500"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="temperature" className="text-sm font-medium">
                      Temperature
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={settings.temperature || ''}
                      onChange={(e) => handleSettingChange('temperature', e.target.value)}
                      placeholder="0.7"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? 'Saving...' : 'Save Settings'}
                  </Button>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={testAIConnection}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Test AI Connection
                  </Button>
                </div>

                {testResult && (
                  <Alert className={testResult === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <AlertDescription className={testResult === 'success' ? 'text-green-800' : 'text-red-800'}>
                      {testResult === 'success' ? '✅ AI connection is working!' : '❌ AI connection test failed. Please check your settings.'}
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                AI Prompt Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); savePromptTemplates(); }} className="space-y-4">
                <div>
                  <Label htmlFor="system_prompt" className="text-sm font-medium">
                    System Prompt
                  </Label>
                  <Textarea
                    id="system_prompt"
                    value={promptTemplate.system_prompt}
                    onChange={(e) => handlePromptChange('system_prompt', e.target.value)}
                    placeholder="You are an expert recruitment assistant..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="resume_analysis_prompt" className="text-sm font-medium">
                    Resume Analysis Prompt
                  </Label>
                  <Textarea
                    id="resume_analysis_prompt"
                    value={promptTemplate.resume_analysis_prompt}
                    onChange={(e) => handlePromptChange('resume_analysis_prompt', e.target.value)}
                    placeholder="Analyze this resume and provide insights..."
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Saving...' : 'Save Prompts'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 