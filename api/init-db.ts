import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory database for Vercel deployment
let memoryDB: any = {
  jobs: [
    {
      id: 'job-001',
      title: 'Senior AI Engineer',
      description: 'Join our team to build the next generation of AI-powered recruitment tools. Work with cutting-edge LLMs and modern tech stack including React, TypeScript, and OpenAI APIs.',
      department: 'Engineering',
      location: 'San Francisco, CA',
      type: 'full-time',
      salaryMin: 150000,
      salaryMax: 200000,
      experienceLevel: 'senior',
      skills: ['Python', 'AI/ML', 'OpenAI', 'React', 'TypeScript'],
      requirements: ['5+ years experience', 'AI/ML expertise', 'Strong Python skills', 'Experience with LLMs'],
      benefits: ['Health insurance', 'Remote work', 'Stock options', 'Unlimited PTO'],
      status: 'active',
      deadline: '2024-03-15',
      applicants: 12,
      postedBy: 'Tech Lead',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'job-002',
      title: 'Product Manager - Recruitment Platform',
      description: 'Lead product strategy for our AI-powered recruitment platform. Define roadmap, work with engineering teams, and drive user experience improvements.',
      department: 'Product',
      location: 'Remote',
      type: 'full-time',
      salaryMin: 120000,
      salaryMax: 160000,
      experienceLevel: 'mid',
      skills: ['Product Management', 'Agile', 'Analytics', 'User Research'],
      requirements: ['3+ years PM experience', 'B2B SaaS background', 'Strong analytical skills'],
      benefits: ['Health insurance', 'Remote work', 'Professional development budget'],
      status: 'active',
      deadline: '2024-02-28',
      applicants: 8,
      postedBy: 'Head of Product',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    {
      id: 'job-003',
      title: 'UX Designer',
      description: 'Design intuitive user experiences for our recruitment platform. Work closely with product and engineering to create beautiful, functional interfaces.',
      department: 'Design',
      location: 'New York, NY',
      type: 'full-time',
      salaryMin: 90000,
      salaryMax: 130000,
      experienceLevel: 'mid',
      skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      requirements: ['2+ years UX experience', 'Portfolio required', 'Experience with design systems'],
      benefits: ['Health insurance', 'Flexible hours', 'Design conferences budget'],
      status: 'active',
      deadline: '2024-03-01',
      applicants: 15,
      postedBy: 'Design Director',
      createdAt: '2024-01-25T09:15:00Z',
      updatedAt: '2024-01-25T09:15:00Z'
    }
  ],
  candidates: [
    {
      id: 'candidate-001',
      name: 'Sarah Chen',
      email: 'sarah.chen@email.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      resumeUrl: 'https://example.com/resume-sarah.pdf',
      linkedinUrl: 'https://linkedin.com/in/sarahchen',
      githubUrl: 'https://github.com/sarahchen',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'React', 'TypeScript'],
      experience: [
        {
          company: 'TechCorp',
          position: 'AI Engineer',
          duration: '2021-2024',
          description: 'Developed ML models for recommendation systems'
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'MS Computer Science',
          year: '2021'
        }
      ],
      summary: 'Experienced AI engineer with 3+ years building machine learning systems. Passionate about applying AI to solve real-world problems.',
      source: 'linkedin',
      experienceLevel: 'senior',
      salaryExpectation: '$160,000 - $180,000',
      availability: 'available',
      notes: 'Strong technical background, good cultural fit',
      aiScore: 92,
      status: 'active',
      appliedJobs: ['job-001'],
      createdAt: '2024-01-10T08:00:00Z',
      updatedAt: '2024-01-10T08:00:00Z'
    },
    {
      id: 'candidate-002',
      name: 'Michael Rodriguez',
      email: 'michael.r@email.com',
      phone: '+1-555-0124',
      location: 'Austin, TX',
      resumeUrl: 'https://example.com/resume-michael.pdf',
      linkedinUrl: 'https://linkedin.com/in/michaelrodriguez',
      githubUrl: null,
      skills: ['Product Management', 'Agile', 'Data Analysis', 'User Research'],
      experience: [
        {
          company: 'StartupXYZ',
          position: 'Senior Product Manager',
          duration: '2020-2024',
          description: 'Led product development for B2B SaaS platform'
        }
      ],
      education: [
        {
          institution: 'University of Texas',
          degree: 'MBA',
          year: '2020'
        }
      ],
      summary: 'Product manager with 4 years experience in B2B SaaS. Proven track record of launching successful products.',
      source: 'referral',
      experienceLevel: 'mid',
      salaryExpectation: '$130,000 - $150,000',
      availability: 'available',
      notes: 'Great PM experience, excellent communication skills',
      aiScore: 87,
      status: 'active',
      appliedJobs: ['job-002'],
      createdAt: '2024-01-12T10:30:00Z',
      updatedAt: '2024-01-12T10:30:00Z'
    },
    {
      id: 'candidate-003',
      name: 'Emily Wong',
      email: 'emily.wong@email.com',
      phone: '+1-555-0125',
      location: 'New York, NY',
      resumeUrl: 'https://example.com/resume-emily.pdf',
      linkedinUrl: 'https://linkedin.com/in/emilywong',
      githubUrl: null,
      skills: ['UX Design', 'Figma', 'User Research', 'Prototyping', 'Design Systems'],
      experience: [
        {
          company: 'DesignStudio',
          position: 'UX Designer',
          duration: '2022-2024',
          description: 'Designed user experiences for mobile and web applications'
        }
      ],
      education: [
        {
          institution: 'Parsons School of Design',
          degree: 'BFA Graphic Design',
          year: '2022'
        }
      ],
      summary: 'Creative UX designer with 2 years experience. Passionate about creating user-centered designs.',
      source: 'website',
      experienceLevel: 'junior',
      salaryExpectation: '$95,000 - $115,000',
      availability: 'available',
      notes: 'Strong portfolio, eager to learn',
      aiScore: 79,
      status: 'active',
      appliedJobs: ['job-003'],
      createdAt: '2024-01-14T14:20:00Z',
      updatedAt: '2024-01-14T14:20:00Z'
    }
  ],
  applications: [
    {
      id: 'app-001',
      candidateId: 'candidate-001',
      jobId: 'job-001',
      candidateName: 'Sarah Chen',
      position: 'Senior AI Engineer',
      email: 'sarah.chen@email.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      appliedDate: '2024-01-15',
      status: 'interview',
      aiScore: 92,
      stage: 'Technical Interview',
      resumeUrl: 'https://example.com/resume-sarah.pdf',
      coverLetterUrl: null,
      experience: '3+ years AI/ML',
      salaryExpectation: '$160,000 - $180,000',
      source: 'linkedin',
      notes: 'Excellent technical background, scheduled for final round',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-28T16:30:00Z'
    },
    {
      id: 'app-002',
      candidateId: 'candidate-002',
      jobId: 'job-002',
      candidateName: 'Michael Rodriguez',
      position: 'Product Manager - Recruitment Platform',
      email: 'michael.r@email.com',
      phone: '+1-555-0124',
      location: 'Austin, TX',
      appliedDate: '2024-01-20',
      status: 'offer',
      aiScore: 87,
      stage: 'Offer Extended',
      resumeUrl: 'https://example.com/resume-michael.pdf',
      coverLetterUrl: null,
      experience: '4 years PM experience',
      salaryExpectation: '$130,000 - $150,000',
      source: 'referral',
      notes: 'Great culture fit, offer extended yesterday',
      createdAt: '2024-01-20T11:15:00Z',
      updatedAt: '2024-01-29T10:00:00Z'
    },
    {
      id: 'app-003',
      candidateId: 'candidate-003',
      jobId: 'job-003',
      candidateName: 'Emily Wong',
      position: 'UX Designer',
      email: 'emily.wong@email.com',
      phone: '+1-555-0125',
      location: 'New York, NY',
      appliedDate: '2024-01-25',
      status: 'reviewing',
      aiScore: 79,
      stage: 'Portfolio Review',
      resumeUrl: 'https://example.com/resume-emily.pdf',
      coverLetterUrl: null,
      experience: '2 years UX design',
      salaryExpectation: '$95,000 - $115,000',
      source: 'website',
      notes: 'Strong portfolio, scheduling phone screen',
      createdAt: '2024-01-25T15:45:00Z',
      updatedAt: '2024-01-27T09:20:00Z'
    },
    {
      id: 'app-004',
      candidateId: 'candidate-001',
      jobId: 'job-002',
      candidateName: 'Sarah Chen',
      position: 'Product Manager - Recruitment Platform',
      email: 'sarah.chen@email.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      appliedDate: '2024-01-28',
      status: 'new',
      aiScore: 75,
      stage: 'Application Submitted',
      resumeUrl: 'https://example.com/resume-sarah.pdf',
      coverLetterUrl: null,
      experience: '3+ years AI/ML',
      salaryExpectation: '$140,000 - $160,000',
      source: 'internal',
      notes: 'Also applied for AI Engineer role, considering PM transition',
      createdAt: '2024-01-28T13:30:00Z',
      updatedAt: '2024-01-28T13:30:00Z'
    },
    {
      id: 'app-005',
      candidateId: 'candidate-002',
      jobId: 'job-001',
      candidateName: 'Michael Rodriguez',
      position: 'Senior AI Engineer',
      email: 'michael.r@email.com',
      phone: '+1-555-0124',
      location: 'Austin, TX',
      appliedDate: '2024-01-29',
      status: 'hired',
      aiScore: 68,
      stage: 'Hired',
      resumeUrl: 'https://example.com/resume-michael.pdf',
      coverLetterUrl: null,
      experience: '4 years PM experience',
      salaryExpectation: '$145,000',
      source: 'referral',
      notes: 'Hired for AI Engineer role, strong technical PM background',
      createdAt: '2024-01-29T08:00:00Z',
      updatedAt: '2024-01-29T17:00:00Z'
    }
  ],
  users: [{
    id: 'admin-user-id',
    email: 'admin@recruitai.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    created_at: new Date().toISOString()
  }],
  system_settings: [
    { key: 'openai_api_key', value: '', description: 'OpenAI API Key', is_public: 0 },
    { key: 'max_tokens', value: '1500', description: 'Max tokens for AI responses', is_public: 1 },
    { key: 'temperature', value: '0.7', description: 'AI response creativity (0-1)', is_public: 1 },
    { key: 'model', value: 'gpt-4', description: 'AI Model to use', is_public: 1 },
    { key: 'system_prompt', value: 'You are an expert AI recruitment assistant specializing in candidate evaluation and resume analysis. Your goal is to help recruiters make informed, unbiased decisions by providing structured analysis of candidates based on their qualifications and job requirements. Always maintain professionalism and objectivity in your assessments.', description: 'System prompt for AI assistant', is_public: 0 },
    { key: 'resume_analysis_prompt', value: 'Analyze the following resume against the job requirements and provide a comprehensive evaluation:\n\n**CANDIDATE RESUME:**\n{resume_text}\n\n**JOB REQUIREMENTS:**\n{job_requirements}\n\n**JOB DESCRIPTION:**\n{job_description}\n\nPlease provide your analysis in the following structured format:\n\n**CANDIDATE SUMMARY:**\n- Name: [Extract from resume]\n- Current Position: [Current role and company]\n- Years of Experience: [Calculate from work history]\n- Education: [Highest degree and institution]\n- Location: [Current location]\n\n**TECHNICAL SKILLS ASSESSMENT:**\n- Required Skills Match: [List matching skills with proficiency indicators]\n- Additional Technical Skills: [Other relevant technical skills]\n- Skill Gaps: [Important skills from job requirements not evident in resume]\n- Overall Technical Fit: [Score 1-10 with explanation]\n\n**EXPERIENCE ANALYSIS:**\n- Relevant Experience: [How their experience aligns with the role]\n- Career Progression: [Analysis of career growth and trajectory]\n- Industry Background: [Relevant industry experience]\n- Leadership Experience: [Any management or leadership roles]\n\n**EDUCATION & CERTIFICATIONS:**\n- Educational Background: [Relevance to the position]\n- Professional Certifications: [Any relevant certifications]\n- Continuous Learning: [Evidence of ongoing skill development]\n\n**SCORING & EVALUATION:**\n- Overall Match Score: [0-100 with detailed breakdown]\n- Technical Competency: [1-10]\n- Experience Relevance: [1-10]\n- Cultural Potential: [1-10 based on available information]\n- Growth Potential: [1-10]\n\n**RECOMMENDATION:**\n- Hiring Decision: [STRONG_RECOMMEND / RECOMMEND / CONSIDER / NOT_RECOMMEND]\n- Key Strengths: [Top 3-5 strengths for this specific role]\n- Areas of Concern: [Any potential issues or gaps]\n- Interview Focus Areas: [Specific topics to explore in interviews]\n- Salary Range Fit: [How they align with role expectations]\n\n**POTENTIAL RED FLAGS:**\n[Any concerning gaps, inconsistencies, or issues that require clarification]\n\n**NEXT STEPS:**\n[Specific recommendations for next steps in the hiring process]', description: 'Comprehensive resume analysis prompt', is_public: 0 },
    { key: 'skills_extraction_prompt', value: 'Extract and categorize all skills mentioned in the following resume text. Be thorough and include both explicitly stated skills and those that can be reasonably inferred from job descriptions and achievements.\n\n**RESUME TEXT:**\n{resume_text}\n\nPlease organize the extracted skills into the following categories:\n\n**TECHNICAL SKILLS:**\n- Programming Languages: [List all languages with any indicated proficiency levels]\n- Frameworks & Libraries: [Web frameworks, ML libraries, etc.]\n- Databases & Storage: [SQL, NoSQL, cloud storage solutions]\n- Cloud & DevOps: [AWS, Azure, GCP, Docker, Kubernetes, CI/CD tools]\n- Development Tools: [IDEs, version control, project management tools]\n- Operating Systems: [Windows, Linux, macOS]\n- Other Technical: [Any other technical skills not covered above]\n\n**SOFT SKILLS:**\n- Leadership & Management: [Team leadership, project management, mentoring]\n- Communication: [Presentation, writing, stakeholder management]\n- Problem Solving: [Analytical thinking, troubleshooting, innovation]\n- Collaboration: [Teamwork, cross-functional collaboration]\n- Adaptability: [Learning agility, change management]\n- Other Interpersonal: [Other soft skills demonstrated]\n\n**DOMAIN EXPERTISE:**\n- Industry Knowledge: [Specific industry experience and knowledge]\n- Business Skills: [Strategy, operations, business development]\n- Analytical Skills: [Data analysis, research, metrics]\n- Design Skills: [UI/UX, graphic design, user research]\n\n**CERTIFICATIONS & CREDENTIALS:**\n- Professional Certifications: [AWS, Google, Microsoft, etc.]\n- Academic Credentials: [Degrees, relevant coursework]\n- Training & Courses: [Online courses, bootcamps, workshops]\n\n**YEARS OF EXPERIENCE:**\nFor each major skill category, estimate years of experience based on job history and descriptions.\n\nProvide confidence levels (High/Medium/Low) for each skill based on how clearly it\'s demonstrated in the resume.', description: 'Detailed skills extraction prompt', is_public: 0 },
    { key: 'response_format', value: 'Always respond with valid JSON in the following structure:\n\n{\n  "candidateSummary": {\n    "name": "string",\n    "currentPosition": "string",\n    "yearsOfExperience": number,\n    "education": "string",\n    "location": "string"\n  },\n  "technicalSkills": {\n    "requiredSkillsMatch": ["string"],\n    "additionalSkills": ["string"],\n    "skillGaps": ["string"],\n    "technicalFitScore": number\n  },\n  "experienceAnalysis": {\n    "relevantExperience": "string",\n    "careerProgression": "string",\n    "industryBackground": "string",\n    "leadershipExperience": "string"\n  },\n  "scoring": {\n    "overallMatchScore": number,\n    "technicalCompetency": number,\n    "experienceRelevance": number,\n    "culturalPotential": number,\n    "growthPotential": number\n  },\n  "recommendation": {\n    "hiringDecision": "STRONG_RECOMMEND|RECOMMEND|CONSIDER|NOT_RECOMMEND",\n    "keyStrengths": ["string"],\n    "areasOfConcern": ["string"],\n    "interviewFocusAreas": ["string"],\n    "salaryRangeFit": "string"\n  },\n  "redFlags": ["string"],\n  "nextSteps": ["string"]\n}\n\nEnsure all fields are properly filled and the JSON is valid.', description: 'Expected JSON response format', is_public: 0 }
  ]
};

