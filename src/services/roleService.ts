import { roleRepository } from "../repositories/role.repository";

export class RoleService {
  static async updateUserRole(userId: string, role: string) {
    const roleReturn = await roleRepository.updateUser(userId, role);
    if (!roleReturn) {
      throw new Error('Role update failed');
    }
    return roleReturn;
  }
}