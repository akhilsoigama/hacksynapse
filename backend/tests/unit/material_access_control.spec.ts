import { test } from '@japa/runner'
import Material from '#models/material'
import MaterialService from '#services/material_service'
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

test.group('Material Model Getters', () => {
  test('material exposes snake_case property getters matching camelCase columns', ({ assert }) => {
    const material = new Material()
    material.instituteId = 10
    material.departmentId = 20
    material.facultyId = 30
    material.createdBy = 40
    material.updatedBy = 50

    assert.equal(material.institute_id, 10)
    assert.equal(material.department_id, 20)
    assert.equal(material.faculty_id, 30)
    assert.equal(material.created_by, 40)
    assert.equal(material.updated_by, 50)
  })
})

test.group('Material ID-Wise Access Control: verifyMaterialAccess', () => {
  function makeMaterial(overrides: Partial<Material> = {}): Material {
    const m = new Material()
    m.id = 1
    m.title = 'Test Study Material'
    m.instituteId = 100
    m.departmentId = 200
    m.facultyId = 300
    m.createdBy = 400
    Object.assign(m, overrides)
    return m
  }

  test('Test 1 — Same institute: Creator can view, update, and delete material', async ({ assert }) => {
    const user = {
      id: 400,
      instituteId: 100,
      userType: 'faculty',
      facultyId: 300,
    }
    const { ctx } = createMockContext(user)
    const service = new MaterialService(ctx)
    const material = makeMaterial()

    const viewAccess = await (service as any).verifyMaterialAccess(material, 'view')
    assert.isTrue(viewAccess.authorized)
    assert.equal(viewAccess.statusCode, 200)

    const updateAccess = await (service as any).verifyMaterialAccess(material, 'update')
    assert.isTrue(updateAccess.authorized)

    const deleteAccess = await (service as any).verifyMaterialAccess(material, 'delete')
    assert.isTrue(deleteAccess.authorized)
  })

  test('Test 2 — Different institute: User from Institute B gets 403 Forbidden', async ({ assert }) => {
    const user = {
      id: 500,
      instituteId: 999, // Different institute!
      userType: 'faculty',
      facultyId: 600,
    }
    const { ctx } = createMockContext(user)
    const service = new MaterialService(ctx)
    const material = makeMaterial() // Institute 100

    const access = await (service as any).verifyMaterialAccess(material, 'view')
    assert.isFalse(access.authorized)
    assert.equal(access.statusCode, 403)
    assert.include(access.message, 'institute boundary')
  })

  test('Test 2b — Different institute on PUT and DELETE returns 403 Forbidden', async ({ assert }) => {
    const user = {
      id: 500,
      instituteId: 999,
      userType: 'institute',
    }
    const { ctx } = createMockContext(user)
    const service = new MaterialService(ctx)
    const material = makeMaterial()

    const updateAccess = await (service as any).verifyMaterialAccess(material, 'update')
    assert.isFalse(updateAccess.authorized)
    assert.equal(updateAccess.statusCode, 403)

    const deleteAccess = await (service as any).verifyMaterialAccess(material, 'delete')
    assert.isFalse(deleteAccess.authorized)
    assert.equal(deleteAccess.statusCode, 403)
  })

  test('Test 3 — Different owner: Faculty B cannot modify Faculty A material', async ({ assert }) => {
    const user = {
      id: 777,
      instituteId: 100, // Same institute
      userType: 'faculty',
      facultyId: 888, // Different faculty/owner
    }
    const { ctx } = createMockContext(user)
    const service = new MaterialService(ctx)
    const material = makeMaterial({ createdBy: 400, facultyId: 300 })

    const updateAccess = await (service as any).verifyMaterialAccess(material, 'update')
    assert.isFalse(updateAccess.authorized)
    assert.equal(updateAccess.statusCode, 403)

    const deleteAccess = await (service as any).verifyMaterialAccess(material, 'delete')
    assert.isFalse(deleteAccess.authorized)
    assert.equal(deleteAccess.statusCode, 403)
  })

  test('Test 4 — Student department: Student from Department X cannot access Department Y material', async ({ assert }) => {
    const studentUser = {
      id: 900,
      instituteId: 100,
      userType: 'student',
      departmentId: 999, // Department X
    }
    const { ctx } = createMockContext(studentUser)
    const service = new MaterialService(ctx)
    const material = makeMaterial({ instituteId: 100, departmentId: 200 }) // Department Y

    const access = await (service as any).verifyMaterialAccess(material, 'view')
    assert.isFalse(access.authorized)
    assert.equal(access.statusCode, 403)
    assert.include(access.message, 'another department')
  })

  test('Test 4b — Student department: Student can view material matching their department', async ({ assert }) => {
    const studentUser = {
      id: 900,
      instituteId: 100,
      userType: 'student',
      departmentId: 200, // Matches material department
    }
    const { ctx } = createMockContext(studentUser)
    const service = new MaterialService(ctx)
    const material = makeMaterial({ instituteId: 100, departmentId: 200 })

    const access = await (service as any).verifyMaterialAccess(material, 'view')
    assert.isTrue(access.authorized)
    assert.equal(access.statusCode, 200)
  })

  test('Test 5 — Student cannot modify or delete material (403 Forbidden)', async ({ assert }) => {
    const studentUser = {
      id: 900,
      instituteId: 100,
      userType: 'student',
      departmentId: 200,
    }
    const { ctx } = createMockContext(studentUser)
    const service = new MaterialService(ctx)
    const material = makeMaterial({ instituteId: 100, departmentId: 200 })

    const updateAccess = await (service as any).verifyMaterialAccess(material, 'update')
    assert.isFalse(updateAccess.authorized)
    assert.equal(updateAccess.statusCode, 403)

    const deleteAccess = await (service as any).verifyMaterialAccess(material, 'delete')
    assert.isFalse(deleteAccess.authorized)
    assert.equal(deleteAccess.statusCode, 403)
  })

  test('Institute admin can view, update, and delete materials within their institute', async ({ assert }) => {
    const instituteUser = {
      id: 111,
      instituteId: 100,
      userType: 'institute',
    }
    const { ctx } = createMockContext(instituteUser)
    const service = new MaterialService(ctx)
    const material = makeMaterial({ instituteId: 100, createdBy: 400 })

    const viewAccess = await (service as any).verifyMaterialAccess(material, 'view')
    assert.isTrue(viewAccess.authorized)

    const updateAccess = await (service as any).verifyMaterialAccess(material, 'update')
    assert.isTrue(updateAccess.authorized)

    const deleteAccess = await (service as any).verifyMaterialAccess(material, 'delete')
    assert.isTrue(deleteAccess.authorized)
  })
})

test.group('Material ID-Wise API Responses (Not Found & Validation)', () => {
  test('findOne returns 404 Not Found when ID is non-numeric', async ({ assert }) => {
    const { ctx, getSentStatus } = createMockContextWithParam('invalid-id')
    const service = new MaterialService(ctx)
    await service.findOne()
    assert.equal(getSentStatus(), 404)
  })

  test('updateOne returns 404 Not Found when ID is non-numeric', async ({ assert }) => {
    const { ctx, getSentStatus } = createMockContextWithParam('abc')
    const service = new MaterialService(ctx)
    await service.updateOne()
    assert.equal(getSentStatus(), 404)
  })

  test('deleteOne returns 404 Not Found when ID is non-numeric', async ({ assert }) => {
    const { ctx, getSentStatus } = createMockContextWithParam('xyz')
    const service = new MaterialService(ctx)
    await service.deleteOne()
    assert.equal(getSentStatus(), 404)
  })
})
