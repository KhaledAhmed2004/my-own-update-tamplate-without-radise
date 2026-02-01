import AggregationBuilder from '../../builder/AggregationBuilder';
import { User } from '../user/user.model';
import { PreferenceCardModel } from '../preference-card/preference-card.model';
import { Subscription } from '../subscription/subscription.model';
import { SUBSCRIPTION_STATUS } from '../subscription/subscription.interface';

// Dashboard metrics with growth statistics for admin
export const getAdminDashboardStats = async () => {
  // Total users (no role filter in SUPER_ADMIN-only system)
  const doctorBuilder = new AggregationBuilder(User as any);
  const doctors = await doctorBuilder.calculateGrowth({
    // No role filter; all users counted
    period: 'month',
  });

  // Total preference cards
  const cardBuilder = new AggregationBuilder(PreferenceCardModel as any);
  const preferenceCards = await cardBuilder.calculateGrowth({
    period: 'month',
  });

  // Verified (published) preference cards
  const verifiedPreferenceCards = await cardBuilder.calculateGrowth({
    filter: { published: true },
    period: 'month',
  });

  // Active subscriptions
  const subBuilder = new AggregationBuilder(Subscription as any);
  const activeSubscriptions = await subBuilder.calculateGrowth({
    filter: { status: SUBSCRIPTION_STATUS.ACTIVE },
    period: 'month',
  });

  return {
    summary: {
      doctors,
      preferenceCards,
      verifiedPreferenceCards,
      activeSubscriptions,
    },
  };
};
