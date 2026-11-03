import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isAdminAccount } from '../types';
import { tr } from '../utils/i18n';
import { isSupabaseConfigured, pullCloudDocument } from '../services/supabaseService';
import {
  FOOD_CHECKIN_CLOUD_CLAIMS_KEY,
  FOOD_CHECKIN_DAILY_CAP,
  FOOD_CHECKIN_REWARD_TARGET,
  applyCheckIn,
  findExistingRewardClaimAt,
  getVerifiedServerNowMs,
  ledgerProgress,
  loadLedgerForUser,
  loadLocalClaimRegistry,
  markLedgerGranted,
  mergeClaimRegistries,
  recordFoodCheckInRewardClaim,
  saveLedgerForUser,
  saveLocalClaimRegistry,
  setFoodCheckInHandler,
  syncVerifiedServerClock,
  type RewardClaimRegistry,
} from '../utils/foodCheckInReward';

/**
 * Invisible controller for the "taste 30 dishes -> 30 days VIP" reward:
 *  - synchronizes the authoritative internet server clock (never trusting `new Date()` device clock),
 *  - reconciles the one-time reward lock across local storage and Supabase Cloud by both User ID and Email,
 *  - keeps the per-account ledger (each dish once, max 1 check-in per server day),
 *  - asks the app to grant the one-time reward when the 30th dish is counted.
 * Admin accounts and guests are never eligible. The grant itself is idempotent (see grantFoodCheckInReward).
 */
