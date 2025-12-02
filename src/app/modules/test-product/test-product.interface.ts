import { Model, Types } from 'mongoose';

export enum TEST_PRODUCT_CATEGORY {
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  BOOKS = 'BOOKS',
}

export type ITestProduct = {
  title: string;
  price: number;
  category: TEST_PRODUCT_CATEGORY;
  seller: Types.ObjectId;
  images?: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TestProductModel = Model<ITestProduct>;
