import { test } from '@japa/runner'
import Assignment from '#models/assignment'
import User from '#models/user'
import Student from '#models/student'
import Faculty from '#models/faculty'
import AssignmentService from '#services/assignment_service'
import type { HttpContext } from '@adonisjs/core/http'

function createMockContext(user: any): {
  ctx: HttpContext
  getSentStatus: () => number | undefined
  getSentData: () => any
} {
  let sentStatus: number | undefined
  let sentData: any

  const ctx = {
    auth: {
      user,
      authenticate: async () => user,
      use: () => ({
        check: async () => !!user,
        user,
      }),
    },
    user,
    authUser: user,
    request: {
      user,
      param: (name: string) => (name === 'id' ? '1' : undefined),
      all: () => ({}),
      input: () => undefined,
    },
    response: {
      header: () => {},
      status: (code: number) => {
        sentStatus = code
        return {
          send: (data: any) => {
            sentData = data
            return data
          },
          json: (data: any) => {
            sentData = data
            return data
          },
        }
      },
    },
  } as unknown as HttpContext

  return { ctx, getSentStatus: () => sentStatus, getSentData: () => sentData }
}

function createMockContextWithParam(idParam: string, user: any = { id: 1, userType: 'super_admin' }): {
  ctx: HttpContext
  getSentStatus: () => number | undefined
  getSentData: () => any
} {
  let sentStatus: number | undefined
  let sentData: any

  const ctx = {
    auth: {
      user,
      authenticate: async () => user,
      use: () => ({
        check: async () => !!user,
        user,
      }),
    },
    user,
    authUser: user,
    request: {
      param: (name: string) => (name === 'id' ? idParam : undefined),
      all: () => ({}),
      input: () => undefined,
    },
    response: {
      header: () => {},
      status: (code: number) => {
        sentStatus = code
        return {
          send: (data: any) => {
            sentData = data
            return data
          },
          json: (data: any) => {
            sentData = data
            return data
          },
        }
      },
    },
  } as unknown as HttpContext

  return { ctx, getSentStatus: () => sentStatus, getSentData: () => sentData }
}

test.group('Assignment Model Getters', () => {
  test('assignment exposes snake_case property getters matching camelCase columns', ({ assert }) => {
    const assignment = new Assignment()
    assignment.instituteId = 10
    assignment.departmentId = 20
    assignment.facultyId = 30
    assignment.createdBy = 40
    assignment.updatedBy = 50

    assert.equal(assignment.institute_id, 10)
    assert.equal(assignment.department_id, 20)
    assert.equal(assignment.faculty_id, 30)
    assert.equal(assignment.created_by, 40)
    assert.equal(assignment.updated_by, 50)
  })

  test('user exposes snake_case property getters for institute_id and department_id', ({ assert }) => {
    const user = new User()
    user.instituteId = 15
    user.facultyId = 25
    user.studentId = 35

    assert.equal(user.institute_id, 15)
    assert.equal(user.faculty_id, 25)
    assert.equal(user.student_id, 35)
  })

  test('student and faculty models expose institute_id and department_id getters', ({ assert }) => {
    const student = new Student()
    student.instituteId = 101
    student.departmentId = 202
    assert.equal(student.institute_id, 101)
    assert.equal(student.department_id, 202)

    const faculty = new Faculty()
    faculty.instituteId = 303
    faculty.departmentId = 404
    assert.equal(faculty.institute_id, 303)
    assert.equal(faculty.department_id, 404)
  })
})

