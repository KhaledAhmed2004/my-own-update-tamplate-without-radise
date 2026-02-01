import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import EventModel from './event.model';
import { IEvent } from './event.interface';

export const EventService = {
  createEventInDB: async (userId: string, payload: Record<string, any>) => {
    // Minimal validation for required fields
    if (!payload.date?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid date');
    }
    if (!payload.time?.match(/^\d{2}:\d{2}$/)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid time');
    }

    // Create event with all payload fields
    const event = await EventModel.create({
      userId,
      ...payload,
      date: new Date(`${payload.date}T00:00:00.000Z`),
    });

    return event;
  },

  listEventsForUserFromDB: async (
    userId: string,
    query: { from?: string; to?: string },
  ) => {
    const from = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : undefined;
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
    return EventModel.find({ userId, date: { $gte: from, $lte: to } });
  },

  getEventByIdFromDB: async (
    id: string,
    requester: { id: string; role: string },
  ): Promise<IEvent | null> => {
    const event = await EventModel.findById(id);
    if (!event) return null;
    if (event.userId !== requester.id && requester.role !== 'SUPER_ADMIN') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not allowed to view this event',
      );
    }
    return event;
  },

  updateEventInDB: async (
    eventId: string,
    user: { id: string; role: string },
    payload: Partial<IEvent>,
  ) => {
    // Find the event by ID
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    // Check authorization: either the owner or a SUPER_ADMIN can update
    if (event.userId !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Not authorized to update this event',
      );
    }

    // Update the event with new data
    Object.assign(event, payload);

    // Save the changes
    const updatedEvent = await event.save();

    return updatedEvent;
  },
};

// const deleteEventFromDB = async (id: string, requester: { id: string; role: string }): Promise<IEvent | null> => {
//   const event = await Event.findById(id);
//   if (!event) return null;
//   if (event.userId !== requester.id && requester.role !== 'SUPER_ADMIN') {
//     throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed to delete this event');
//   }
//   const deleted = await Event.findByIdAndDelete(id);
//   return deleted;
// };

// const listEventsForUserFromDB = async (
//   userId: string,
//   query: { from?: string; to?: string }
// ): Promise<IEvent[]> => {
//   const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
//   const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
//   return Event.findByUser(userId, { from, to });
// };

// export const EventService = {
//   createEventInDB,
//   getEventByIdFromDB,
//   updateEventInDB,
//   deleteEventFromDB,
//   listEventsForUserFromDB,
// };
