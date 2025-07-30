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
  openai_api_key: string;
  max_tokens: string;
  temperature: string;
  model: string;
}

interface PromptTemplate {
  system_prompt: string;
  resume_analysis_prompt: string;
  skills_extraction_prompt: string;
  response_format: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    openai_api_key: '',
    max_tokens: '1000',
    temperature: '0.7',
    model: 'gpt-4'
  });

  const [promptTemplate, setPromptTemplate] = useState<PromptTemplate>({
    system_prompt: '',
    resume_analysis_prompt: '',
    skills_extraction_prompt: '',
    response_format: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [testResult, setTestResult] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadPromptTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings?action=system');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadPromptTemplates = async () => {
    try {
      const response = await fetch('/api/settings?action=prompts');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPromptTemplate(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings?action=system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "System settings have been updated successfully.",
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

  const savePromptTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings?action=prompts', {
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

  const testApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings?action=test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: settings.openai_api_key }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult('success');
        toast({
          title: "API Key Valid",
          description: "Your OpenAI API key is working correctly.",
        });
      } else {
        setTestResult('error');
        toast({
          title: "API Key Invalid",
          description: data.error || "Please check your API key and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({
        title: "Test Failed",
        description: "Failed to test API key. Please try again.",
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
      description: "Text copied to clipboard.",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI recruitment assistant
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="ai-configuration" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.openai_api_key}
                      onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.openai_api_key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={testApiKey} disabled={isLoading || !settings.openai_api_key}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Test API Key
                </Button>
                <Button onClick={saveSettings} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>

              {testResult === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    API key is valid and working correctly.
                  </AlertDescription>
                </Alert>
              )}

              {testResult === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    API key test failed. Please check your key and try again.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <select
                    id="model"
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={settings.max_tokens}
                    onChange={(e) => setSettings({ ...settings, max_tokens: e.target.value })}
                    min="100"
                    max="4000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: e.target.value })}
                  min="0"
                  max="2"
                  step="0.1"
                />
                <p className="text-sm text-muted-foreground">
                  Lower values make responses more focused, higher values more creative.
                </p>
              </div>
              <Button onClick={saveSettings} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                AI Prompt Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={promptTemplate.system_prompt}
                  onChange={(e) => setPromptTemplate({ ...promptTemplate, system_prompt: e.target.value })}
                  placeholder="Define the AI's role and behavior..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-analysis">Resume Analysis Prompt</Label>
                <Textarea
                  id="resume-analysis"
                  value={promptTemplate.resume_analysis_prompt}
                  onChange={(e) => setPromptTemplate({ ...promptTemplate, resume_analysis_prompt: e.target.value })}
                  placeholder="Instructions for analyzing resumes..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills-extraction">Skills Extraction Prompt</Label>
                <Textarea
                  id="skills-extraction"
                  value={promptTemplate.skills_extraction_prompt}
                  onChange={(e) => setPromptTemplate({ ...promptTemplate, skills_extraction_prompt: e.target.value })}
                  placeholder="Instructions for extracting skills..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="response-format">Response Format</Label>
                <Textarea
                  id="response-format"
                  value={promptTemplate.response_format}
                  onChange={(e) => setPromptTemplate({ ...promptTemplate, response_format: e.target.value })}
                  placeholder="Define the expected response format..."
                  rows={3}
                />
              </div>

              <Button onClick={savePromptTemplates} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save Prompts
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 