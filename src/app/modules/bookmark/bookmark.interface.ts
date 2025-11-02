import { Types } from 'mongoose';

export interface IBookmark {
  user: Types.ObjectId;
  target: Types.ObjectId;
  targetModel: string;
  createdAt?: Date;
  updatedAt?: Date;
}
