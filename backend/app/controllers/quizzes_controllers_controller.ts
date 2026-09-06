import QuizzesService from '#services/quizzes_service'
import { inject } from '@adonisjs/core'
import { PermissionKeys } from '#database/constants/permission'
import User from '#models/user'

import type { HttpContext } from '@adonisjs/core/http'
@inject()
export default class QuizzesControllersController {
  constructor(protected quizzesService: QuizzesService) {}

  async index({ request }: HttpContext) {
    const searchFor = request.input('searchFor')
    return this.quizzesService.findAll({ searchFor })
  }

  async store({ auth, response }: HttpContext) {
    const user = auth.user as User | undefined

    if (!user) {
      return response.unauthorized({ success: false, message: 'User not authenticated' })
    }

    const allowed = await User.hasPermission(user.id, PermissionKeys.QUIZ_CREATE)
    if (!allowed) {
      return response.forbidden({
        success: false,
        message: 'You do not have permission to create quizzes',
      })
    }

    return this.quizzesService.create()
  }

  async show() {
    return this.quizzesService.findOne()
  }

  async update({ auth, response }: HttpContext) {
    const user = auth.user as User | undefined

    if (!user) {
      return response.unauthorized({ success: false, message: 'User not authenticated' })
    }

    const allowed = await User.hasPermission(user.id, PermissionKeys.QUIZ_UPDATE)
    if (!allowed) {
      return response.forbidden({
        success: false,
        message: 'You do not have permission to update quizzes',
      })
    }

    return this.quizzesService.update()
  }

  async destroy({ auth, response }: HttpContext) {
    const user = auth.user as User | undefined

    if (!user) {
      return response.unauthorized({ success: false, message: 'User not authenticated' })
    }

    const allowed = await User.hasPermission(user.id, PermissionKeys.QUIZ_DELETE)
    if (!allowed) {
      return response.forbidden({
        success: false,
        message: 'You do not have permission to delete quizzes',
      })
    }

    return this.quizzesService.delete()
  }
}