test.group('Assignment ID-Wise Access Control: verifyAssignmentAccess', () => {
  test('A. Institute Boundary: Returns 403 Forbidden when record.institute_id does not match auth.user.institute_id', async ({
    assert,
  }) => {
    const user = {
      id: 2,
      userType: 'faculty',
      instituteId: 1,
      facultyId: 5,
    }
    const { ctx } = createMockContext(user)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 2 // Different institute
    assignment.departmentId = 10
    assignment.facultyId = 5
    assignment.createdBy = 2

    const result = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isFalse(result.authorized)
    assert.equal(result.statusCode, 403)
    assert.include(result.message, 'Forbidden')
  })

  test('A. Institute Boundary: Returns 403 on PUT and DELETE when user belongs to another institute', async ({
    assert,
  }) => {
    const user = {
      id: 2,
      userType: 'faculty',
      instituteId: 1,
      facultyId: 5,
    }
    const { ctx } = createMockContext(user)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 999 // Different institute
    assignment.departmentId = 10
    assignment.facultyId = 5
    assignment.createdBy = 2

    const putResult = await (service as any).verifyAssignmentAccess(assignment, 'update')
    assert.isFalse(putResult.authorized)
    assert.equal(putResult.statusCode, 403)

    const deleteResult = await (service as any).verifyAssignmentAccess(assignment, 'delete')
    assert.isFalse(deleteResult.authorized)
    assert.equal(deleteResult.statusCode, 403)
  })

  test('A. Institute Boundary: Non-super-admin without institute is blocked with 403 Forbidden', async ({
    assert,
  }) => {
    const userWithoutInstitute = {
      id: 99,
      userType: 'faculty',
      instituteId: null,
      facultyId: null,
    }
    const { ctx } = createMockContext(userWithoutInstitute)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 1
    assignment.instituteId = 1
    assignment.departmentId = 5
    assignment.facultyId = 5

    const result = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isFalse(result.authorized)
    assert.equal(result.statusCode, 403)
  })

  test('C. Student Scope: Returns 403 Forbidden when student accesses assignment from another department', async ({
    assert,
  }) => {
    const studentUser = {
      id: 3,
      userType: 'student',
      instituteId: 1,
      departmentId: 10,
    }
    const { ctx } = createMockContext(studentUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 20 // Different department
    assignment.facultyId = 5

    const result = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isFalse(result.authorized)
    assert.equal(result.statusCode, 403)
    assert.include(result.message, 'department')
  })

  test('C. Student Scope: Allows student to view assignment when institute and department match', async ({
    assert,
  }) => {
    const studentUser = {
      id: 3,
      userType: 'student',
      instituteId: 1,
      departmentId: 10,
    }
    const { ctx } = createMockContext(studentUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 10 // Same department
    assignment.facultyId = 5

    const result = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isTrue(result.authorized)
    assert.equal(result.statusCode, 200)
  })

  test('C. Student Scope: Returns 403 Forbidden when student attempts PUT or DELETE', async ({
    assert,
  }) => {
    const studentUser = {
      id: 3,
      userType: 'student',
      instituteId: 1,
      departmentId: 10,
    }
    const { ctx } = createMockContext(studentUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 10
    assignment.facultyId = 5

    const putResult = await (service as any).verifyAssignmentAccess(assignment, 'update')
    assert.isFalse(putResult.authorized)
    assert.equal(putResult.statusCode, 403)

    const deleteResult = await (service as any).verifyAssignmentAccess(assignment, 'delete')
    assert.isFalse(deleteResult.authorized)
    assert.equal(deleteResult.statusCode, 403)
  })

  test('B. Ownership: Returns 403 Forbidden when faculty accesses or modifies another faculty assignment', async ({
    assert,
  }) => {
    const facultyUser = {
      id: 10,
      userType: 'faculty',
      instituteId: 1,
      facultyId: 5,
    }
    const { ctx } = createMockContext(facultyUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 10
    assignment.facultyId = 9 // Other faculty
    assignment.createdBy = 12

    const viewResult = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isFalse(viewResult.authorized)
    assert.equal(viewResult.statusCode, 403)

    const updateResult = await (service as any).verifyAssignmentAccess(assignment, 'update')
    assert.isFalse(updateResult.authorized)
    assert.equal(updateResult.statusCode, 403)

    const deleteResult = await (service as any).verifyAssignmentAccess(assignment, 'delete')
    assert.isFalse(deleteResult.authorized)
    assert.equal(deleteResult.statusCode, 403)
  })

  test('B. Ownership: Returns 403 Forbidden if record.created_by does not match auth.user.id for faculty', async ({
    assert,
  }) => {
    const facultyUser = {
      id: 10,
      userType: 'faculty',
      instituteId: 1,
      facultyId: 5,
    }
    const { ctx } = createMockContext(facultyUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 10
    assignment.facultyId = 5 // Same facultyId
    assignment.createdBy = 99 // Different user ID

    const viewResult = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isFalse(viewResult.authorized)
    assert.equal(viewResult.statusCode, 403)
  })

  test('B. Ownership: Allows faculty owner/creator to view, update, and delete assignment', async ({
    assert,
  }) => {
    const facultyUser = {
      id: 10,
      userType: 'faculty',
      instituteId: 1,
      facultyId: 5,
    }
    const { ctx } = createMockContext(facultyUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 100
    assignment.instituteId = 1
    assignment.departmentId = 10
    assignment.facultyId = 5
    assignment.createdBy = 10

    const viewResult = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isTrue(viewResult.authorized)
    assert.equal(viewResult.statusCode, 200)

    const updateResult = await (service as any).verifyAssignmentAccess(assignment, 'update')
    assert.isTrue(updateResult.authorized)
    assert.equal(updateResult.statusCode, 200)

    const deleteResult = await (service as any).verifyAssignmentAccess(assignment, 'delete')
    assert.isTrue(deleteResult.authorized)
    assert.equal(deleteResult.statusCode, 200)
  })

  test('A & B: Institute admin can view, update, and delete assignments in their institute', async ({
    assert,
  }) => {
    const instituteUser = {
      id: 8,
      userType: 'institute',
      instituteId: 1,
    }
    const { ctx } = createMockContext(instituteUser)
    const service = new AssignmentService(ctx)

    const assignment = new Assignment()
    assignment.id = 1
    assignment.instituteId = 1
    assignment.departmentId = 5
    assignment.facultyId = 12
    assignment.createdBy = 15

    const viewResult = await (service as any).verifyAssignmentAccess(assignment, 'view')
    assert.isTrue(viewResult.authorized)
    assert.equal(viewResult.statusCode, 200)

    const updateResult = await (service as any).verifyAssignmentAccess(assignment, 'update')
    assert.isTrue(updateResult.authorized)
    assert.equal(updateResult.statusCode, 200)

    const deleteResult = await (service as any).verifyAssignmentAccess(assignment, 'delete')
    assert.isTrue(deleteResult.authorized)
    assert.equal(deleteResult.statusCode, 200)
  })

  test('Support snake_case attributes (auth.user.institute_id, auth.user.department_id)', async ({
    assert,
  }) => {
    const studentSnakeCase = {
      id: 5,
      userType: 'student',
      institute_id: 3,
      department_id: 7,
    }
    const { ctx } = createMockContext(studentSnakeCase)
    const service = new AssignmentService(ctx)

    const matchingAssignment = {
      id: 50,
      institute_id: 3,
      department_id: 7,
      faculty_id: 2,
      created_by: 1,
    } as unknown as Assignment

    const nonMatchingDept = {
      id: 51,
      institute_id: 3,
      department_id: 9,
      faculty_id: 2,
      created_by: 1,
    } as unknown as Assignment

    const nonMatchingInst = {
      id: 52,
      institute_id: 4,
      department_id: 7,
      faculty_id: 2,
      created_by: 1,
    } as unknown as Assignment

    const matchRes = await (service as any).verifyAssignmentAccess(matchingAssignment, 'view')
    assert.isTrue(matchRes.authorized)
    assert.equal(matchRes.statusCode, 200)

    const deptMismatchRes = await (service as any).verifyAssignmentAccess(nonMatchingDept, 'view')
    assert.isFalse(deptMismatchRes.authorized)
    assert.equal(deptMismatchRes.statusCode, 403)

    const instMismatchRes = await (service as any).verifyAssignmentAccess(nonMatchingInst, 'view')
    assert.isFalse(instMismatchRes.authorized)
    assert.equal(instMismatchRes.statusCode, 403)
  })
})

test.group('Assignment ID-Wise API Responses (Not Found & Validation)', () => {
  test('findOne returns 404 Not Found when ID parameter is invalid or not a number', async ({ assert }) => {
    const { ctx, getSentStatus, getSentData } = createMockContextWithParam('abc')
    const service = new AssignmentService(ctx)

    await service.findOne()
    assert.equal(getSentStatus(), 404)
    assert.isFalse(getSentData().status)
  })

  test('update returns 404 Not Found when ID parameter is invalid or not a number', async ({ assert }) => {
    const { ctx, getSentStatus, getSentData } = createMockContextWithParam('invalid')
    const service = new AssignmentService(ctx)

    await service.update()
    assert.equal(getSentStatus(), 404)
    assert.isFalse(getSentData().status)
  })

  test('deleteOne returns 404 Not Found when ID parameter is invalid or not a number', async ({ assert }) => {
    const { ctx, getSentStatus, getSentData } = createMockContextWithParam('invalid')
    const service = new AssignmentService(ctx)

    await service.deleteOne()
    assert.equal(getSentStatus(), 404)
    assert.isFalse(getSentData().status)
  })
})