export const FoodCheckInRewardBootstrap: React.FC = () => {
  const { currentUser, grantFoodCheckInReward, showToast, language } = useApp();
  const latest = useRef({ currentUser, grantFoodCheckInReward, showToast, language });
  latest.current = { currentUser, grantFoodCheckInReward, showToast, language };
  const inFlight = useRef(false);

  const runGrant = useCallback(async () => {
    const user = latest.current.currentUser;
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await latest.current.grantFoodCheckInReward();
      // Success OR "already granted": either way the local ledger and claim lock must never ask again.
      if (res.success || res.alreadyGranted) {
        const verifiedMs = getVerifiedServerNowMs() || (await syncVerifiedServerClock());
        const atIso = user.foodCheckInRewardAt || (verifiedMs ? new Date(verifiedMs).toISOString() : 'granted');
        recordFoodCheckInRewardClaim(
          {
            userId: user.id,
            legacyIds: user.legacyIds || [],
            email: user.email,
            foodCheckInRewardAt: user.foodCheckInRewardAt,
          },
          atIso
        );
      }
    } catch {
      // grant failed: the ledger stays at the target and the retry below / next stamp will try again
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Keep the verified internet server clock warm on launch, resume, and network reconnect.
  useEffect(() => {
    void syncVerifiedServerClock();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncVerifiedServerClock();
      }
    };
    const onOnline = () => {
      void syncVerifiedServerClock();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    setFoodCheckInHandler((foodId) => {
      const user = latest.current.currentUser;
      if (!user || isAdminAccount(user) || user.isDisabled) return { kind: 'ineligible' };
      const legacy = user.legacyIds || [];
      const ledger = loadLedgerForUser(user.id, legacy);

      const claimedAt = findExistingRewardClaimAt({
        userId: user.id,
        legacyIds: legacy,
        email: user.email,
        foodCheckInRewardAt: user.foodCheckInRewardAt,
      });
      if (claimedAt) {
        if (!ledger.grantedAt) markLedgerGranted(user.id, legacy, claimedAt);
        return { kind: 'already_granted' };
      }

      const verifiedMs = getVerifiedServerNowMs();
      const { ledger: next, outcome } = applyCheckIn(ledger, foodId, verifiedMs);
      if (next.entries.length !== ledger.entries.length) saveLedgerForUser(user.id, next);
      if (outcome.kind === 'reached') void runGrant();

      // If the monotonic server clock anchor had not finished warming up yet, verify immediately over the network.
      if (outcome.kind === 'unverified_time') {
        void syncVerifiedServerClock().then((freshMs) => {
          const liveUser = latest.current.currentUser;
          if (!liveUser || liveUser.id !== user.id || isAdminAccount(liveUser) || liveUser.isDisabled) return;
          if (!freshMs) {
            latest.current.showToast(
              tr(
                latest.current.language,
                'សូមភ្ជាប់អ៊ីនធឺណិត ដើម្បីផ្ទៀងផ្ទាត់ម៉ោង Server សម្រាប់រាប់ពិន្ទុរង្វាន់ Free VIP ៣០ថ្ងៃ (១ ថ្ងៃ រាប់បាន ១ ដង)',
                'Connect to the internet to verify server time for Free 30-Day VIP points (1 per day)',
                '请连接网络以验证服务器时间并累计 VIP 奖励积分（每天限 1 次）'
              ),
              'warning'
            );
            return;
          }
          const latestLedger = loadLedgerForUser(liveUser.id, liveUser.legacyIds || []);
          const retry = applyCheckIn(latestLedger, foodId, freshMs);
          if (retry.ledger.entries.length !== latestLedger.entries.length) {
            saveLedgerForUser(liveUser.id, retry.ledger);
          }
          if (retry.outcome.kind === 'reached') {
            void runGrant();
          } else if (retry.outcome.kind === 'counted') {
            latest.current.showToast(
              tr(
                latest.current.language,
                `បានកត់ត្រាពិន្ទុរង្វាន់ Free VIP ៣០ថ្ងៃ៖ ${retry.outcome.progress}/${FOOD_CHECKIN_REWARD_TARGET} (ថ្ងៃនេះ ${retry.outcome.todayCount}/${FOOD_CHECKIN_DAILY_CAP})`,
                `Free 30-Day VIP progress recorded: ${retry.outcome.progress}/${FOOD_CHECKIN_REWARD_TARGET} (today ${retry.outcome.todayCount}/${FOOD_CHECKIN_DAILY_CAP})`,
                `已记录 VIP 奖励进度：${retry.outcome.progress}/${FOOD_CHECKIN_REWARD_TARGET}（今日 ${retry.outcome.todayCount}/${FOOD_CHECKIN_DAILY_CAP}）`
              ),
              'success'
            );
          }
        });
      }

      return outcome;
    });
    return () => setFoodCheckInHandler(null);
  }, [runGrant]);

  // Reconcile on launch / account switch, including pulling the cloud claim lock by User ID & Email.
  useEffect(() => {
    if (!currentUser || isAdminAccount(currentUser) || currentUser.isDisabled) return;
    let cancelled = false;
    const legacy = currentUser.legacyIds || [];

    const reconcile = async () => {
      let cloudReg: RewardClaimRegistry | null = null;
      if (isSupabaseConfigured()) {
        cloudReg = await pullCloudDocument<RewardClaimRegistry>(FOOD_CHECKIN_CLOUD_CLAIMS_KEY, 6000);
        if (cloudReg) {
          saveLocalClaimRegistry(mergeClaimRegistries(loadLocalClaimRegistry(), cloudReg));
        }
      }
      if (cancelled) return;

      const ledger = loadLedgerForUser(currentUser.id, legacy);
      const claimedAt = findExistingRewardClaimAt(
        {
          userId: currentUser.id,
          legacyIds: legacy,
          email: currentUser.email,
          foodCheckInRewardAt: currentUser.foodCheckInRewardAt,
        },
        cloudReg
      );
      if (claimedAt) {
        recordFoodCheckInRewardClaim(
          {
            userId: currentUser.id,
            legacyIds: legacy,
            email: currentUser.email,
            foodCheckInRewardAt: claimedAt,
          },
          claimedAt,
          cloudReg
        );
        return;
      }
      if (!ledger.grantedAt && ledgerProgress(ledger) >= FOOD_CHECKIN_REWARD_TARGET) {
        void runGrant();
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.email, currentUser?.foodCheckInRewardAt]);

  return null;
};
