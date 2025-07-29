import { RequestHandler } from "express";
import { randomUUID } from 'crypto';
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { Candidate, ApiResponse, PaginatedResponse, SearchFilters } from '@shared/api';

export const getCandidates: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      search, 
      location, 
      experienceLevel, 
      source,
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    }: SearchFilters = req.query;

    const db = getDatabase();
    
    let whereClause = 'WHERE c.is_blacklisted = 0';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.current_title LIKE ? OR c.current_company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (location) {
      whereClause += ' AND c.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (source) {
      whereClause += ' AND c.source = ?';
      params.push(source);
    }

    const validSortColumns = ['first_name', 'last_name', 'email', 'created_at', 'years_experience'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM candidates c
      ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    // Get candidates
    const candidatesQuery = `
      SELECT c.*
      FROM candidates c
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const candidates = await db.all(candidatesQuery, [...params, Number(limit), offset]);

    const candidatesResponse: Candidate[] = await Promise.all(
      candidates.map(async (candidate) => {
        // Get skills for this candidate
        const skills = await db.all(`
          SELECT * FROM candidate_skills WHERE candidate_id = ?
        `, [candidate.id]);

        // Get education for this candidate
        const education = await db.all(`
          SELECT * FROM candidate_education WHERE candidate_id = ?
        `, [candidate.id]);

        // Get work experience for this candidate
        const workExperience = await db.all(`
          SELECT * FROM candidate_work_experience WHERE candidate_id = ?
        `, [candidate.id]);

        return {
          id: candidate.id,
          email: candidate.email,
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          phone: candidate.phone,
          location: candidate.location,
          linkedinUrl: candidate.linkedin_url,
          portfolioUrl: candidate.portfolio_url,
          currentTitle: candidate.current_title,
          currentCompany: candidate.current_company,
          yearsExperience: candidate.years_experience,
          salaryExpectationMin: candidate.salary_expectation_min,
          salaryExpectationMax: candidate.salary_expectation_max,
          availability: candidate.availability,
          source: candidate.source,
          referrerId: candidate.referrer_id,
          isBlacklisted: Boolean(candidate.is_blacklisted),
          blacklistReason: candidate.blacklist_reason,
          skills: skills.map(skill => ({
            id: skill.id,
            candidateId: skill.candidate_id,
            skillName: skill.skill_name,
            proficiencyLevel: skill.proficiency_level,
            yearsExperience: skill.years_experience,
            isVerified: Boolean(skill.is_verified),
            extractedFrom: skill.extracted_from
          })),
          education: education.map(edu => ({
            id: edu.id,
            candidateId: edu.candidate_id,
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.field_of_study,
            startDate: edu.start_date ? new Date(edu.start_date) : undefined,
            endDate: edu.end_date ? new Date(edu.end_date) : undefined,
            gpa: edu.gpa,
            isCurrent: Boolean(edu.is_current)
          })),
          workExperience: workExperience.map(work => ({
            id: work.id,
            candidateId: work.candidate_id,
            company: work.company,
            title: work.title,
            description: work.description,
            startDate: work.start_date ? new Date(work.start_date) : undefined,
            endDate: work.end_date ? new Date(work.end_date) : undefined,
            isCurrent: Boolean(work.is_current)
          })),
          createdAt: new Date(candidate.created_at),
          updatedAt: new Date(candidate.updated_at)
        };
      })
    );

    const response: ApiResponse<PaginatedResponse<Candidate>> = {
      success: true,
      data: {
        data: candidatesResponse,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const getCandidate: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const candidate = await db.get('SELECT * FROM candidates WHERE id = ?', [id]);

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    // Get skills, education, and work experience
    const [skills, education, workExperience] = await Promise.all([
      db.all('SELECT * FROM candidate_skills WHERE candidate_id = ?', [id]),
      db.all('SELECT * FROM candidate_education WHERE candidate_id = ?', [id]),
      db.all('SELECT * FROM candidate_work_experience WHERE candidate_id = ?', [id])
    ]);

    const candidateResponse: Candidate = {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.first_name,
      lastName: candidate.last_name,
      phone: candidate.phone,
      location: candidate.location,
      linkedinUrl: candidate.linkedin_url,
      portfolioUrl: candidate.portfolio_url,
      currentTitle: candidate.current_title,
      currentCompany: candidate.current_company,
      yearsExperience: candidate.years_experience,
      salaryExpectationMin: candidate.salary_expectation_min,
      salaryExpectationMax: candidate.salary_expectation_max,
      availability: candidate.availability,
      source: candidate.source,
      referrerId: candidate.referrer_id,
      isBlacklisted: Boolean(candidate.is_blacklisted),
      blacklistReason: candidate.blacklist_reason,
      skills: skills.map(skill => ({
        id: skill.id,
        candidateId: skill.candidate_id,
        skillName: skill.skill_name,
        proficiencyLevel: skill.proficiency_level,
        yearsExperience: skill.years_experience,
        isVerified: Boolean(skill.is_verified),
        extractedFrom: skill.extracted_from
      })),
      education: education.map(edu => ({
        id: edu.id,
        candidateId: edu.candidate_id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.field_of_study,
        startDate: edu.start_date ? new Date(edu.start_date) : undefined,
        endDate: edu.end_date ? new Date(edu.end_date) : undefined,
        gpa: edu.gpa,
        isCurrent: Boolean(edu.is_current)
      })),
      workExperience: workExperience.map(work => ({
        id: work.id,
        candidateId: work.candidate_id,
        company: work.company,
        title: work.title,
        description: work.description,
        startDate: work.start_date ? new Date(work.start_date) : undefined,
        endDate: work.end_date ? new Date(work.end_date) : undefined,
        isCurrent: Boolean(work.is_current)
      })),
      createdAt: new Date(candidate.created_at),
      updatedAt: new Date(candidate.updated_at)
    };

    res.json({
      success: true,
      data: candidateResponse
    });
  } catch (error) {
    console.error('Get candidate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const createCandidate: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const candidateData = req.body;
    
    if (!candidateData.email || !candidateData.firstName || !candidateData.lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, first name, and last name are required' 
      });
    }

    const db = getDatabase();
    
    // Check if candidate already exists
    const existingCandidate = await db.get('SELECT id FROM candidates WHERE email = ?', [candidateData.email.toLowerCase()]);
    if (existingCandidate) {
      return res.status(409).json({ 
        success: false, 
        error: 'Candidate with this email already exists' 
      });
    }

    const candidateId = randomUUID();

    await db.run(`
      INSERT INTO candidates (
        id, email, first_name, last_name, phone, location, linkedin_url, portfolio_url,
        current_title, current_company, years_experience, salary_expectation_min, 
        salary_expectation_max, availability, source, referrer_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      candidateId,
      candidateData.email.toLowerCase(),
      candidateData.firstName,
      candidateData.lastName,
      candidateData.phone || null,
      candidateData.location || null,
      candidateData.linkedinUrl || null,
      candidateData.portfolioUrl || null,
      candidateData.currentTitle || null,
      candidateData.currentCompany || null,
      candidateData.yearsExperience || null,
      candidateData.salaryExpectationMin || null,
      candidateData.salaryExpectationMax || null,
      candidateData.availability || null,
      candidateData.source || 'other',
      candidateData.referrerId || null
    ]);

    // Add skills if provided
    if (candidateData.skills && Array.isArray(candidateData.skills)) {
      for (const skill of candidateData.skills) {
        await db.run(`
          INSERT INTO candidate_skills (candidate_id, skill_name, proficiency_level, years_experience, extracted_from)
          VALUES (?, ?, ?, ?, ?)
        `, [candidateId, skill.skillName, skill.proficiencyLevel || 'intermediate', skill.yearsExperience || null, skill.extractedFrom || 'manual']);
      }
    }

    // Add education if provided
    if (candidateData.education && Array.isArray(candidateData.education)) {
      for (const edu of candidateData.education) {
        await db.run(`
          INSERT INTO candidate_education (candidate_id, institution, degree, field_of_study, start_date, end_date, gpa, is_current)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          candidateId, 
          edu.institution, 
          edu.degree || null, 
          edu.fieldOfStudy || null, 
          edu.startDate ? new Date(edu.startDate).toISOString().split('T')[0] : null,
          edu.endDate ? new Date(edu.endDate).toISOString().split('T')[0] : null,
          edu.gpa || null,
          edu.isCurrent ? 1 : 0
        ]);
      }
    }

    // Add work experience if provided
    if (candidateData.workExperience && Array.isArray(candidateData.workExperience)) {
      for (const work of candidateData.workExperience) {
        await db.run(`
          INSERT INTO candidate_work_experience (candidate_id, company, title, description, start_date, end_date, is_current)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          candidateId,
          work.company,
          work.title,
          work.description || null,
          work.startDate ? new Date(work.startDate).toISOString().split('T')[0] : null,
          work.endDate ? new Date(work.endDate).toISOString().split('T')[0] : null,
          work.isCurrent ? 1 : 0
        ]);
      }
    }

    // Fetch the created candidate with all related data
    const createdCandidate = await db.get('SELECT * FROM candidates WHERE id = ?', [candidateId]);
    
    const candidateResponse: Candidate = {
      id: createdCandidate.id,
      email: createdCandidate.email,
      firstName: createdCandidate.first_name,
      lastName: createdCandidate.last_name,
      phone: createdCandidate.phone,
      location: createdCandidate.location,
      linkedinUrl: createdCandidate.linkedin_url,
      portfolioUrl: createdCandidate.portfolio_url,
      currentTitle: createdCandidate.current_title,
      currentCompany: createdCandidate.current_company,
      yearsExperience: createdCandidate.years_experience,
      salaryExpectationMin: createdCandidate.salary_expectation_min,
      salaryExpectationMax: createdCandidate.salary_expectation_max,
      availability: createdCandidate.availability,
      source: createdCandidate.source,
      referrerId: createdCandidate.referrer_id,
      isBlacklisted: Boolean(createdCandidate.is_blacklisted),
      blacklistReason: createdCandidate.blacklist_reason,
      skills: candidateData.skills || [],
      education: candidateData.education || [],
      workExperience: candidateData.workExperience || [],
      createdAt: new Date(createdCandidate.created_at),
      updatedAt: new Date(createdCandidate.updated_at)
    };

    res.status(201).json({
      success: true,
      data: candidateResponse
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const updateCandidate: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const db = getDatabase();
    
    // Check if candidate exists
    const existingCandidate = await db.get('SELECT * FROM candidates WHERE id = ?', [id]);
    if (!existingCandidate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'email', 'first_name', 'last_name', 'phone', 'location', 'linkedin_url', 
      'portfolio_url', 'current_title', 'current_company', 'years_experience',
      'salary_expectation_min', 'salary_expectation_max', 'availability', 'source'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (allowedFields.includes(dbField) && key !== 'skills' && key !== 'education' && key !== 'workExperience') {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      await db.run(`
        UPDATE candidates 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);
    }

    // Get updated candidate
    const updatedCandidate = await db.get('SELECT * FROM candidates WHERE id = ?', [id]);
    
    const candidateResponse: Candidate = {
      id: updatedCandidate.id,
      email: updatedCandidate.email,
      firstName: updatedCandidate.first_name,
      lastName: updatedCandidate.last_name,
      phone: updatedCandidate.phone,
      location: updatedCandidate.location,
      linkedinUrl: updatedCandidate.linkedin_url,
      portfolioUrl: updatedCandidate.portfolio_url,
      currentTitle: updatedCandidate.current_title,
      currentCompany: updatedCandidate.current_company,
      yearsExperience: updatedCandidate.years_experience,
      salaryExpectationMin: updatedCandidate.salary_expectation_min,
      salaryExpectationMax: updatedCandidate.salary_expectation_max,
      availability: updatedCandidate.availability,
      source: updatedCandidate.source,
      referrerId: updatedCandidate.referrer_id,
      isBlacklisted: Boolean(updatedCandidate.is_blacklisted),
      blacklistReason: updatedCandidate.blacklist_reason,
      createdAt: new Date(updatedCandidate.created_at),
      updatedAt: new Date(updatedCandidate.updated_at)
    };

    res.json({
      success: true,
      data: candidateResponse
    });
  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const deleteCandidate: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if candidate exists
    const existingCandidate = await db.get('SELECT id FROM candidates WHERE id = ?', [id]);
    if (!existingCandidate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    // Check if candidate has applications
    const applicationCount = await db.get('SELECT COUNT(*) as count FROM applications WHERE candidate_id = ?', [id]);
    if (applicationCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete candidate with existing applications' 
      });
    }

    await db.run('DELETE FROM candidates WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}; 