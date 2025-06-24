import bcrypt from 'bcrypt';
import User, { IUser } from '../models/User';

export const UserRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  },

  async createUser(username: string, email: string, password: string): Promise<IUser> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const incrementedUserId = await User.countDocuments() + 1; 
    const user = new User({ username, email, password: hashedPassword, userId: incrementedUserId });
    return user.save();
  },
  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    return user;
  },
  async deleteUser(userId: string): Promise<IUser | null> {
    const user = await User.findByIdAndDelete(userId);
    return user;
  },

  async comparePassword(user: IUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  },

  async findById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
  ,
  async findAll(): Promise<IUser[]> {
    return User.find({});
  }
  ,
  async findMentionnedUsers(usernames: string[], userId: string): Promise<IUser[]> {
    return await User.find({
      username: { $in: usernames },
      _id: { $ne: userId } // Exclure l'auteur du post
    });
  }
  ,
  async findByUsernamesUnlessIds(usernames: string[], unlessIds: string[]): Promise<IUser[]> {
    return await User.find({
      username: { $in: usernames },
      _id: { $nin: unlessIds }
    });
  }
  ,
  async getSuggestions(userId: string, followingIds: string[]): Promise<IUser[]> {
    return await User.find({
      _id: { $nin: [...followingIds, userId] }
    })
      .select('username name profilePicture')
      .limit(5);
  },
  async getUserByIdSelectAndPopulate(userId: string, selectFields: string, populateFields: string[]): Promise<IUser | null> {
    return await User.findById(userId)
      .select(selectFields)
      .populate(populateFields);
  }
};