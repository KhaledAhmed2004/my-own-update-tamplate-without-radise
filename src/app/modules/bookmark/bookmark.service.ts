import { Bookmark } from './bookmark.model';
import { IBookmark } from './bookmark.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';

interface ToggleBookmarkResult {
  message: string;
  bookmark: IBookmark | null;
}

const toggleBookmarkIntoDB = async (
  userId: string,
  targetId: string,
  targetModel: string
): Promise<ToggleBookmarkResult> => {
  // Fetch existing bookmark only; generic across models
  const existingBookmark = await Bookmark.findOne({
    user: userId,
    target: targetId,
    targetModel,
  });

  // Remove bookmark or create new bookmark in parallel-safe way
  if (existingBookmark) {
    const removedBookmark = await Bookmark.findOneAndDelete({
      _id: existingBookmark._id,
    });
    return {
      message: 'Bookmark removed successfully',
      bookmark: removedBookmark,
    };
  } else {
    const newBookmark = await Bookmark.findOneAndUpdate(
      { user: userId, target: targetId, targetModel },
      { user: userId, target: targetId, targetModel },
      { new: true, upsert: true }
    );

    if (!newBookmark) {
      throw new ApiError(
        StatusCodes.EXPECTATION_FAILED,
        'Failed to add bookmark'
      );
    }

    return {
      message: 'Bookmark added successfully',
      bookmark: newBookmark,
    };
  }
};

const getUserBookmarksFromDB = async (
  userId: string,
  query: Record<string, any>
): Promise<{ data: IBookmark[]; pagination: any }> => {
  // Start with base query
  let modelQuery = Bookmark.find({ user: userId });

  // Allow filtering by targetModel; exclude Task-specific filters from generic filter()
  const modifiedQuery = { ...query };
  delete modifiedQuery.category;
  delete modifiedQuery.searchTerm;

  // Create QueryBuilder instance
  const queryBuilder = new QueryBuilder<IBookmark>(modelQuery, modifiedQuery)
    .filter()
    .dateFilter()
    .sort()
    .paginate()
    .fields();

  // Populate target; apply Task-specific filters only when targetModel === 'Task'
  if (query.targetModel === 'Task') {
    if (query.category && query.searchTerm) {
      queryBuilder.searchInPopulatedFields(
        'target',
        ['title', 'description', 'taskLocation'],
        query.searchTerm,
        { taskCategory: query.category }
      );
    } else if (query.category) {
      queryBuilder.populateWithMatch('target', { taskCategory: query.category });
    } else if (query.searchTerm) {
      queryBuilder.searchInPopulatedFields(
        'target',
        ['title', 'description', 'taskLocation'],
        query.searchTerm
      );
    } else {
      queryBuilder.populate(['target']);
    }
  } else {
    // Generic population for other models
    queryBuilder.populate(['target']);
  }

  // Get filtered results with custom pagination
  const result = await queryBuilder.getFilteredResults(['target']);

  return result;
};

export const BookmarkService = {
  toggleBookmarkIntoDB,
  getUserBookmarksFromDB,
};
