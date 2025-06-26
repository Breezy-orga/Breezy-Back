import User from "../models/User";

export const roleRepository = {
    updateUser: async (userId: string, role:string) => {
        const roleReturn = await User.findByIdAndUpdate(userId, { role });
        if (!roleReturn) {
            throw new Error('Role update failed');
        }
        return roleReturn;
    }
}