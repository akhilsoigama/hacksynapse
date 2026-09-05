  // app/models/user.ts
  import { DateTime } from 'luxon'
  import hash from '@adonisjs/core/services/hash'
  import { compose } from '@adonisjs/core/helpers'
  import { BaseModel, column, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
  import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
  import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
  import type { ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
  import { AUTH_ACCESS_TOKENS, USER_ROLES, USERS } from '#database/constants/table_names'
  import env from '#start/env'
  import Role from '#models/role'
  import Institute from '#models/institute'
  import Faculty from '#models/faculty'
  import Student from './student.js'

  const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
    uids: ['email'],
    passwordColumnName: 'password',
  })

  export default class User extends compose(BaseModel, AuthFinder) {
    public static table = USERS

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare userType: 'super_admin' | 'institute' | 'faculty' | 'student'

    @column()
    declare fullName: string | null

    @column()
    declare email: string

    @column()
    declare mobile: string

    @column({ serializeAs: null })
    declare password: string

    @column()
    declare instituteId: number 

    @column()
    declare facultyId: number | null

    @column()
    declare studentId: number | null

    @column()
    declare isEmailVerified: boolean

    @column()
    declare isMobileVerified: boolean

    @column()
    declare isActive: boolean

    @belongsTo(() => Institute)
    declare institute: BelongsTo<typeof Institute>

    @belongsTo(() => Faculty, {
      foreignKey: 'facultyId',
    })
    declare faculty: BelongsTo<typeof Faculty>
    
    @belongsTo(() => Student, {
      foreignKey: 'studentId',
    })
    declare student: BelongsTo<typeof Student>
    @manyToMany(() => Role, {
      pivotTable: USER_ROLES,
      pivotForeignKey: 'user_id',
      pivotRelatedForeignKey: 'role_id',
    })
    declare userRoles: ManyToMany<typeof Role>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null

    static accessTokens = DbAccessTokensProvider.forModel(User, {
      table: AUTH_ACCESS_TOKENS,
      expiresIn: env.get('ACCESS_TOKEN_EXPIRES_IN'),
    })

    isSuperAdmin(): boolean {
      return this.userType === 'super_admin'
    }

    isInstitute(): boolean {
      return this.userType === 'institute'
    }

    isFacultyUser(): boolean {
      return this.userType === 'faculty'
    }

    isStudent(): boolean {
      return this.userType === 'student'
    }

    get institute_id(): number | null {
      if (this.instituteId !== undefined && this.instituteId !== null) return this.instituteId
      if (this.student?.instituteId) return this.student.instituteId
      if (this.faculty?.instituteId) return this.faculty.instituteId
      return (this as any).$attributes?.institute_id ?? null
    }

    get departmentId(): number | null {
      if (this.student?.departmentId) return this.student.departmentId
      if (this.faculty?.departmentId) return this.faculty.departmentId
      return (this as any).$attributes?.department_id ?? ((this as any).$attributes?.departmentId ?? null)
    }

    get department_id(): number | null {
      return this.departmentId
    }

    get faculty_id(): number | null {
      return this.facultyId ?? ((this as any).$attributes?.faculty_id ?? null)
    }

    get student_id(): number | null {
      return this.studentId ?? ((this as any).$attributes?.student_id ?? null)
    }

    // Static method to check user permissions
    static async hasPermission(userId: number, permissionKey: string): Promise<boolean> {
      const user = await User.query()
        .where('id', userId)
        .preload('userRoles', (query) => {
          query.preload('permissions')
        })
        .first()
        
      if (!user) return false

      if (user.userType === 'super_admin') {
        return true
      }

      return user.userRoles.some(role => 
        role.permissions.some(permission => permission.permissionKey === permissionKey)
      )
    }
  }
