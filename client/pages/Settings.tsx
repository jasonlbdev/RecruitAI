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
  openaiApiKey: string;
  defaultPromptInstructions: string;
  maxTokens: number;
  temperature: number;
  model: string;
}

interface PromptTemplate {
  systemPrompt: string;
  resumeAnalysisPrompt: string;
  skillsExtractionPrompt: string;
  responseFormat: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    openaiApiKey: '',
    defaultPromptInstructions: '',
    maxTokens: 1500,
    temperature: 0.1,
    model: 'gpt-4'
  });

  const [promptTemplate, setPromptTemplate] = useState<PromptTemplate>({
    systemPrompt: '',
    resumeAnalysisPrompt: '',
    skillsExtractionPrompt: '',
    responseFormat: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
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
        setSettings(data.data || settings);
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
        setPromptTemplate(data.data || {
          systemPrompt: `You are an expert AI recruiter assistant. Your role is to analyze resumes and provide detailed, objective assessments for recruitment purposes.

Key principles:
- Be objective and professional
- Focus on skills, experience, and qualifications
- Avoid bias based on name, location, or personal details
- Provide constructive insights
- Rate candidates fairly based on job requirements`,

          resumeAnalysisPrompt: `Analyze this resume for the given job requirements and provide:

1. Overall compatibility score (0-100)
2. Key strengths that match the role
3. Potential gaps or concerns
4. Skill level assessment
5. Experience relevance
6. Education compatibility
7. Recommendations for next steps

Focus on measurable qualifications and relevant experience.`,

          skillsExtractionPrompt: `Extract and categorize all technical and professional skills mentioned in this resume:

1. Technical Skills (programming languages, frameworks, tools)
2. Professional Skills (management, communication, analysis)
3. Certifications and Qualifications
4. Industry Experience
5. Years of experience for each skill (if mentioned)

Provide confidence levels for each extracted skill.`,

          responseFormat: `Always respond in valid JSON format with the following structure:
{
  "overallScore": number (0-100),
  "skillsScore": number (0-100),
  "experienceScore": number (0-100),
  "educationScore": number (0-100),
  "locationScore": number (0-100),
  "confidenceLevel": number (0-1),
  "summary": "string",
  "keyStrengths": ["string"],
  "concerns": ["string"],
  "extractedSkills": [{"name": "string", "level": "string", "years": number}],
  "recommendations": ["string"]
}`
        });
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "System settings have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save settings');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptTemplate)
      });

      if (response.ok) {
        toast({
          title: "Prompts saved",
          description: "AI prompt templates have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save prompts');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save prompt templates. Please try again.",
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: settings.openaiApiKey })
      });

      if (response.ok) {
        toast({
          title: "API Key Valid",
          description: "OpenAI API key is working correctly.",
        });
      } else {
        throw new Error('Invalid API key');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "API key test failed. Please check your key.",
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
      description: "Content copied to clipboard.",
    });
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-gray-600">Configure system settings and AI behavior</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>

        {/* General Settings */}
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
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={settings.openaiApiKey}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={testApiKey}
                    disabled={isLoading || !settings.openaiApiKey}
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Your OpenAI API key is required for AI-powered resume analysis
                </p>
              </div>

              <div className="flex gap-4">
                <Button onClick={saveSettings} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai" className="space-y-6">
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
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={settings.maxTokens}
                    onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                    min={100}
                    max={4000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={settings.temperature}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-sm text-gray-500">
                    Lower values (0.1) for more focused responses, higher (0.9) for creativity
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Default Instructions</Label>
                <Textarea
                  id="instructions"
                  value={settings.defaultPromptInstructions}
                  onChange={(e) => setSettings({ ...settings, defaultPromptInstructions: e.target.value })}
                  placeholder="Enter default instructions for the AI assistant..."
                  rows={4}
                />
              </div>

              <Button onClick={saveSettings} disabled={isLoading}>
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt Templates */}
        <TabsContent value="prompts" className="space-y-6">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              These prompts control how the AI analyzes resumes. The response format should not be modified to ensure proper data processing.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={promptTemplate.systemPrompt}
                onChange={(e) => setPromptTemplate({ ...promptTemplate, systemPrompt: e.target.value })}
                rows={6}
                placeholder="Define the AI assistant's role and behavior..."
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(promptTemplate.systemPrompt)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume Analysis Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={promptTemplate.resumeAnalysisPrompt}
                onChange={(e) => setPromptTemplate({ ...promptTemplate, resumeAnalysisPrompt: e.target.value })}
                rows={8}
                placeholder="Instructions for analyzing resumes..."
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(promptTemplate.resumeAnalysisPrompt)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills Extraction Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={promptTemplate.skillsExtractionPrompt}
                onChange={(e) => setPromptTemplate({ ...promptTemplate, skillsExtractionPrompt: e.target.value })}
                rows={6}
                placeholder="Instructions for extracting skills..."
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(promptTemplate.skillsExtractionPrompt)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Response Format
                <Badge variant="secondary">Read-only</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={promptTemplate.responseFormat}
                readOnly
                rows={8}
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">
                This format is required for proper data processing and cannot be modified.
              </p>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(promptTemplate.responseFormat)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardContent>
          </Card>

          <Button onClick={savePromptTemplates} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Prompt Templates
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
} 