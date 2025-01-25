import { belongsTo, hasOne, hugmodel, Model } from '@martinjuul/hugorm';


@hugmodel()
export class User extends Model {

  @hasOne<User, Profile>({
    type: () => Profile,
    foreignKey: 'profileId',
  })
  profile!: Profile;

  profileId!: number;

  name!: string;
  email!: string;
}

@hugmodel()
export class Profile extends Model {
  static table = 'profiles'; // Explicit table name

  id!: number;
  bio!: string;
  userId!: number;

  @belongsTo<Profile, User>({
    type: () => User,
    foreignKey: 'userId', // Proper foreign key
  })
  user!: User;
}
