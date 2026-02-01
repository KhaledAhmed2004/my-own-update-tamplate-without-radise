import { PreferenceCardModel } from './preference-card.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import { QueryBuilder } from '../../builder';

export const PreferenceCardService = {
  incrementDownloadCountInDB: async (
    id: string,
    userId: string,
    role?: string,
  ) => {
    const doc = await PreferenceCardModel.findById(id);
    if (!doc)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Preference card not found');

    const isOwner = doc.createdBy === userId;
    const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN;
    if (!isOwner && !isSuperAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not authorized to update download count',
      );
    }

    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();
    return { downloadCount: doc.downloadCount };
  },
  createPreferenceCardInDB: async (userId: string, data: any) => {
    const dataToSave = {
      ...data,
      createdBy: userId,
    };

    const card = await PreferenceCardModel.create(dataToSave);
    return card;
  },
  listPreferenceCardsForUserFromDB: async (userId: string) => {
    const docs = await PreferenceCardModel.find({
      createdBy: userId,
    })
      .populate('supplies', 'name -_id')
      .populate('sutures', 'name -_id')
      .sort({
        updatedAt: -1,
      });

    return docs;
  },
  getPreferenceCardByIdFromDB: async (
    id: string,
    userId: string,
    role?: string,
  ) => {
    const doc = await PreferenceCardModel.findById(id);

    if (!doc) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Preference card not found');
    }

    const isOwner = doc.createdBy === userId;
    const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not authorized to access this card',
      );
    }

    return doc;
  },
  updatePreferenceCardInDB: async (
    id: string,
    userId: string,
    role: string | undefined,
    payload: Record<string, any>,
  ) => {
    // Check if the card exists and get its creator
    const existingCard =
      await PreferenceCardModel.findById(id).select('createdBy');
    if (!existingCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Preference card not found');
    }

    // Authorization check
    if (
      existingCard.createdBy.toString() !== userId &&
      role !== 'SUPER_ADMIN'
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not authorized to update this card',
      );
    }

    // Update the document in one step
    const updatedCard = await PreferenceCardModel.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true }, // return the updated doc
    );

    return updatedCard;
  },
  deletePreferenceCardFromDB: async (
    id: string,
    userId: string,
    role?: string,
  ) => {
    const doc = await PreferenceCardModel.findById(id);
    if (!doc)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Preference card not found');
    if (doc.createdBy !== userId && role !== 'SUPER_ADMIN') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not authorized to delete this card',
      );
    }
    await PreferenceCardModel.findByIdAndDelete(id);
    return { deleted: true };
  },
  listPublicPreferenceCardsFromDB: async (query?: Record<string, any>) => {
    const qb = new QueryBuilder(
      PreferenceCardModel.find({ published: true }),
      query || {},
    )
      .search(['cardTitle', 'surgeon.fullName', 'medication'])
      .filter()
      .sort()
      .paginate()
      .fields()
      .populate(['supplies', 'sutures'], {
        supplies: 'name -_id',
        sutures: 'name -_id',
      });

    const cards = await qb.modelQuery;
    const paginationInfo = await qb.getPaginationInfo();

    return {
      pagination: paginationInfo,
      data: cards,
    };
  },
};
