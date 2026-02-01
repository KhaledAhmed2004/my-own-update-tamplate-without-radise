import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import SubscriptionService from './subscription.service';
import { JwtPayload } from 'jsonwebtoken';
import { SUBSCRIPTION_PLAN } from './subscription.interface';

export const getMySubscriptionController = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user as JwtPayload;
  const result = await SubscriptionService.getMySubscription(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription retrieved successfully',
    data: result,
  });
});

export const createCheckoutSessionController = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user as JwtPayload;
  const { plan, successUrl, cancelUrl } = req.body as {
    plan: SUBSCRIPTION_PLAN;
    successUrl?: string;
    cancelUrl?: string;
  };
  const result = await SubscriptionService.createCheckoutSession(id, plan, successUrl, cancelUrl);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Checkout session created successfully',
    data: result,
  });
});

export const createPortalSessionController = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user as JwtPayload;
  const { returnUrl } = req.body as { returnUrl?: string };
  const result = await SubscriptionService.createPortalSession(id, returnUrl);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Billing portal session created successfully',
    data: result,
  });
});

export const chooseFreePlanController = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user as JwtPayload;
  const result = await SubscriptionService.setFreePlan(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Switched to Free plan successfully',
    data: result,
  });
});

const SubscriptionController = {
  getMySubscriptionController,
  createCheckoutSessionController,
  createPortalSessionController,
  chooseFreePlanController,
};

export default SubscriptionController;