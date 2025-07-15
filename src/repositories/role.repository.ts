import User from "../models/User";

export const roleRepository = {
    updateUser: async (userId: string, role:string) => {
        const userReturn = await User.findByIdAndUpdate(userId, { role: role }, { new: true });
        const roleReturn = userReturn?.role
        if (!roleReturn) {
            throw new Error('Role update failed');
        }
        console.log(userReturn, roleReturn)
        return roleReturn;
    }
}