export function getMemoryDB() {
  return memoryDB;
}

export function resetMemoryDB() {
  // Reset with comprehensive sample data
  memoryDB = {
    jobs: [
      {
        id: 'job-001',
        title: 'Senior AI Engineer',
        description: 'Join our team to build the next generation of AI-powered recruitment tools. Work with cutting-edge LLMs and modern tech stack including React, TypeScript, and OpenAI APIs.',
        department: 'Engineering',
        location: 'San Francisco, CA',
        type: 'full-time',
        salaryMin: 150000,
        salaryMax: 200000,
        experienceLevel: 'senior',
        skills: ['Python', 'AI/ML', 'OpenAI', 'React', 'TypeScript'],
        requirements: ['5+ years experience', 'AI/ML expertise', 'Strong Python skills', 'Experience with LLMs'],
        benefits: ['Health insurance', 'Remote work', 'Stock options', 'Unlimited PTO'],
        status: 'active',
        deadline: '2024-03-15',
        applicants: 12,
        postedBy: 'Tech Lead',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'job-002',
        title: 'Product Manager - Recruitment Platform',
        description: 'Lead product strategy for our AI-powered recruitment platform. Define roadmap, work with engineering teams, and drive user experience improvements.',
        department: 'Product',
        location: 'Remote',
        type: 'full-time',
        salaryMin: 120000,
        salaryMax: 160000,
        experienceLevel: 'mid',
        skills: ['Product Management', 'Agile', 'Analytics', 'User Research'],
        requirements: ['3+ years PM experience', 'B2B SaaS background', 'Strong analytical skills'],
        benefits: ['Health insurance', 'Remote work', 'Professional development budget'],
        status: 'active',
        deadline: '2024-02-28',
        applicants: 8,
        postedBy: 'Head of Product',
        createdAt: '2024-01-20T14:30:00Z',
        updatedAt: '2024-01-20T14:30:00Z'
      },
      {
        id: 'job-003',
        title: 'UX Designer',
        description: 'Design intuitive user experiences for our recruitment platform. Work closely with product and engineering to create beautiful, functional interfaces.',
        department: 'Design',
        location: 'New York, NY',
        type: 'full-time',
        salaryMin: 90000,
        salaryMax: 130000,
        experienceLevel: 'mid',
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
        requirements: ['2+ years UX experience', 'Portfolio required', 'Experience with design systems'],
        benefits: ['Health insurance', 'Flexible hours', 'Design conferences budget'],
        status: 'active',
        deadline: '2024-03-01',
        applicants: 15,
        postedBy: 'Design Director',
        createdAt: '2024-01-25T09:15:00Z',
        updatedAt: '2024-01-25T09:15:00Z'
      }
    ],
    candidates: [
      {
        id: 'candidate-001',
        name: 'Sarah Chen',
        email: 'sarah.chen@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        resumeUrl: 'https://example.com/resume-sarah.pdf',
        linkedinUrl: 'https://linkedin.com/in/sarahchen',
        githubUrl: 'https://github.com/sarahchen',
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'React', 'TypeScript'],
        experience: [
          {
            company: 'TechCorp',
            position: 'AI Engineer',
            duration: '2021-2024',
            description: 'Developed ML models for recommendation systems'
          }
        ],
        education: [
          {
            institution: 'Stanford University',
            degree: 'MS Computer Science',
            year: '2021'
          }
        ],
        summary: 'Experienced AI engineer with 3+ years building machine learning systems. Passionate about applying AI to solve real-world problems.',
        source: 'linkedin',
        experienceLevel: 'senior',
        salaryExpectation: '$160,000 - $180,000',
        availability: 'available',
        notes: 'Strong technical background, good cultural fit',
        aiScore: 92,
        status: 'active',
        appliedJobs: ['job-001'],
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-10T08:00:00Z'
      },
      {
        id: 'candidate-002',
        name: 'Michael Rodriguez',
        email: 'michael.r@email.com',
        phone: '+1-555-0124',
        location: 'Austin, TX',
        resumeUrl: 'https://example.com/resume-michael.pdf',
        linkedinUrl: 'https://linkedin.com/in/michaelrodriguez',
        githubUrl: null,
        skills: ['Product Management', 'Agile', 'Data Analysis', 'User Research'],
        experience: [
          {
            company: 'StartupXYZ',
            position: 'Senior Product Manager',
            duration: '2020-2024',
            description: 'Led product development for B2B SaaS platform'
          }
        ],
        education: [
          {
            institution: 'University of Texas',
            degree: 'MBA',
            year: '2020'
          }
        ],
        summary: 'Product manager with 4 years experience in B2B SaaS. Proven track record of launching successful products.',
        source: 'referral',
        experienceLevel: 'mid',
        salaryExpectation: '$130,000 - $150,000',
        availability: 'available',
        notes: 'Great PM experience, excellent communication skills',
        aiScore: 87,
        status: 'active',
        appliedJobs: ['job-002'],
        createdAt: '2024-01-12T10:30:00Z',
        updatedAt: '2024-01-12T10:30:00Z'
      },
      {
        id: 'candidate-003',
        name: 'Emily Wong',
        email: 'emily.wong@email.com',
        phone: '+1-555-0125',
        location: 'New York, NY',
        resumeUrl: 'https://example.com/resume-emily.pdf',
        linkedinUrl: 'https://linkedin.com/in/emilywong',
        githubUrl: null,
        skills: ['UX Design', 'Figma', 'User Research', 'Prototyping', 'Design Systems'],
        experience: [
          {
            company: 'DesignStudio',
            position: 'UX Designer',
            duration: '2022-2024',
            description: 'Designed user experiences for mobile and web applications'
          }
        ],
        education: [
          {
            institution: 'Parsons School of Design',
            degree: 'BFA Graphic Design',
            year: '2022'
          }
        ],
        summary: 'Creative UX designer with 2 years experience. Passionate about creating user-centered designs.',
        source: 'website',
        experienceLevel: 'junior',
        salaryExpectation: '$95,000 - $115,000',
        availability: 'available',
        notes: 'Strong portfolio, eager to learn',
        aiScore: 79,
        status: 'active',
        appliedJobs: ['job-003'],
        createdAt: '2024-01-14T14:20:00Z',
        updatedAt: '2024-01-14T14:20:00Z'
      }
    ],
    applications: [
      {
        id: 'app-001',
        candidateId: 'candidate-001',
        jobId: 'job-001',
        candidateName: 'Sarah Chen',
        position: 'Senior AI Engineer',
        email: 'sarah.chen@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        appliedDate: '2024-01-15',
        status: 'interview',
        aiScore: 92,
        stage: 'Technical Interview',
        resumeUrl: 'https://example.com/resume-sarah.pdf',
        coverLetterUrl: null,
        experience: '3+ years AI/ML',
        salaryExpectation: '$160,000 - $180,000',
        source: 'linkedin',
        notes: 'Excellent technical background, scheduled for final round',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-28T16:30:00Z'
      },
      {
        id: 'app-002',
        candidateId: 'candidate-002',
        jobId: 'job-002',
        candidateName: 'Michael Rodriguez',
        position: 'Product Manager - Recruitment Platform',
        email: 'michael.r@email.com',
        phone: '+1-555-0124',
        location: 'Austin, TX',
        appliedDate: '2024-01-20',
        status: 'offer',
        aiScore: 87,
        stage: 'Offer Extended',
        resumeUrl: 'https://example.com/resume-michael.pdf',
        coverLetterUrl: null,
        experience: '4 years PM experience',
        salaryExpectation: '$130,000 - $150,000',
        source: 'referral',
        notes: 'Great culture fit, offer extended yesterday',
        createdAt: '2024-01-20T11:15:00Z',
        updatedAt: '2024-01-29T10:00:00Z'
      },
      {
        id: 'app-003',
        candidateId: 'candidate-003',
        jobId: 'job-003',
        candidateName: 'Emily Wong',
        position: 'UX Designer',
        email: 'emily.wong@email.com',
        phone: '+1-555-0125',
        location: 'New York, NY',
        appliedDate: '2024-01-25',
        status: 'reviewing',
        aiScore: 79,
        stage: 'Portfolio Review',
        resumeUrl: 'https://example.com/resume-emily.pdf',
        coverLetterUrl: null,
        experience: '2 years UX design',
        salaryExpectation: '$95,000 - $115,000',
        source: 'website',
        notes: 'Strong portfolio, scheduling phone screen',
        createdAt: '2024-01-25T15:45:00Z',
        updatedAt: '2024-01-27T09:20:00Z'
      },
      {
        id: 'app-004',
        candidateId: 'candidate-001',
        jobId: 'job-002',
        candidateName: 'Sarah Chen',
        position: 'Product Manager - Recruitment Platform',
        email: 'sarah.chen@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        appliedDate: '2024-01-28',
        status: 'new',
        aiScore: 75,
        stage: 'Application Submitted',
        resumeUrl: 'https://example.com/resume-sarah.pdf',
        coverLetterUrl: null,
        experience: '3+ years AI/ML',
        salaryExpectation: '$140,000 - $160,000',
        source: 'internal',
        notes: 'Also applied for AI Engineer role, considering PM transition',
        createdAt: '2024-01-28T13:30:00Z',
        updatedAt: '2024-01-28T13:30:00Z'
      },
      {
        id: 'app-005',
        candidateId: 'candidate-002',
        jobId: 'job-001',
        candidateName: 'Michael Rodriguez',
        position: 'Senior AI Engineer',
        email: 'michael.r@email.com',
        phone: '+1-555-0124',
        location: 'Austin, TX',
        appliedDate: '2024-01-29',
        status: 'hired',
        aiScore: 68,
        stage: 'Hired',
        resumeUrl: 'https://example.com/resume-michael.pdf',
        coverLetterUrl: null,
        experience: '4 years PM experience',
        salaryExpectation: '$145,000',
        source: 'referral',
        notes: 'Hired for AI Engineer role, strong technical PM background',
        createdAt: '2024-01-29T08:00:00Z',
        updatedAt: '2024-01-29T17:00:00Z'
      }
    ],
    users: [{
      id: 'admin-user-id',
      email: 'admin@recruitai.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      created_at: new Date().toISOString()
    }],
    system_settings: [
      { key: 'openai_api_key', value: '', description: 'OpenAI API Key', is_public: 0 },
      { key: 'max_tokens', value: '1500', description: 'Max tokens for AI responses', is_public: 1 },
      { key: 'temperature', value: '0.7', description: 'AI response creativity (0-1)', is_public: 1 },
      { key: 'model', value: 'gpt-4', description: 'AI Model to use', is_public: 1 }
    ]
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Reset database with sample data
    resetMemoryDB();
    res.json({ success: true, message: 'Database initialized with sample data' });
  } else {
    // Get current state
    res.json({
      success: true,
      data: {
        jobs: memoryDB.jobs.length,
        candidates: memoryDB.candidates.length,
        applications: memoryDB.applications.length,
        settings: memoryDB.system_settings.length
      }
    });
  }
} 