import messages from '#database/constants/messages'
import Assignment from '#models/assignment'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { errorHandler } from '../helper/error_handler.js'
import { createAssignmentValidator, updateAssignmentValidator } from '#validators/assignment'
import { DateTime } from 'luxon'
import AssignmentRepository from '../repositories/assignment_repository.js'
import { parseListQuery } from '../helper/list_query.js'
import apiCacheService from './api_cache_service.js'

import Student from '#models/student'
import Faculty from '#models/faculty'

@inject()
export default class AssignmentService {
  private readonly assignmentRepository = new AssignmentRepository()
  constructor(protected ctx: HttpContext) {}

  private async getAuthenticatedUser() {
    const contextUser =
      (this.ctx as any).user ||
      (this.ctx as any).authUser ||
      (this.ctx.request as any)?.user ||
      this.ctx.auth?.user

    if (contextUser) {
      return contextUser
    }

    try {
      const apiAuth = this.ctx.auth.use('api')
      const isApiAuth = await apiAuth.check()
      if (isApiAuth && apiAuth.user) {
        return apiAuth.user
      }
    } catch {}

    try {
      const adminAuth = this.ctx.auth.use('adminapi')
      const isAdminAuth = await adminAuth.check()
      if (isAdminAuth && adminAuth.user) {
        return adminAuth.user
      }
    } catch {}

    try {
      return await this.ctx.auth.authenticate()
    } catch {
      return null
    }
  }

  private async verifyAssignmentAccess(
    assignment: Assignment,
    action: 'view' | 'update' | 'delete'
  ): Promise<{ authorized: boolean; statusCode: number; message: string }> {
    const authUser = await this.getAuthenticatedUser()

    if (!authUser) {
      return {
        authorized: false,
        statusCode: 401,
        message: messages.user_not_authenticated || 'User not authenticated',
      }
    }

    const userId = Number(authUser.id)
    const rawRole = (
      authUser.userType ||
      (authUser as any).role ||
      (authUser as any).roleName ||
      ''
    )
      .toString()
      .toLowerCase()

    const isSuperAdmin =
      rawRole === 'super_admin' ||
      rawRole === 'admin' ||
      (typeof (authUser as any).isSuperAdmin === 'function' && (authUser as any).isSuperAdmin()) ||
      (Array.isArray((authUser as any).userRoles) &&
        (authUser as any).userRoles.some(
          (r: any) => (r.roleKey || r.roleName || '').toString().toLowerCase() === 'super_admin'
        ))

    const isStudent =
      rawRole === 'student' ||
      (typeof (authUser as any).isStudent === 'function' && (authUser as any).isStudent()) ||
      (Array.isArray((authUser as any).userRoles) &&
        (authUser as any).userRoles.some(
          (r: any) => (r.roleKey || r.roleName || '').toString().toLowerCase() === 'student'
        ))

    const isFaculty =
      rawRole === 'faculty' ||
      (typeof (authUser as any).isFacultyUser === 'function' && (authUser as any).isFacultyUser()) ||
      (Array.isArray((authUser as any).userRoles) &&
        (authUser as any).userRoles.some(
          (r: any) => (r.roleKey || r.roleName || '').toString().toLowerCase() === 'faculty'
        ))

    const isInstitute =
      rawRole === 'institute' ||
      (typeof (authUser as any).isInstitute === 'function' && (authUser as any).isInstitute()) ||
      (Array.isArray((authUser as any).userRoles) &&
        (authUser as any).userRoles.some(
          (r: any) => (r.roleKey || r.roleName || '').toString().toLowerCase() === 'institute'
        ))

    if (typeof (authUser as any).load === 'function') {
      if (isStudent && authUser.studentId && !authUser.student) {
        try {
          await authUser.load('student')
        } catch {}
      }
      if (isFaculty && authUser.facultyId && !authUser.faculty) {
        try {
          await authUser.load('faculty')
        } catch {}
      }
    }

    // Resolve user instituteId
    let userInstituteId: number | null = null
    const rawUserInstituteId =
      (authUser as any).institute_id ??
      authUser.instituteId ??
      authUser.student?.instituteId ??
      (authUser.student as any)?.institute_id ??
      authUser.faculty?.instituteId ??
      (authUser.faculty as any)?.institute_id

    if (rawUserInstituteId !== undefined && rawUserInstituteId !== null) {
      userInstituteId = Number(rawUserInstituteId)
    }

    if (userInstituteId === null && isStudent && authUser.studentId) {
      try {
        const student = await Student.find(authUser.studentId)
        const instId = student?.instituteId ?? (student as any)?.institute_id
        if (instId !== undefined && instId !== null) userInstituteId = Number(instId)
      } catch {}
    }

    if (userInstituteId === null && isFaculty && authUser.facultyId) {
      try {
        const faculty = await Faculty.find(authUser.facultyId)
        const instId = faculty?.instituteId ?? (faculty as any)?.institute_id
        if (instId !== undefined && instId !== null) userInstituteId = Number(instId)
      } catch {}
    }

    // Resolve user departmentId
    let userDepartmentId: number | null = null
    const rawUserDeptId =
      (authUser as any).department_id ??
      (authUser as any).departmentId ??
      authUser.student?.departmentId ??
      (authUser.student as any)?.department_id ??
      authUser.faculty?.departmentId ??
      (authUser.faculty as any)?.department_id

    if (rawUserDeptId !== undefined && rawUserDeptId !== null) {
      userDepartmentId = Number(rawUserDeptId)
    }

    if (userDepartmentId === null && isStudent && authUser.studentId) {
      try {
        const student = await Student.find(authUser.studentId)
        const deptId = student?.departmentId ?? (student as any)?.department_id
        if (deptId !== undefined && deptId !== null) userDepartmentId = Number(deptId)
      } catch {}
    }

    const assignmentInstituteId = Number(
      (assignment as any).institute_id ?? assignment.instituteId
    )
    const assignmentDepartmentId = Number(
      (assignment as any).department_id ?? assignment.departmentId
    )
    const assignmentFacultyId = Number(
      (assignment as any).faculty_id ?? assignment.facultyId
    )
    const rawCreatedBy = (assignment as any).created_by ?? assignment.createdBy
    const assignmentCreatedBy =
      rawCreatedBy !== null && rawCreatedBy !== undefined
        ? Number(rawCreatedBy)
        : null

    // A. Institute Boundary
    // record.institute_id MUST match auth.user.institute_id.
    // If the institute_id does not match, return HTTP 403 Forbidden.
    // Never allow a user to access, update, or delete another institute's Assignment by changing the URL ID.
    if (userInstituteId !== null) {
      if (assignmentInstituteId !== userInstituteId) {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: Access outside institute boundary is not permitted.',
        }
      }
    } else if (!isSuperAdmin) {
      return {
        authorized: false,
        statusCode: 403,
        message: 'Forbidden: User is not associated with an institute.',
      }
    }

