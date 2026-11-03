import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isAdminAccount } from '../types';
import {
  FOOD_CHECKIN_REWARD_TARGET,
  applyCheckIn,
  ledgerProgress,
  loadLedgerForUser,
  markLedgerGranted,
  saveLedgerForUser,
  setFoodCheckInHandler,
} from '../utils/foodCheckInReward';

/**
 * Invisible controller for the "taste 30 dishes -> 30 days VIP" reward:
 *  - receives every "I tried it" stamp (registered handler, answers synchronously so the button shows an accurate message),
 *  - keeps the per-account ledger (each dish once, at most 3 per day),
 *  - asks the app to grant the one-time reward when the 30th dish is counted,
 *  - safety net: if the target was reached but the grant never completed (app closed in between) it retries on next launch.
 * Admin accounts and guests are never eligible. The grant itself is idempotent (see grantFoodCheckInReward).
 */
export const FoodCheckInRewardBootstrap: React.FC = () => {
  const { currentUser, grantFoodCheckInReward } = useApp();
  const latest = useRef({ currentUser, grantFoodCheckInReward });
  latest.current = { currentUser, grantFoodCheckInReward };
  const inFlight = useRef(false);

  const runGrant = useCallback(async () => {
    const user = latest.current.currentUser;
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await latest.current.grantFoodCheckInReward();
      // Success OR "already granted": either way the local ledger must never ask again.
      if (res.success || res.alreadyGranted) markLedgerGranted(user.id, user.legacyIds || []);
    } catch {
      // grant failed: the ledger stays at the target and the retry below / next stamp will try again
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    setFoodCheckInHandler((foodId) => {
      const user = latest.current.currentUser;
      if (!user || isAdminAccount(user) || user.isDisabled) return { kind: 'ineligible' };
      const legacy = user.legacyIds || [];
      const ledger = loadLedgerForUser(user.id, legacy);

      // The account flag is the authoritative "already rewarded" signal (it syncs across devices).
      if (user.foodCheckInRewardAt) {
        if (!ledger.grantedAt) markLedgerGranted(user.id, legacy, user.foodCheckInRewardAt);
        return { kind: 'already_granted' };
      }

      const { ledger: next, outcome } = applyCheckIn(ledger, foodId, new Date());
      if (next.entries.length !== ledger.entries.length) saveLedgerForUser(user.id, next);
      if (outcome.kind === 'reached') void runGrant();
      return outcome;
    });
    return () => setFoodCheckInHandler(null);
  }, [runGrant]);

  // Reconcile on launch / account switch.
  useEffect(() => {
    if (!currentUser || isAdminAccount(currentUser) || currentUser.isDisabled) return;
    const legacy = currentUser.legacyIds || [];
    const ledger = loadLedgerForUser(currentUser.id, legacy);
    if (currentUser.foodCheckInRewardAt) {
      if (!ledger.grantedAt) markLedgerGranted(currentUser.id, legacy, currentUser.foodCheckInRewardAt);
      return;
    }
    if (!ledger.grantedAt && ledgerProgress(ledger) >= FOOD_CHECKIN_REWARD_TARGET) void runGrant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.foodCheckInRewardAt]);

  return null;
};
