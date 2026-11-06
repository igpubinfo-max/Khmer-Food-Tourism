import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isAdminAccount } from '../types';
import { tr } from '../utils/i18n';
import { isSupabaseConfigured, pullCloudDocument } from '../services/supabaseService';
import {
  FOOD_CHECKIN_CLOUD_CLAIMS_KEY,
  FOOD_CHECKIN_DAILY_CAP,
  FOOD_CHECKIN_REWARD_TARGET,
  FOOD_CHECKIN_REWARD_VIP_DAYS,
  applyCheckIn,
  findExistingRewardClaimAt,
  getFreeTrialStatus,
  getVerifiedServerNowMs,
  isRealIsoTimestamp,
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
 * Invisible controller for the Free 30-Day VIP Trial & "taste 30 dishes -> 30 days VIP" reward:
 *  - synchronizes the authoritative internet server clock (never trusting `new Date()` device clock),
 *  - reconciles and self-heals existing users' Free Trial / VIP activation date, expiry date, and remaining days
 *    across local storage, User records, and Supabase/Secondary Cloud by both User ID and Email,
 *  - keeps the per-account ledger synced to the backend User record,
 *  - grants the one-time reward when the 30th dish is counted or heals an unpersisted activation.
 */
export const FoodCheckInRewardBootstrap: React.FC = () => {
  const { currentUser, grantFoodCheckInReward, syncUserCheckInLedgerToBackend, showToast, language } = useApp();
  const latest = useRef({
    currentUser,
    grantFoodCheckInReward,
    syncUserCheckInLedgerToBackend,
    showToast,
    language,
  });
  latest.current = {
    currentUser,
    grantFoodCheckInReward,
    syncUserCheckInLedgerToBackend,
    showToast,
    language,
  };
  const inFlight = useRef(false);

  const runGrant = useCallback(async (silentHeal = false) => {
    const user = latest.current.currentUser;
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await latest.current.grantFoodCheckInReward({ silentHeal });
      if (res.success || res.alreadyGranted) {
        const verifiedMs = getVerifiedServerNowMs() || (await syncVerifiedServerClock());
        const liveUser = latest.current.currentUser || user;
        const atIso =
          (isRealIsoTimestamp(liveUser.freeTrialActivatedAt) ? liveUser.freeTrialActivatedAt : undefined) ||
          (isRealIsoTimestamp(liveUser.foodCheckInRewardAt) ? liveUser.foodCheckInRewardAt : undefined) ||
          (verifiedMs ? new Date(verifiedMs).toISOString() : new Date().toISOString());
        const expIso =
          liveUser.freeTrialExpiresAt ||
          liveUser.subscriptionExpiryDate ||
          liveUser.vipExpiresAt;
        recordFoodCheckInRewardClaim(
          {
            userId: liveUser.id,
            legacyIds: liveUser.legacyIds || [],
            email: liveUser.email,
            foodCheckInRewardAt: atIso,
            freeTrialActivatedAt: atIso,
            freeTrialExpiresAt: expIso,
          },
          atIso,
          undefined,
          expIso,
          FOOD_CHECKIN_REWARD_VIP_DAYS
        );
      }
    } catch {
      // grant failed: will retry on next launch/sync
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
      const ledger = loadLedgerForUser(user.id, legacy, user.foodCheckInLedger);

      const trialStatus = getFreeTrialStatus(user);
      if (trialStatus.hasEverActivated) {
        if (!ledger.grantedAt && trialStatus.activatedAt) {
          markLedgerGranted(user.id, legacy, trialStatus.activatedAt);
        }
        return { kind: 'already_granted' };
      }

      const verifiedMs = getVerifiedServerNowMs();
      const { ledger: next, outcome } = applyCheckIn(ledger, foodId, verifiedMs);
      if (next.entries.length !== ledger.entries.length) {
        saveLedgerForUser(user.id, next);
        latest.current.syncUserCheckInLedgerToBackend(next);
      }
      if (outcome.kind === 'reached') void runGrant(false);

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
          const latestLedger = loadLedgerForUser(
            liveUser.id,
            liveUser.legacyIds || [],
            liveUser.foodCheckInLedger
          );
          const retry = applyCheckIn(latestLedger, foodId, freshMs);
          if (retry.ledger.entries.length !== latestLedger.entries.length) {
            saveLedgerForUser(liveUser.id, retry.ledger);
            latest.current.syncUserCheckInLedgerToBackend(retry.ledger);
          }
          if (retry.outcome.kind === 'reached') {
            void runGrant(false);
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

  // Reconcile on launch / account switch / cloud sync:
  // 1. Pull cloud claim lock by User ID & Email.
  // 2. Sync any cloud foodCheckInLedger into local storage.
  // 3. Self-heal existing users whose Free Trial / VIP entitlement was activated so it never resets to 0/30.
  useEffect(() => {
    if (!currentUser || isAdminAccount(currentUser) || currentUser.isDisabled) return;
    let cancelled = false;
    const legacy = currentUser.legacyIds || [];

    const reconcile = async () => {
      await syncVerifiedServerClock();
      let cloudReg: RewardClaimRegistry | null = null;
      if (isSupabaseConfigured()) {
        cloudReg = await pullCloudDocument<RewardClaimRegistry>(FOOD_CHECKIN_CLOUD_CLAIMS_KEY, 6000);
        if (cloudReg) {
          saveLocalClaimRegistry(mergeClaimRegistries(loadLocalClaimRegistry(), cloudReg));
        }
      }
      if (cancelled) return;

      // Merge cloud user ledger with local ledger so dish check-ins survive app updates and reinstalls
      const mergedLedger = loadLedgerForUser(currentUser.id, legacy, currentUser.foodCheckInLedger);
      if (mergedLedger.entries.length > 0 || mergedLedger.grantedAt) {
        saveLedgerForUser(currentUser.id, mergedLedger);
      }

      const status = getFreeTrialStatus(currentUser, cloudReg);

      // If the user has an active or previously activated trial that needs backend/user-record healing, heal immediately
      if (status.needsBackendHeal) {
        await runGrant(true);
        return;
      }

      if (status.hasEverActivated && status.activatedAt) {
        recordFoodCheckInRewardClaim(
          {
            userId: currentUser.id,
            legacyIds: legacy,
            email: currentUser.email,
            foodCheckInRewardAt: status.activatedAt,
            freeTrialActivatedAt: status.activatedAt,
            freeTrialExpiresAt: status.expiresAt,
          },
          status.activatedAt,
          cloudReg,
          status.expiresAt,
          status.totalDays
        );
        return;
      }

      const claimedAt = findExistingRewardClaimAt(
        {
          userId: currentUser.id,
          legacyIds: legacy,
          email: currentUser.email,
          foodCheckInRewardAt: currentUser.foodCheckInRewardAt,
          freeTrialActivatedAt: currentUser.freeTrialActivatedAt,
          freeTrialExpiresAt: currentUser.freeTrialExpiresAt,
        },
        cloudReg
      );
      if (claimedAt && isRealIsoTimestamp(claimedAt)) {
        await runGrant(true);
        return;
      }

      if (!mergedLedger.grantedAt && ledgerProgress(mergedLedger) >= FOOD_CHECKIN_REWARD_TARGET) {
        void runGrant(false);
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser?.id,
    currentUser?.email,
    currentUser?.foodCheckInRewardAt,
    currentUser?.freeTrialActivated,
    currentUser?.subscriptionExpiryDate,
  ]);

  return null;
};
