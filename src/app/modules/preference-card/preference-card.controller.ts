import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PreferenceCardService } from './preference-card.service';
import { JwtPayload } from 'jsonwebtoken';

export const PreferenceCardController = {
  createCard: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.createPreferenceCardInDB(
      (user as any).id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'Preference card created',
      data: result,
    });
  }),

  listMyCards: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.listPreferenceCardsForUserFromDB(
      (user as any).id,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Preference cards fetched',
      data: result,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.getPreferenceCardByIdFromDB(
      req.params.id,
      (user as any).id,
      (user as any).role,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Preference card details fetched',
      data: result,
    });
  }),

  updateCard: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.updatePreferenceCardInDB(
      req.params.id,
      (user as any).id,
      (user as any).role,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Preference card updated',
      data: result,
    });
  }),

  deleteCard: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.deletePreferenceCardFromDB(
      req.params.id,
      (user as any).id,
      (user as any).role,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Preference card deleted',
      data: result,
    });
  }),

  incrementDownloadCount: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await PreferenceCardService.incrementDownloadCountInDB(
      req.params.id,
      (user as any).id,
      (user as any).role,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Download count incremented',
      data: result,
    });
  }),

  listPublicCards: catchAsync(async (req: Request, res: Response) => {
    const cards = await PreferenceCardService.listPublicPreferenceCardsFromDB(
      req.query,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Public cards fetched successfully',
      pagination: cards.pagination,
      data: cards.data,
    });
  }),
};