    // C. Student Scope
    // If the authenticated user has role = Student:
    // - record.institute_id MUST match auth.user.institute_id.
    // - record.department_id MUST match auth.user.department_id.
    // - Student must not be able to access Assignment records belonging to another department.
    if (isStudent) {
      if (action !== 'view') {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: Students are not permitted to modify or delete assignments.',
        }
      }

      if (userDepartmentId === null || assignmentDepartmentId !== userDepartmentId) {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: Student cannot access assignments belonging to another department.',
        }
      }

      return { authorized: true, statusCode: 200, message: 'Authorized' }
    }

    // B. Ownership
    // - If the authenticated user is the creator/owner of the Assignment, record.created_by MUST match auth.user.id.
    // - Enforce ownership according to the application's existing role/authorization rules.
    // - Do not rely only on frontend filtering.
    // - Backend must always perform the authorization check.
    if (isFaculty) {
      const userFacultyId = authUser.facultyId ? Number(authUser.facultyId) : null
      if (!userFacultyId) {
        return {
          authorized: false,
          statusCode: 400,
          message: 'faculty not associated with this user.',
        }
      }

      if (assignmentFacultyId !== userFacultyId) {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: You do not own this assignment.',
        }
      }

      if (assignmentCreatedBy !== null && assignmentCreatedBy !== userId) {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: Assignment creator does not match authenticated user.',
        }
      }

      return { authorized: true, statusCode: 200, message: 'Authorized' }
    }

    if (action === 'update' || action === 'delete') {
      if (isInstitute || isSuperAdmin) {
        return { authorized: true, statusCode: 200, message: 'Authorized' }
      }

      if (assignmentCreatedBy !== null && assignmentCreatedBy !== userId) {
        return {
          authorized: false,
          statusCode: 403,
          message: 'Forbidden: You do not have permission to modify this assignment.',
        }
      }
    }

    return { authorized: true, statusCode: 200, message: 'Authorized' }
  }

  private setSecurityHeaders() {
    this.ctx.response.header('Cross-Origin-Embedder-Policy', 'credentialless')
    this.ctx.response.header('Cross-Origin-Resource-Policy', 'cross-origin')
    this.ctx.response.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  }

  private invalidateAssignmentCache() {
    apiCacheService.invalidateByPrefix('assignments:list:')
    apiCacheService.invalidateByPrefix('assignments:one:')
  }

  async findAll({ searchFor }: { searchFor?: string | null } = {}) {
    try {
      const {
        page,
        limit,
        search,
        withDeleted,
        searchFor: searchForQuery,
      } = parseListQuery(this.ctx)
      const requestFacultyId = Number(this.ctx.request.input('facultyId'))
      const authUser = await this.getAuthenticatedUser()
      const effectiveSearchFor = searchForQuery || searchFor || undefined

      let facultyId: number | undefined = undefined
      let instituteId: number | undefined = undefined
      let departmentId: number | undefined = undefined

      if (authUser?.userType === 'faculty') {
        if (!authUser.facultyId) {
          return this.ctx.response.status(400).json({
            status: false,
            message: 'faculty not associated with this user.',
            data: null,
          })
        }
        facultyId = authUser.facultyId
      } else if (Number.isFinite(requestFacultyId) && requestFacultyId > 0) {
        facultyId = requestFacultyId
      }

      if (authUser?.userType === 'institute') {
        instituteId = authUser.instituteId
      }

      if (authUser?.userType === 'student') {
        if (authUser.instituteId) {
          instituteId = authUser.instituteId
        }
        const studentDept =
          (authUser as any).department_id ??
          (authUser as any).departmentId ??
          authUser.student?.departmentId
        if (studentDept) {
          departmentId = Number(studentDept)
        }
      }

      const cacheKey = `assignments:list:${JSON.stringify({
        page,
        limit,
        search,
        withDeleted,
        facultyId,
        instituteId,
        departmentId,
        searchFor: effectiveSearchFor,
      })}`

      const paginated = await apiCacheService.getOrSet(
        cacheKey,
        30_000,
        async () => {
          return this.assignmentRepository.list(
            {
              facultyId,
              instituteId,
              departmentId,
              search,
              withDeleted,
              onlyActive: effectiveSearchFor === 'create',
            },
            page,
            limit
          )
        },
        ['assignments']
      )

      const assignment = paginated.all()
      return {
        status: assignment.length > 0,
        messages:
          assignment.length > 0
            ? messages.assignment_fetched_successfully
            : messages.assignment_not_found,
        data: assignment,
        meta: {
          total: paginated.total,
          perPage: paginated.perPage,
          currentPage: paginated.currentPage,
          lastPage: paginated.lastPage,
        },
      }
    } catch (error) {
      console.error('FindAll Error:', error)
      return {
        status: false,
        messages: messages.common_messages_error,
        error: errorHandler(error),
      }
    }
  }
  async create() {
    try {
      this.setSecurityHeaders()
      const requestData = this.ctx.request.all()
      const authUser = await this.getAuthenticatedUser()

      if (authUser?.userType === 'faculty') {
        if (!authUser.facultyId) {
          return this.ctx.response.status(400).send({
            status: false,
            message: 'faculty not associated with this user.',
          })
        }

        if (requestData.facultyId && Number(requestData.facultyId) !== authUser.facultyId) {
          return this.ctx.response.status(403).send({
            status: false,
            message: 'You can only create assignments for your own faculty.',
          })
        }

        requestData.facultyId = authUser.facultyId
      }

      const requiredFields = ['assignmentTitle', 'subject', 'assignmentFile', 'std']
      for (const field of requiredFields) {
        if (!requestData[field]) {
          return this.ctx.response.status(400).send({
            status: false,
            message: `${field} is required`,
          })
        }
      }
      const velidatedData = await createAssignmentValidator.validate(requestData)
      const existing = await Assignment.query()
        .where('institute_id', velidatedData.instituteId)
        .where('faculty_id', velidatedData.facultyId)
        .where('department_id', velidatedData.departmentId)
        .where('assignmentTitle', velidatedData.assignmentTitle)
        .where('dueDate', velidatedData.dueDate!)
        .first()

      if (existing) {
        return this.ctx.response.status(409).send({
          status: false,
          message: 'Assignment already exists for this class and date',
        })
      }

      const assignment = await Assignment.create({
        ...velidatedData,
        createdBy: authUser?.id,
        updatedBy: authUser?.id,
        isActive: velidatedData.isActive ?? true,
        dueDate: velidatedData.dueDate ? DateTime.fromJSDate(velidatedData.dueDate) : undefined,
      })

      this.invalidateAssignmentCache()

      return {
        status: true,
        messages: messages.assignemnt_created_successfully,
        data: assignment,
      }
    } catch (error) {
      return {
        status: false,
        messages: messages.common_messages_error,
        error: errorHandler(error),
      }
    }
  }
  async update() {
    try {
      this.setSecurityHeaders()
      const id = this.ctx.request.param('id')
      if (!id || Number.isNaN(Number(id))) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const existingAssignment = await Assignment.query().where('id', id).whereNull('deleted_at').first()
      if (!existingAssignment) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const access = await this.verifyAssignmentAccess(existingAssignment, 'update')
      if (!access.authorized) {
        return this.ctx.response.status(access.statusCode).send({
          status: false,
          success: false,
          message: access.message,
          data: null,
        })
      }

      const requestData = this.ctx.request.all()
      const validatedData = await updateAssignmentValidator.validate(requestData)
      const authUser = await this.getAuthenticatedUser()

      if (
        validatedData.instituteId !== undefined &&
        Number(validatedData.instituteId) !== Number(existingAssignment.instituteId)
      ) {
        return this.ctx.response.status(403).send({
          status: false,
          success: false,
          message: 'Forbidden: You cannot change assignment institute.',
          data: null,
        })
      }

      if (authUser?.userType === 'faculty') {
        if (!authUser.facultyId) {
          return this.ctx.response.status(400).send({
            status: false,
            message: 'faculty not associated with this user.',
          })
        }

        if (
          validatedData.facultyId !== undefined &&
          Number(validatedData.facultyId) !== Number(authUser.facultyId)
        ) {
          return this.ctx.response.status(403).send({
            status: false,
            success: false,
            message: 'You cannot change assignment ownership.',
            data: null,
          })
        }

        validatedData.facultyId = authUser.facultyId
      }

      const updatePayload = {
        ...validatedData,
        updatedBy: authUser?.id || existingAssignment.updatedBy,
        dueDate:
          validatedData.dueDate !== undefined
            ? validatedData.dueDate
              ? DateTime.fromJSDate(validatedData.dueDate)
              : null
            : undefined,
      }

      existingAssignment.merge(updatePayload)
      await existingAssignment.save()

      this.invalidateAssignmentCache()

      await existingAssignment.load('department')
      await existingAssignment.load('institute')
      await existingAssignment.load('faculty')
      return {
        status: true,
        messages: messages.assignment_updated_successfully,
        data: existingAssignment,
      }
    } catch (error) {
      return {
        status: false,
        messages: messages.common_messages_error,
        error: errorHandler(error),
      }
    }
  }

  async findOne() {
    try {
      this.setSecurityHeaders()
      const id = this.ctx.request.param('id')
      if (!id || Number.isNaN(Number(id))) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const assignment = await this.assignmentRepository.findById(Number(id))
      if (!assignment) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const access = await this.verifyAssignmentAccess(assignment, 'view')
      if (!access.authorized) {
        return this.ctx.response.status(access.statusCode).send({
          status: false,
          success: false,
          message: access.message,
          data: null,
        })
      }

      return {
        status: true,
        messages: messages.assignment_fetched_successfully,
        data: assignment,
      }
    } catch (error) {
      this.setSecurityHeaders()
      return {
        status: false,
        messages: messages.common_messages_error,
        error: errorHandler(error),
      }
    }
  }

  async deleteOne() {
    try {
      this.setSecurityHeaders()
      const id = this.ctx.request.param('id')
      if (!id || Number.isNaN(Number(id))) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const assignment = await Assignment.query().where('id', id).whereNull('deleted_at').first()
      if (!assignment) {
        return this.ctx.response.status(404).send({
          status: false,
          success: false,
          message: messages.assignment_not_found,
          data: null,
        })
      }

      const access = await this.verifyAssignmentAccess(assignment, 'delete')
      if (!access.authorized) {
        return this.ctx.response.status(access.statusCode).send({
          status: false,
          success: false,
          message: access.message,
          data: null,
        })
      }

      const authUser = await this.getAuthenticatedUser()
      assignment.deletedAt = DateTime.now()
      assignment.updatedBy = authUser?.id || assignment.updatedBy
      await assignment.save()

      this.invalidateAssignmentCache()

      return {
        status: true,
        messages: messages.common_messages_record_deleted,
        data: assignment,
      }
    } catch (error) {
      this.setSecurityHeaders()
      return {
        status: false,
        messages: messages.common_messages_error,
        error: errorHandler(error),
      }
    }
  }
}
