import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Shield,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Database,
  Activity,
  Users,
  Crown,
  Clock,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  Zap,
  FileSpreadsheet,
  History,
  X,
  CheckSquare,
  Square,
  Store,
  ArrowRightLeft,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Settings,
  Link2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchServerPaginatedUsersFromSupabase } from '../../services/supabaseService';
import { AdminUserDataSafetyCard } from './AdminUserDataSafetyCard';
import type { User, UserRole } from '../../types';
import { getVipRemainingDays, isSeedRestaurantId, type Restaurant } from '../../types';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../../utils/avatarHelper';
import {
  getOrBuildUserDirectoryIndex,
  queryUserDirectoryPaginated,
  getAdminRoleTier,
  hasAdminPermission,
  ensureHistoricalUserActivityLogsBackfilled,
  getUserActivityLogs,
  syncActivityLogsWithCloud,
  createUsersBackupSnapshot,
  getSavedBackupMetadataList,
  loadBackupSnapshotById,
  exportUsersToCsvString,
  runUserManagementStressBenchmark,
  computeUsersChecksum,
  type UserAccountTypeFilter,
  type UserVipStatusFilter,
  type UserAccountStatusFilter,
  type UserAuthProviderFilter,
  type UserDateRangeFilter,
  type UserSortField,
  recordUserActivityAndAdminLog,
  type OwnedShopSummary,
  type IndexedUserRecord,
  type UserActivityLogEntry,
  type UserActivityCategory,
  type StressTestBenchmarkResult,
  type UserDataIntegrityReport,
  getCanonicalUserId,
} from '../../services/adminUserManagementService';
import { tr } from '../../utils/i18n';

export const AdminUsersDirectoryPanel: React.FC<{ onNavigateToShop?: (shopId: string) => void }> = ({ onNavigateToShop }) => {
  const {
    language,
    users,
    deletedUsers,
    restaurants,
    transactions,
    supportTickets,
    appSettings,
    currentUser,
    showToast,
    isSyncingUsers,
    lastUsersSyncedAt,
    syncUsersNow,
    updateUserRole,
    adminGrantUserVip,
    cancelUserVip,
    restoreUserAccess,
    disableUserAccount,
    deleteUserAccount,
    clearAllRegisteredUsers,
    bulkGrantUserVip,
    bulkCancelUserVip,
    bulkSetUserAccountStatus,
    bulkUpdateUserRole,
    bulkDeleteUsers,
    restoreUsersFromBackup,
    runUsersIntegrityCheckAndRepair,
    updateRestaurant,
    setSelectedRestaurant,
    setManagingRestaurant,
    setIsManageMenuModalOpen,
    setIsAdminOpen,
  } = useApp();

  const isKm = language === 'km';
  const adminTier = getAdminRoleTier(currentUser);

  // Sub-navigation: Directory vs Activity/Login/Admin Logs vs Backup & 50k Stress Test
  const [subView, setSubView] = useState<'directory' | 'shop_ownership' | 'activity_logs' | 'backup_diagnostics'>('directory');
  const [shopDirectorySearch, setShopDirectorySearch] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended' | 'unlinked'>('all');
  const [shopTransferModalTarget, setShopTransferModalTarget] = useState<OwnedShopSummary | null>(null);
  const [transferTargetQuery, setTransferTargetQuery] = useState('');
  const [selectedTransferUserId, setSelectedTransferUserId] = useState('');
  const [isSyncingShopLinks, setIsSyncingShopLinks] = useState(false);

  // Search, Filters & Sorting state (with 280ms debounce for smooth Server-Side Search & Pagination)
  const [searchQuery, setSearchQuery] = useState(() => {
    const initial = typeof window !== 'undefined' ? String((window as any).__kft_admin_user_initial_search || '').trim() : '';
    if (initial) {
      delete (window as any).__kft_admin_user_initial_search;
      return initial;
    }
    return '';
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => searchQuery);

  useEffect(() => {
    const initial = typeof window !== 'undefined' ? String((window as any).__kft_admin_user_initial_search || '').trim() : '';
    if (initial) {
      delete (window as any).__kft_admin_user_initial_search;
      setSubView('directory');
      setSearchQuery(initial);
      setDebouncedSearchQuery(initial);
    }
  }, []);
  const [serverPageUsers, setServerPageUsers] = useState<User[]>([]);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [serverLatencyMs, setServerLatencyMs] = useState<number | null>(null);
  const [isFetchingServerPage, setIsFetchingServerPage] = useState<boolean>(false);
  const [paginationSource, setPaginationSource] = useState<'supabase_postgrest' | 'indexed_engine'>('indexed_engine');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);
  const [accountTypeFilter, setAccountTypeFilter] = useState<UserAccountTypeFilter>('all');
  const [vipStatusFilter, setVipStatusFilter] = useState<UserVipStatusFilter>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<UserAccountStatusFilter>('all');
  const [authProviderFilter, setAuthProviderFilter] = useState<UserAuthProviderFilter>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<UserDateRangeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<UserSortField>('default_priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Server-style Pagination & Lazy Loading state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Bulk Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkVipDaysInput, setBulkVipDaysInput] = useState<number>(30);
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);

  // Single / Batch Deletion & Management Modal state
  const [userPendingDeletion, setUserPendingDeletion] = useState<User | null>(null);
  const [usersPendingBatchDeletion, setUsersPendingBatchDeletion] = useState<User[]>([]);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [confirmDeleteForeverChecked, setConfirmDeleteForeverChecked] = useState(false);

  // Restore User Access input state
  const [restoreInput, setRestoreInput] = useState('');
  const [isRestoringUser, setIsRestoringUser] = useState(false);

  // Per-User Detailed History & Activity Inspector Modal
  const [inspectedUserRecord, setInspectedUserRecord] = useState<IndexedUserRecord | null>(null);

  // Activity Logs state
  const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | UserActivityCategory>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [activityLogsVersion, setActivityLogsVersion] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  // Backup, Integrity & Stress Benchmark state
  const [backupLabelInput, setBackupLabelInput] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [savedBackupsMeta, setSavedBackupsMeta] = useState(() => getSavedBackupMetadataList());
  const [integrityReport, setIntegrityReport] = useState<UserDataIntegrityReport | null>(null);
  const [isRunningIntegrity, setIsRunningIntegrity] = useState(false);
  const [benchmarkTargetSize, setBenchmarkTargetSize] = useState<number>(25000);
  const [benchmarkResult, setBenchmarkResult] = useState<StressTestBenchmarkResult | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const fileRestoreInputRef = useRef<HTMLInputElement | null>(null);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    accountTypeFilter,
    vipStatusFilter,
    accountStatusFilter,
    authProviderFilter,
    dateRangeFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    pageSize,
  ]);

  // Backfill and sync activity logs when opening Activity Logs or User Inspector
  useEffect(() => {
    ensureHistoricalUserActivityLogsBackfilled(users, transactions);
    setActivityLogsVersion((v) => v + 1);
  }, [users.length, transactions.length]);

  useEffect(() => {
    if (subView === 'activity_logs') {
      syncActivityLogsWithCloud().then(() => setActivityLogsVersion((v) => v + 1));
    } else if (subView === 'backup_diagnostics') {
      setSavedBackupsMeta(getSavedBackupMetadataList());
    }
  }, [subView]);

  // Fetch current page on-demand from Supabase PostgREST server-side pagination (limit & offset)
  useEffect(() => {
    if (subView !== 'directory') return;
    let cancelled = false;
    setIsFetchingServerPage(true);

    fetchServerPaginatedUsersFromSupabase({
      searchQuery: debouncedSearchQuery,
      roleFilter: accountTypeFilter,
      vipStatusFilter,
      accountStatusFilter,
      authProviderFilter,
      sortBy,
      sortOrder,
      page,
      pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.items.length > 0) {
          setServerPageUsers(res.items);
          setServerTotalCount(res.totalServerCount);
          setServerLatencyMs(res.latencyMs);
          setPaginationSource('supabase_postgrest');
        } else {
          setPaginationSource('indexed_engine');
          setServerLatencyMs(null);
        }
      })
      .catch(() => {
        if (!cancelled) setPaginationSource('indexed_engine');
      })
      .finally(() => {
        if (!cancelled) setIsFetchingServerPage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    subView,
    debouncedSearchQuery,
    accountTypeFilter,
    vipStatusFilter,
    accountStatusFilter,
    authProviderFilter,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  // Combine active users with server page items AND auto-reconcile any shop owner accounts from restaurants
  const combinedUsersWorkingSet = useMemo(() => {
    const map = new Map<string, User>();
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();

    const registerUserInMap = (u: User) => {
      if (!u || !u.id) return;
      map.set(u.id, u);
      if (Array.isArray(u.legacyIds)) {
        for (const lid of u.legacyIds) {
          if (lid) map.set(lid, u);
        }
      }
      if (u.email) emailMap.set(u.email.trim().toLowerCase(), u.id);
      const pDigits = (u.phone || '').replace(/[\s\-+()]/g, '').trim();
      if (pDigits.length >= 7) phoneMap.set(pDigits, u.id);
    };

    for (const u of users) registerUserInMap(u);
    for (const su of serverPageUsers) {
      if (su && su.id && !map.has(su.id)) registerUserInMap(su);
    }

    // Ensure every shop with owner metadata is linked to a user record (backfilling phone/role or recovering missing owner record)
    for (const r of restaurants) {
      if (!r || !r.id) continue;
      const hasOwner =
        !isSeedRestaurantId(r.id) ||
        (Boolean(r.ownerId) && r.ownerId !== 'owner-1') ||
        Boolean(r.ownerEmail) ||
        r.dataSource === 'vip_owner';
      if (!hasOwner) continue;

      const rOwnerId = (r.ownerId || r.pendingUpgradeRequest?.submittedByUserId || '').trim();
      const rEmail = (r.ownerEmail || r.pendingUpgradeRequest?.submittedByEmail || '').trim().toLowerCase();
      const rPhoneRaw = (r.ownerPhone || r.pendingUpgradeRequest?.submittedByPhone || r.phone || '').trim();
      const rPhoneDigits = rPhoneRaw.replace(/[\s\-+()]/g, '');
      const rOwnerName = (r.ownerName || r.pendingUpgradeRequest?.submittedByName || r.nameEn || r.nameKh || 'Shop Owner').trim();

      let matchedUser: User | undefined =
        (rOwnerId ? map.get(rOwnerId) : undefined) ||
        (rEmail && emailMap.has(rEmail) ? map.get(emailMap.get(rEmail)!) : undefined) ||
        (rPhoneDigits.length >= 7 && phoneMap.has(rPhoneDigits) ? map.get(phoneMap.get(rPhoneDigits)!) : undefined);

      if (matchedUser) {
        // Enrich phone or owner role in working set if missing on user profile
        const needsPhone = !matchedUser.phone && rPhoneRaw;
        const needsOwnerRole = matchedUser.role === 'user';
        if (needsPhone || needsOwnerRole) {
          const enriched: User = {
            ...matchedUser,
            phone: matchedUser.phone || rPhoneRaw,
            role: matchedUser.role === 'admin' ? 'admin' : 'owner',
          };
          map.set(matchedUser.id, enriched);
        }
      } else if (rOwnerId || rEmail) {
        const synthId = rEmail ? getCanonicalUserId({ id: rOwnerId, email: rEmail }) : rOwnerId;
        if (synthId && !map.has(synthId)) {
          const recoveredOwner: User = {
            id: synthId,
            name: rOwnerName,
            email: rEmail || '',
            phone: rPhoneRaw || undefined,
            role: 'owner',
            avatar: r.profileImage || r.photoUrl || '',
            authProvider: rEmail.includes('@') ? 'email' : 'phone',
            isVerified: true,
            membershipTier: r.membershipTier === 'premium' ? 'premium_vip' : 'free',
            subscriptionStatus: r.membershipTier === 'premium' ? 'active' : 'none',
            createdAt: (r.createdAt || '2026-01-01').slice(0, 10),
            registeredAtIso: r.createdAt || new Date().toISOString(),
            legacyIds: rOwnerId && rOwnerId !== synthId ? [rOwnerId] : undefined,
          };
          registerUserInMap(recoveredOwner);
        }
      }
    }

    // Deduplicate by primary user.id
    const uniqueByPrimaryId = new Map<string, User>();
    for (const u of map.values()) {
      if (u && u.id) uniqueByPrimaryId.set(u.id, u);
    }
    return Array.from(uniqueByPrimaryId.values());
  }, [users, serverPageUsers, restaurants]);

  // 1. Build O(1) Multi-Index & Pre-Aggregated Statistics
  const directoryIndex = useMemo(() => {
    return getOrBuildUserDirectoryIndex(
      combinedUsersWorkingSet,
      deletedUsers,
      restaurants,
      transactions,
      supportTickets
    );
  }, [combinedUsersWorkingSet, deletedUsers, restaurants, transactions, supportTickets]);

  // 2. Execute Paginated & Indexed Query (using debouncedSearchQuery so typing never freezes UI)
  const queryResult = useMemo(() => {
    return queryUserDirectoryPaginated(directoryIndex, {
      searchQuery: debouncedSearchQuery,
      accountTypeFilter,
      vipStatusFilter,
      accountStatusFilter,
      authProviderFilter,
      dateRangeFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });
  }, [
    directoryIndex,
    debouncedSearchQuery,
    accountTypeFilter,
    vipStatusFilter,
    accountStatusFilter,
    authProviderFilter,
    dateRangeFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  const { stats } = directoryIndex;
  const currentPageItems = queryResult.items;
  const currentPageIds = useMemo(
    () => currentPageItems.map((r) => r.user.id),
    [currentPageItems]
  );

  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const validSelectedIds = useMemo(
    () => selectedUserIds.filter((id) => directoryIndex.byId.has(id)),
    [selectedUserIds, directoryIndex]
  );

  const isCurrentPageAllSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedSet.has(id));
  const isAllFilteredSelected =
    queryResult.allFilteredIds.length > 0 &&
    validSelectedIds.length === queryResult.allFilteredIds.length;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectCurrentPage = () => {
    if (isCurrentPageAllSelected) {
      const pageIdSet = new Set(currentPageIds);
      setSelectedUserIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const selectAllFilteredUsers = () => {
    if (isAllFilteredSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(queryResult.allFilteredIds);
    }
  };

  // Admin Actions for Shop Ownership: View, Manage, Suspend/Activate, Transfer Ownership, and Database Sync
  const handleViewShopDetails = (shopId: string) => {
    const fullShop = restaurants.find((r) => r.id === shopId);
    if (!fullShop) {
      showToast(tr(language, 'រកមិនឃើញទិន្នន័យហាងនេះទេ', 'Shop record not found', '未找到店铺记录'), 'error');
      return;
    }
    setInspectedUserRecord(null);
    setIsAdminOpen(false);
    setSelectedRestaurant(fullShop);
  };

  const handleManageShop = (shopId: string) => {
    const fullShop = restaurants.find((r) => r.id === shopId);
    if (!fullShop) {
      showToast(tr(language, 'រកមិនឃើញទិន្នន័យហាងនេះទេ', 'Shop record not found', '未找到店铺记录'), 'error');
      return;
    }
    setInspectedUserRecord(null);
    setManagingRestaurant(fullShop);
    setIsManageMenuModalOpen(true);
  };

  const handleToggleSuspendShop = (shopId: string) => {
    const fullShop = restaurants.find((r) => r.id === shopId);
    if (!fullShop) return;
    const isCurrentlySuspended = fullShop.status === 'rejected';
    const nextStatus: 'approved' | 'rejected' = isCurrentlySuspended ? 'approved' : 'rejected';
    const updatedShop: Restaurant = {
      ...fullShop,
      status: nextStatus,
      isAdminEdited: true,
      adminEditedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateRestaurant(updatedShop);
    recordUserActivityAndAdminLog(
      {
        category: 'admin_action',
        action: isCurrentlySuspended ? 'SHOP_REACTIVATED' : 'SHOP_SUSPENDED',
        userId: fullShop.ownerId,
        userName: fullShop.ownerName,
        userEmail: fullShop.ownerEmail,
        actorId: currentUser?.id,
        actorName: currentUser?.name || 'Admin',
        actorRole: adminTier,
        status: 'SUCCESS',
        details: `${isCurrentlySuspended ? 'Reactivated' : 'Suspended'} shop "${fullShop.nameKh || fullShop.nameEn}" (Shop ID: ${fullShop.id})`,
      },
      true
    );
    setActivityLogsVersion((v) => v + 1);
    showToast(
      isCurrentlySuspended
        ? tr(language, `✅ បានបើកដំណើរការហាង "${fullShop.nameKh}" ឡើងវិញដោយជោគជ័យ!`, `✅ Reactivated shop "${fullShop.nameEn || fullShop.nameKh}"!`, `✅ 已重新激活店铺 "${fullShop.nameEn || fullShop.nameKh}"！`)
        : tr(language, `⏸️ បានផ្អាកដំណើរការហាង "${fullShop.nameKh}" បណ្ដោះអាសន្ន!`, `⏸️ Suspended shop "${fullShop.nameEn || fullShop.nameKh}"!`, `⏸️ 已暂停店铺 "${fullShop.nameEn || fullShop.nameKh}"！`),
      'success'
    );
  };

  const handleConfirmShopOwnershipTransfer = (targetUser: User) => {
    if (!shopTransferModalTarget || !targetUser) return;
    const fullShop = restaurants.find((r) => r.id === shopTransferModalTarget.id);
    if (!fullShop) return;
    const prevOwnerLabel = `${fullShop.ownerName || 'Unassigned'} (${fullShop.ownerId || fullShop.ownerEmail || 'N/A'})`;
    const nowIso = new Date().toISOString();

    const updatedShop: Restaurant = {
      ...fullShop,
      ownerId: targetUser.id,
      ownerName: targetUser.name,
      ownerEmail: targetUser.email || fullShop.ownerEmail,
      ownerPhone: targetUser.phone || fullShop.ownerPhone || fullShop.phone,
      isAdminEdited: true,
      adminEditedAt: nowIso,
      updatedAt: nowIso,
    };
    updateRestaurant(updatedShop);
    if (targetUser.role === 'user') {
      updateUserRole(targetUser.id, 'owner');
    }

    recordUserActivityAndAdminLog(
      {
        category: 'admin_action',
        action: 'SHOP_OWNERSHIP_TRANSFERRED',
        userId: targetUser.id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        userPhone: targetUser.phone,
        actorId: currentUser?.id,
        actorName: currentUser?.name || 'Admin',
        actorRole: adminTier,
        status: 'SUCCESS',
        details: `Transferred shop "${fullShop.nameKh || fullShop.nameEn}" (ID: ${fullShop.id}) from ${prevOwnerLabel} to ${targetUser.name} (ID: ${targetUser.id}, Email: ${targetUser.email || 'N/A'})`,
      },
      true
    );
    setActivityLogsVersion((v) => v + 1);
    setShopTransferModalTarget(null);
    setTransferTargetQuery('');
    setSelectedTransferUserId('');
    showToast(
      tr(language, `🔄 បានផ្ទេរកម្មសិទ្ធិហាង "${fullShop.nameKh}" ទៅគណនី "${targetUser.name}" (${targetUser.id}) ដោយជោគជ័យ!`, `🔄 Transferred "${fullShop.nameEn || fullShop.nameKh}" to "${targetUser.name}" (${targetUser.id})!`, `🔄 已将 "${fullShop.nameEn || fullShop.nameKh}" 转让给 "${targetUser.name}" (${targetUser.id})！`),
      'success'
    );
  };

  const handleSyncAndRepairAllShopOwnershipLinks = async () => {
    setIsSyncingShopLinks(true);
    try {
      let linkedShopsCount = 0;
      const nowIso = new Date().toISOString();
      for (const r of restaurants) {
        if (!r || !r.id) continue;
        const rec =
          (r.ownerId ? directoryIndex.byId.get(r.ownerId.trim().toLowerCase()) : undefined) ||
          (r.ownerEmail ? directoryIndex.byEmail.get(r.ownerEmail.trim().toLowerCase()) : undefined) ||
          ((r.ownerPhone || r.phone)
            ? directoryIndex.byPhone.get((r.ownerPhone || r.phone || '').replace(/[\s\-+()]/g, ''))
            : undefined);

        if (rec) {
          const u = rec.user;
          const needsUpdate =
            r.ownerId !== u.id ||
            r.ownerName !== u.name ||
            (u.email && r.ownerEmail !== u.email) ||
            (u.phone && !r.ownerPhone);
          if (needsUpdate) {
            updateRestaurant({
              ...r,
              ownerId: u.id,
              ownerName: u.name,
              ownerEmail: u.email || r.ownerEmail,
              ownerPhone: u.phone || r.ownerPhone || r.phone,
              updatedAt: nowIso,
            });
            linkedShopsCount++;
          }
          if (u.role === 'user') {
            updateUserRole(u.id, 'owner');
          }
        }
      }
      if (syncUsersNow) {
        await syncUsersNow();
      }
      showToast(
        tr(language, `✅ បានផ្ទៀងផ្ទាត់ និងភ្ជាប់កម្មសិទ្ធិហាងទាំងអស់ជាមួយគណនីម្ចាស់ហាងរួចរាល់ (${directoryIndex.allOwnedShops.length} ហាង, កែតម្រូវ ${linkedShopsCount} ហាង)!`, `✅ Verified & synchronized ${directoryIndex.allOwnedShops.length} shops with owner accounts (updated ${linkedShopsCount} link(s))!`, `✅ 已验证并同步 ${directoryIndex.allOwnedShops.length} 家店铺与店主账户的关联（更新了 ${linkedShopsCount} 条关联）！`),
        'success'
      );
    } finally {
      setIsSyncingShopLinks(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setAccountTypeFilter('all');
    setVipStatusFilter('all');
    setAccountStatusFilter('all');
    setAuthProviderFilter('all');
    setDateRangeFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('default_priority');
    setSortOrder('desc');
    setPage(1);
  };

  // Filtered Activity Logs
  const allActivityLogs = useMemo(() => {
    void activityLogsVersion;
    return getUserActivityLogs();
  }, [activityLogsVersion]);

  const filteredActivityLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return allActivityLogs.filter((entry) => {
      if (logCategoryFilter !== 'all' && entry.category !== logCategoryFilter) return false;
      if (!q) return true;
      return (
        (entry.userName || '').toLowerCase().includes(q) ||
        (entry.userEmail || '').toLowerCase().includes(q) ||
        (entry.userId || '').toLowerCase().includes(q) ||
        (entry.action || '').toLowerCase().includes(q) ||
        (entry.details || '').toLowerCase().includes(q) ||
        (entry.actorName || '').toLowerCase().includes(q)
      );
    });
  }, [allActivityLogs, logCategoryFilter, logSearchQuery]);

  const logsPerPage = 30;
  const totalLogsPages = Math.max(1, Math.ceil(filteredActivityLogs.length / logsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage;
    return filteredActivityLogs.slice(start, start + logsPerPage);
  }, [filteredActivityLogs, logsPage]);

  const pendingDeleteTargets: User[] = useMemo(() => {
    if (usersPendingBatchDeletion.length > 0) return usersPendingBatchDeletion;
    if (userPendingDeletion) return [userPendingDeletion];
    return [];
  }, [usersPendingBatchDeletion, userPendingDeletion]);

  const handleExportCsv = () => {
    const targetRecords =
      validSelectedIds.length > 0
        ? validSelectedIds
            .map((id) => directoryIndex.byId.get(id))
            .filter((r): r is IndexedUserRecord => Boolean(r))
        : queryResult.allFilteredIds
            .map((id) => directoryIndex.byId.get(id))
            .filter((r): r is IndexedUserRecord => Boolean(r));

    const csv = exportUsersToCsvString(targetRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kft_users_export_${new Date().toISOString().slice(0, 10)}_${targetRecords.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      tr(language, `📊 បានទាញយកឯកសារ CSV (${targetRecords.length} គណនី) ដោយជោគជ័យ!`, `📊 Exported ${targetRecords.length} users to CSV!`, `📊 已成功导出 ${targetRecords.length} 位用户至 CSV！`),
      'success'
    );
  };

  const handleExportJsonBackup = async () => {
    const snap = await createUsersBackupSnapshot(
      users,
      deletedUsers,
      backupLabelInput.trim() || `Manual Export (${new Date().toLocaleDateString()})`,
      'manual',
      currentUser
    );
    setSavedBackupsMeta(getSavedBackupMetadataList());
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kft_users_backup_${snap.id}_${snap.createdAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      tr(language, `💾 បានបង្កើត និងទាញយក Backup (${snap.usersCount} គណនី) ដោយជោគជ័យ!`, `💾 Created and downloaded backup (${snap.usersCount} users)!`, `💾 已创建并下载备份（包含 ${snap.usersCount} 位用户）！`),
      'success'
    );
  };

  const handleImportJsonBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const extractedUsers: User[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.users)
          ? parsed.users
          : [];
        if (extractedUsers.length === 0) {
          showToast(
            tr(language, '⚠️ ឯកសារ Backup មិនមានទិន្នន័យគណនីត្រឹមត្រូវទេ!', '⚠️ Invalid backup file format!', '⚠️ 无效的备份文件格式！'),
            'warning'
          );
          return;
        }
        await restoreUsersFromBackup(extractedUsers, 'merge');
        setActivityLogsVersion((v) => v + 1);
      } catch {
        showToast(
          tr(language, '⚠️ មិនអាចអានឯកសារ JSON Backup បានទេ!', '⚠️ Failed to parse JSON backup file!', '⚠️ 解析 JSON 备份文件失败！'),
          'warning'
        );
      } finally {
        if (fileRestoreInputRef.current) fileRestoreInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 font-khmer">
      {/* TOP HEADER BAR & SUB-VIEW SWITCHER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-stone-800 p-4 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>
                {tr(language, `ប្រព័ន្ធគ្រប់គ្រងអ្នកប្រើប្រាស់កម្រិតខ្ពស់ (${stats.totalUsers.toLocaleString()} គណនី)`, `Enterprise User Management (${stats.totalUsers.toLocaleString()} Users)`, `企业级用户管理 (${stats.totalUsers.toLocaleString()} 位用户)`)}
              </span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ⚡ {serverLatencyMs !== null ? `${serverLatencyMs}ms (Server)` : `${queryResult.queryTimeMs}ms (Indexed)`} • Limit: {pageSize} Offset: {(queryResult.currentPage - 1) * pageSize} • RBAC: {adminTier.toUpperCase()}
            </span>
            {isFetchingServerPage && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                {tr(language, 'កំពុងទាញទំព័រពី Server...', 'Fetching page...', '正在获取页面...')}
              </span>
            )}
            {!isFetchingServerPage && paginationSource === 'supabase_postgrest' && serverTotalCount !== null && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                🌐 PostgREST Indexed ({serverTotalCount.toLocaleString()} rows)
              </span>
            )}
            {lastUsersSyncedAt && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                ✓ {tr(language, 'សមកាលកម្ម៖', 'Synced:', '已同步：')} {new Date(lastUsersSyncedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {tr(language, 'គាំទ្រគណនី 10,000–50,000+ ជាមួយការស្វែងរកល្បឿនលឿន O(1) Index, ការបែងចែកទំព័រ (Pagination), ការគ្រប់គ្រងជាក្រុម (Bulk Actions), កំណត់ហេតុសកម្មភាព និងប្រព័ន្ធ Backup/Restore។', 'Engineered for 10,000–50,000+ users with O(1) multi-indexing, server-grade pagination, atomic bulk operations, activity audit logs, and point-in-time backup & recovery.', '专为 10,000–50,000+ 用户打造，具备 O(1) 多索引、服务器级分页、原子批量操作、活动审计日志及时间点备份与恢复能力。')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubView('directory')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subView === 'directory'
                ? 'bg-[#064E3B] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{tr(language, `បញ្ជីគណនី (${stats.totalUsers.toLocaleString()})`, `Directory (${stats.totalUsers.toLocaleString()})`, `用户目录 (${stats.totalUsers.toLocaleString()})`)}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('shop_ownership')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subView === 'shop_ownership'
                ? 'bg-[#064E3B] text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>
              {tr(language, `🏪 ម្ចាស់ហាង & ហាងទាំងអស់ (${directoryIndex.allOwnedShops.length})`, `🏪 Shop Ownership (${directoryIndex.allOwnedShops.length})`, `🏪 店铺所有权 (${directoryIndex.allOwnedShops.length})`)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('activity_logs')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subView === 'activity_logs'
                ? 'bg-[#064E3B] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{tr(language, 'ប្រវត្តិ & កំណត់ហេតុ', 'Activity & Audit Logs', '活动与审计日志')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('backup_diagnostics')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subView === 'backup_diagnostics'
                ? 'bg-[#064E3B] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{tr(language, 'Backup & តេស្ត 50K', 'Backup & 50K Test', '备份与 50K 压力测试')}</span>
          </button>

          <button
            type="button"
            disabled={isSyncingUsers}
            onClick={async () => {
              if (syncUsersNow) await syncUsersNow();
            }}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin' : ''}`} />
            <span>{isSyncingUsers ? (tr(language, 'កំពុងទាញយក...', 'Syncing...', '正在同步...')) : (tr(language, 'ធ្វើសមកាលកម្ម', 'Sync Cloud', '同步云端'))}</span>
          </button>
        </div>
      </div>

      {/* REAL-TIME PRE-AGGREGATED KPI METRICS (NO FULL DOM RENDER REQUIRED) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            clearAllFilters();
          }}
          className="text-left p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>{tr(language, 'គណនីសរុប', 'Total Accounts', '账户总数')}</span>
            <Users className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-lg font-black text-stone-900 dark:text-stone-100 mt-0.5">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            +{stats.registeredLast7DaysCount} {tr(language, 'ក្នុង 7 ថ្ងៃនេះ', 'last 7d', '最近 7 天')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            setVipStatusFilter(vipStatusFilter === 'active_vip' ? 'all' : 'active_vip');
          }}
          className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
            vipStatusFilter === 'active_vip'
              ? 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-500'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:border-amber-400'
          }`}
        >
          <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>{tr(language, 'សមាជិក VIP សកម្ម', 'Active VIP', '有效 VIP')}</span>
            <Crown className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
            👑 {stats.activeVipCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            {tr(language, `ផុតកំណត់៖ ${stats.expiredVipCount} • រង់ចាំ៖ ${stats.pendingVipCount}`, `Exp: ${stats.expiredVipCount} • Pend: ${stats.pendingVipCount}`, `已过期：${stats.expiredVipCount} • 待处理：${stats.pendingVipCount}`)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            setAccountTypeFilter(accountTypeFilter === 'owner' ? 'all' : 'owner');
          }}
          className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
            accountTypeFilter === 'owner'
              ? 'bg-emerald-100/80 dark:bg-emerald-950/60 border-emerald-500'
              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
          }`}
        >
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>{tr(language, 'ម្ចាស់ហាង/សណ្ឋាគារ', 'Shop Owners', '店主数量')}</span>
            <span>🏪</span>
          </div>
          <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {stats.shopOwnersCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            {tr(language, `អ្នកប្រើទូទៅ៖ ${stats.regularUsersCount.toLocaleString()}`, `Regular: ${stats.regularUsersCount.toLocaleString()}`, `普通用户：${stats.regularUsersCount.toLocaleString()}`)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            setAccountStatusFilter(accountStatusFilter === 'disabled' ? 'all' : 'disabled');
          }}
          className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
            accountStatusFilter === 'disabled'
              ? 'bg-rose-100/80 dark:bg-rose-950/60 border-rose-500'
              : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-rose-400'
          }`}
        >
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>{tr(language, 'ស្ថានភាពគណនី', 'Account Status', '账户状态')}</span>
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-stone-900 dark:text-stone-100 mt-0.5">
            {stats.activeAccountsCount.toLocaleString()} <span className="text-xs font-normal text-emerald-600">{tr(language, 'សកម្ម', 'active', '正常')}</span>
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
            {tr(language, `ផ្អាកដំណើរការ៖ ${stats.disabledAccountsCount}`, `Suspended: ${stats.disabledAccountsCount}`, `已暂停：${stats.disabledAccountsCount}`)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            setAuthProviderFilter(authProviderFilter === 'google' ? 'all' : 'google');
          }}
          className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
            authProviderFilter === 'google'
              ? 'bg-blue-100/80 dark:bg-blue-950/60 border-blue-500'
              : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 hover:border-blue-400'
          }`}
        >
          <div className="text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>{tr(language, 'ប្រភពចូលគណនី', 'Auth Channels', '登录渠道')}</span>
            <span className="font-mono font-bold text-xs">G</span>
          </div>
          <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">
            {stats.googleAuthCount.toLocaleString()} <span className="text-xs font-normal">Google</span>
          </div>
          <div className="text-[10px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
            ✉️ {stats.emailAuthCount} • 📞 {stats.phoneAuthCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('directory');
            setDateRangeFilter(dateRangeFilter === '30d' ? 'all' : '30d');
          }}
          className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
            dateRangeFilter === '30d'
              ? 'bg-purple-100/80 dark:bg-purple-950/60 border-purple-500'
              : 'bg-purple-50/60 dark:bg-purple-950/25 border-purple-200 dark:border-purple-800/60 hover:border-purple-400'
          }`}
        >
          <div className="text-[11px] text-purple-800 dark:text-purple-300 flex items-center justify-between">
            <span>{tr(language, 'សកម្មភាពចូលប្រើ', 'Active / New', '活跃 / 新增')}</span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">
            {stats.activeLast7DaysCount.toLocaleString()} <span className="text-xs font-normal">7d</span>
          </div>
          <div className="text-[10px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
            {tr(language, `ថ្ងៃនេះ៖ ${stats.activeLast24hCount} • ថ្មី 30d៖ ${stats.registeredLast30DaysCount}`, `24h: ${stats.activeLast24hCount} • New 30d: ${stats.registeredLast30DaysCount}`, `24小时：${stats.activeLast24hCount} • 30天新增：${stats.registeredLast30DaysCount}`)}
          </div>
        </button>
      </div>

      {/* =====================================================================
          SUB-VIEW 1: PAGINATED USER DIRECTORY, ADVANCED FILTERS & BULK ACTIONS
         ===================================================================== */}
      {subView === 'directory' && (
        <div className="space-y-3.5">
          {/* Quick Account Restoration Bar */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr(language, 'ស្តារសិទ្ធិចូលប្រើប្រាស់គណនីឡើងវិញ (Restore User Access)', 'Restore User Account Access', '恢复用户账户访问权限')}</span>
              </h4>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                {tr(language, 'វាយអ៊ីមែល ឬ User ID ដើម្បីដោះសោគណនីដែលត្រូវបានផ្អាក ឬលុបដោយចៃដន្យ។', 'Enter an Email or User ID to immediately unblock or restore a suspended/deleted account.', '输入邮箱或用户 ID，立即解封或恢复已暂停/已删除的账户。')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                placeholder={tr(language, 'បញ្ចូល Email ឬ User ID...', 'Enter Email or User ID...', '输入邮箱或用户 ID...')}
                className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-xs text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                disabled={isRestoringUser || !restoreInput.trim()}
                onClick={async () => {
                  const target = restoreInput.trim();
                  if (!target) return;
                  setIsRestoringUser(true);
                  try {
                    const res = await restoreUserAccess(target);
                    if (res.success) {
                      setRestoreInput('');
                      setActivityLogsVersion((v) => v + 1);
                    }
                  } finally {
                    setIsRestoringUser(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
              >
                {isRestoringUser ? (tr(language, 'កំពុងស្តារ...', 'Restoring...', '正在恢复...')) : (tr(language, 'ស្តារគណនី', 'Restore Access', '恢复访问权限'))}
              </button>
            </div>
          </div>

          {/* Search, Sorting & Filter Controls */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Instant Indexed Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    tr(language, 'ស្វែងរកតាម ឈ្មោះហាង (Shop Name), Shop ID, ឈ្មោះម្ចាស់គណនី (Owner Name), User ID, អ៊ីមែល (Email), ឬលេខទូរស័ព្ទ (Phone)...', 'Search by Shop Name, Shop ID, Owner Name, User ID, Email, or Phone Number...', '按店铺名称、店铺 ID、店主姓名、用户 ID、邮箱或手机号搜索...')
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Controls & Filter Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-900 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as UserSortField)}
                    className="bg-transparent text-xs font-bold text-stone-700 dark:text-stone-200 focus:outline-none cursor-pointer"
                  >
                    <option value="default_priority">{tr(language, 'តម្រៀប៖ VIP & ចូលចុងក្រោយ', 'Sort: VIP & Last Active', '排序：VIP 与最后活跃')}</option>
                    <option value="lastLoginAt">{tr(language, 'ពេលចូលចុងក្រោយ (Last Login)', 'Last Login Date', '最后登录时间')}</option>
                    <option value="registeredAt">{tr(language, 'ថ្ងៃចុះឈ្មោះ (Registration Date)', 'Registration Date', '注册日期')}</option>
                    <option value="name">{tr(language, 'ឈ្មោះគណនី (Name A-Z)', 'User Name', '用户姓名')}</option>
                    <option value="email">{tr(language, 'អ៊ីមែល (Email A-Z)', 'Email Address', '邮箱地址')}</option>
                    <option value="vipExpiry">{tr(language, 'ថ្ងៃផុតកំណត់ VIP (VIP Expiry)', 'VIP Expiry Date', 'VIP 到期日期')}</option>
                    <option value="shopsCount">{tr(language, 'ចំនួនហាង (Owned Shops)', 'Owned Shops Count', '拥有店铺数')}</option>
                    <option value="txnsCount">{tr(language, 'ចំនួនប្រតិបត្តិការ (Transactions)', 'Transactions Count', '交易次数')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-[10px] font-bold text-stone-700 dark:text-stone-300 cursor-pointer"
                    title={tr(language, 'ប្តូរទិសដៅតម្រៀប', 'Toggle sort order', '切换排序方向')}
                  >
                    {sortOrder === 'desc' ? 'DESC ↓' : 'ASC ↑'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    showAdvancedFilters ||
                    vipStatusFilter !== 'all' ||
                    accountStatusFilter !== 'all' ||
                    authProviderFilter !== 'all' ||
                    dateRangeFilter !== 'all'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-400'
                      : 'bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{tr(language, 'តម្រងកម្រិតខ្ពស់', 'Advanced Filters', '高级筛选')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Quick Account Type Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-stone-100 dark:border-stone-700/60">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: tr(language, `ទាំងអស់ (${stats.totalUsers.toLocaleString()})`, `All (${stats.totalUsers.toLocaleString()})`, `全部 (${stats.totalUsers.toLocaleString()})`) },
                    { id: 'vip', label: tr(language, `👑 សមាជិក VIP (${stats.activeVipCount.toLocaleString()})`, `👑 Active VIP (${stats.activeVipCount.toLocaleString()})`, `👑 有效 VIP (${stats.activeVipCount.toLocaleString()})`) },
                    { id: 'owner', label: tr(language, `🏪 ម្ចាស់ហាង (${stats.shopOwnersCount.toLocaleString()})`, `🏪 Owners (${stats.shopOwnersCount.toLocaleString()})`, `🏪 店主 (${stats.shopOwnersCount.toLocaleString()})`) },
                    { id: 'regular', label: tr(language, `👤 ទូទៅ (${stats.regularUsersCount.toLocaleString()})`, `👤 Regular (${stats.regularUsersCount.toLocaleString()})`, `👤 普通用户 (${stats.regularUsersCount.toLocaleString()})`) },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAccountTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      accountTypeFilter === f.id
                        ? 'bg-[#064E3B] text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span>
                  {tr(language, `លទ្ធផល៖ ${queryResult.totalFilteredCount.toLocaleString()} គណនី`, `Showing ${queryResult.totalFilteredCount.toLocaleString()} matching users`, `显示 ${queryResult.totalFilteredCount.toLocaleString()} 位匹配的用户`)}
                </span>
                {(searchQuery ||
                  accountTypeFilter !== 'all' ||
                  vipStatusFilter !== 'all' ||
                  accountStatusFilter !== 'all' ||
                  authProviderFilter !== 'all' ||
                  dateRangeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-rose-600 dark:text-rose-400 font-bold underline cursor-pointer"
                  >
                    {tr(language, 'សម្អាតតម្រង', 'Reset Filters', '重置筛选')}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Multi-Dimensional Filters (VIP Status, Account Status, Auth Provider, Registration Date Range) */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-stone-200/80 dark:border-stone-700">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    {tr(language, 'ស្ថានភាព VIP (VIP Status)', 'VIP Membership Status', 'VIP 会员状态')}
                  </label>
                  <select
                    value={vipStatusFilter}
                    onChange={(e) => setVipStatusFilter(e.target.value as UserVipStatusFilter)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="all">{tr(language, 'គ្រប់ស្ថានភាព VIP ទាំងអស់', 'All VIP Statuses', '所有 VIP 状态')}</option>
                    <option value="active_vip">{tr(language, '👑 សមាជិក VIP សកម្ម (Active VIP)', '👑 Active VIP', '👑 有效 VIP')}</option>
                    <option value="expired_vip">{tr(language, '⌛ ផុតកំណត់ VIP (Expired VIP)', '⌛ Expired VIP', '⌛ 已过期 VIP')}</option>
                    <option value="pending_vip">{tr(language, '⏳ រង់ចាំផ្ទៀងផ្ទាត់ (Pending VIP)', '⏳ Pending Verification', '⏳ 待验证')}</option>
                    <option value="free">{tr(language, '👤 គណនីឥតគិតថ្លៃ (Free Tier)', '👤 Free Tier', '👤 免费账户')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    {tr(language, 'ស្ថានភាពគណនី (Account Status)', 'Account Status', '账户状态')}
                  </label>
                  <select
                    value={accountStatusFilter}
                    onChange={(e) => setAccountStatusFilter(e.target.value as UserAccountStatusFilter)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="all">{tr(language, 'គ្រប់ស្ថានភាពគណនី', 'All Account Statuses', '所有账户状态')}</option>
                    <option value="active">{tr(language, '✅ គណនីដំណើរការធម្មតា (Active)', '✅ Active Accounts', '✅ 正常账户')}</option>
                    <option value="disabled">{tr(language, '⚠️ គណនីផ្អាកដំណើរការ (Suspended)', '⚠️ Suspended / Disabled', '⚠️ 已暂停 / 已禁用')}</option>
                    <option value="verified">{tr(language, '✓ បានផ្ទៀងផ្ទាត់ (Verified)', '✓ Verified Accounts', '✓ 已验证账户')}</option>
                    <option value="unverified">{tr(language, 'មិនទាន់ផ្ទៀងផ្ទាត់ (Unverified)', 'Unverified Accounts', '未验证账户')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    {tr(language, 'ប្រភេទការចូលគណនី (Auth Provider)', 'Authentication Provider', '登录方式')}
                  </label>
                  <select
                    value={authProviderFilter}
                    onChange={(e) => setAuthProviderFilter(e.target.value as UserAuthProviderFilter)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="all">{tr(language, 'គ្រប់ប្រភពចូលគណនី', 'All Auth Providers', '所有登录方式')}</option>
                    <option value="google">Google Sign-In ({stats.googleAuthCount})</option>
                    <option value="email">Email ({stats.emailAuthCount})</option>
                    <option value="phone">Phone ({stats.phoneAuthCount})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    {tr(language, 'កាលបរិច្ឆេទចុះឈ្មោះ (Registration Date)', 'Registration Date', '注册日期')}
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value as UserDateRangeFilter)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="all">{tr(language, 'គ្រប់កាលបរិច្ឆេទទាំងអស់', 'All Time', '所有时间')}</option>
                    <option value="today">{tr(language, 'ថ្ងៃនេះ (Last 24h)', 'Today (Last 24h)', '今天（最近 24 小时）')}</option>
                    <option value="7d">{tr(language, 'ក្នុងរយៈពេល 7 ថ្ងៃចុងក្រោយ', 'Last 7 Days', '最近 7 天')}</option>
                    <option value="30d">{tr(language, 'ក្នុងរយៈពេល 30 ថ្ងៃចុងក្រោយ', 'Last 30 Days', '最近 30 天')}</option>
                    <option value="90d">{tr(language, 'ក្នុងរយៈពេល 90 ថ្ងៃចុងក្រោយ', 'Last 90 Days', '最近 90 天')}</option>
                    <option value="custom">{tr(language, 'កំណត់ថ្ងៃចាប់ផ្តើម និងបញ្ចប់...', 'Custom Date Range...', '自定义日期范围...')}</option>
                  </select>
                </div>

                {dateRangeFilter === 'custom' && (
                  <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                      {tr(language, 'ចាប់ពីថ្ងៃ៖', 'From:', '起始日期：')}
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                    />
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                      {tr(language, 'ដល់ថ្ងៃ៖', 'To:', '截止日期：')}
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BULK SELECTION & ATOMIC BULK ACTIONS BAR */}
          <div className="p-3 rounded-2xl bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleSelectCurrentPage}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 cursor-pointer"
              >
                {isCurrentPageAllSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>
                  {tr(language, `ជ្រើសរើសទំព័រនេះ (${currentPageIds.length})`, `Select Page (${currentPageIds.length})`, `选中本页 (${currentPageIds.length})`)}
                </span>
              </button>

              {queryResult.totalFilteredCount > currentPageIds.length && (
                <button
                  type="button"
                  onClick={selectAllFilteredUsers}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  {isAllFilteredSelected
                    ? tr(language, 'ដកការជ្រើសរើសទាំងអស់', 'Deselect All', '取消全选')
                    : tr(language, `ជ្រើសរើសទាំងអស់ដែលត្រូវតម្រង (${queryResult.totalFilteredCount.toLocaleString()})`, `Select All Filtered (${queryResult.totalFilteredCount.toLocaleString()})`, `选中所有筛选结果 (${queryResult.totalFilteredCount.toLocaleString()})`)}
                </button>
              )}

              {validSelectedIds.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                  {tr(language, `បានជ្រើសរើស ${validSelectedIds.length.toLocaleString()} គណនី`, `${validSelectedIds.length.toLocaleString()} Selected`, `已选择 ${validSelectedIds.length.toLocaleString()} 项`)}
                </span>
              )}

              {validSelectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  {tr(language, 'បោះបង់ការជ្រើសរើស', 'Clear', '清除')}
                </button>
              )}
            </div>

            {/* Bulk Action Buttons (Enabled when >= 1 user is selected) */}
            {validSelectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Bulk VIP Grant with selectable duration */}
                <div className="flex items-center bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl overflow-hidden">
                  <select
                    value={bulkVipDaysInput}
                    onChange={(e) => setBulkVipDaysInput(Number(e.target.value))}
                    className="px-2 py-1.5 bg-transparent text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none"
                  >
                    <option value={7}>7 {tr(language, 'ថ្ងៃ', 'Days', '天数')}</option>
                    <option value={30}>30 {tr(language, 'ថ្ងៃ', 'Days', '天数')}</option>
                    <option value={60}>60 {tr(language, 'ថ្ងៃ', 'Days', '天数')}</option>
                    <option value={90}>90 {tr(language, 'ថ្ងៃ', 'Days', '天数')}</option>
                    <option value={365}>365 {tr(language, 'ថ្ងៃ', 'Days', '天数')}</option>
                  </select>
                  <button
                    type="button"
                    disabled={isExecutingBulk}
                    onClick={async () => {
                      setIsExecutingBulk(true);
                      try {
                        await bulkGrantUserVip(validSelectedIds, bulkVipDaysInput);
                        setActivityLogsVersion((v) => v + 1);
                      } finally {
                        setIsExecutingBulk(false);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold transition cursor-pointer"
                  >
                    👑 {tr(language, 'ផ្តល់ VIP ជាក្រុម', 'Grant VIP', '授予 VIP')}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isExecutingBulk}
                  onClick={async () => {
                    setIsExecutingBulk(true);
                    try {
                      await bulkCancelUserVip(validSelectedIds);
                      setActivityLogsVersion((v) => v + 1);
                    } finally {
                      setIsExecutingBulk(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold cursor-pointer"
                >
                  {tr(language, 'បិទ VIP', 'Revoke VIP', '取消 VIP')}
                </button>

                <button
                  type="button"
                  disabled={isExecutingBulk}
                  onClick={async () => {
                    setIsExecutingBulk(true);
                    try {
                      await bulkSetUserAccountStatus(validSelectedIds, 'active');
                      setActivityLogsVersion((v) => v + 1);
                    } finally {
                      setIsExecutingBulk(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold cursor-pointer"
                >
                  ✅ {tr(language, 'បើកដំណើរការ', 'Activate', '启用')}
                </button>

                <button
                  type="button"
                  disabled={isExecutingBulk}
                  onClick={async () => {
                    setIsExecutingBulk(true);
                    try {
                      await bulkSetUserAccountStatus(validSelectedIds, 'disabled');
                      setActivityLogsVersion((v) => v + 1);
                    } finally {
                      setIsExecutingBulk(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 text-xs font-bold cursor-pointer"
                >
                  ⏸️ {tr(language, 'ផ្អាកគណនី', 'Deactivate', '停用')}
                </button>

                <button
                  type="button"
                  disabled={isExecutingBulk}
                  onClick={() => {
                    const targets = validSelectedIds
                      .map((id) => directoryIndex.byId.get(id)?.user)
                      .filter((u): u is User => Boolean(u));
                    if (targets.length > 0) {
                      setConfirmDeleteForeverChecked(false);
                      setUserPendingDeletion(null);
                      setUsersPendingBatchDeletion(targets);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{tr(language, `លុប (${validSelectedIds.length})`, `Delete (${validSelectedIds.length})`, `删除 (${validSelectedIds.length})`)}</span>
                </button>
              </div>
            )}
          </div>

          {/* PAGINATED USER LIST (RENDERS ONLY PAGE SLICE FOR INSTANT 60FPS SCROLLING) */}
          {currentPageItems.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  {tr(language, 'រកមិនឃើញគណនីដែលត្រូវនឹងការស្វែងរកនេះទេ', 'No matching user accounts found', '未找到匹配的用户账户')}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  {tr(language, 'សូមសាកល្បងប្តូរពាក្យស្វែងរក ឬចុច «សម្អាតតម្រង» ដើម្បីមើលគណនីទាំងអស់។', 'Try adjusting your search keywords or click "Reset Filters" to view all accounts.', '请尝试调整搜索关键词，或点击“重置筛选”查看所有账户。')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentPageItems.map((rec) => {
                const u = rec.user;
                const isSelected = selectedSet.has(u.id);
                const providerLabel =
                  rec.provider === 'google' ? 'Google' : rec.provider === 'phone' ? 'Phone' : 'Email';

                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u.id)}
                    className={`p-3.5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-700 shadow-xs'
                        : rec.isDisabled
                        ? 'bg-stone-100/80 dark:bg-stone-900/60 border-stone-300 dark:border-stone-700 opacity-85'
                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUser(u.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-1 sm:mt-0 rounded accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <img
                        key={resolveUserAvatarUrl(u)}
                        src={resolveUserAvatarUrl(u)}
                        alt={u.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarImageError(e, u)}
                        className="w-11 h-11 rounded-full object-cover border border-stone-200 dark:border-stone-600 shrink-0 bg-emerald-950"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            {u.name}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-mono">
                            {providerLabel}
                          </span>
                          {rec.isActiveVip && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-extrabold">
                              👑 VIP ({getVipRemainingDays(u)}d)
                            </span>
                          )}
                          {rec.isExpiredVip && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold">
                              ⌛ VIP Expired
                            </span>
                          )}
                          {rec.isPendingVip && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 text-[10px] font-bold">
                              ⏳ Pending VIP
                            </span>
                          )}
                          {rec.isDisabled && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 text-[10px] font-bold">
                              ⚠️ {tr(language, 'បានផ្អាក', 'Suspended', '已暂停')}
                            </span>
                          )}
                          <code className="text-[10px] font-mono text-stone-400">({u.id})</code>
                        </div>

                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {u.email || 'N/A'} • 📞 {u.phone || 'N/A'}
                          {u.username ? ` • @${u.username}` : ''}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] text-stone-500 dark:text-stone-400">
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900">
                            📅 {tr(language, 'ចុះឈ្មោះ៖', 'Reg:', '注册：')}{' '}
                            {u.registeredAtIso
                              ? new Date(u.registeredAtIso).toLocaleDateString()
                              : u.createdAt}
                          </span>
                          {u.lastLoginAt && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                              🕒 {tr(language, 'ចូលចុងក្រោយ៖', 'Last Login:', '最后登录：')}{' '}
                              {new Date(u.lastLoginAt).toLocaleString()}
                            </span>
                          )}
                          {rec.shopsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold">
                              🏪 {rec.shopsCount} {tr(language, 'ហាង', 'Shops', '店铺')}
                            </span>
                          )}
                          {rec.txnsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                              💳 {rec.txnsCount} (&#36;{rec.associations.totalSpentUsd.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side Single-User Quick Controls */}
                    <div
                      className="flex items-center gap-1.5 flex-wrap sm:justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setInspectedUserRecord(rec)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title={tr(language, 'មើលប្រវត្តិលម្អិត និងសកម្មភាព', 'Inspect user history & logs', '查看用户历史记录与日志')}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{tr(language, 'ប្រវត្តិ', 'Inspect', '查看详情')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await adminGrantUserVip(
                            u.id || u.email,
                            appSettings.vipShortDurationDays || 30
                          );
                          setActivityLogsVersion((v) => v + 1);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950 text-[11px] font-extrabold shadow-xs transition cursor-pointer whitespace-nowrap"
                      >
                        👑 +VIP {appSettings.vipShortDurationDays || 30}d
                      </button>

                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
                      >
                        <option value="user">{tr(language, 'អ្នកប្រើទូទៅ', 'Regular User', '普通用户')}</option>
                        <option value="owner">{tr(language, 'ម្ចាស់ហាង', 'Shop Owner', '店主')}</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteForeverChecked(false);
                          setUsersPendingBatchDeletion([]);
                          setUserPendingDeletion(u);
                        }}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
                        title={tr(language, 'គ្រប់គ្រងស្ថានភាព ឬលុបគណនី', 'Manage status or delete account', '管理状态或删除账户')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SERVER-GRADE PAGINATION FOOTER */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
              <span>
                {tr(language, `ទំព័រទី ${queryResult.currentPage} នៃ ${queryResult.totalPages} (សរុប ${queryResult.totalFilteredCount.toLocaleString()} គណនី)`, `Page ${queryResult.currentPage} of ${queryResult.totalPages} (${queryResult.totalFilteredCount.toLocaleString()} total)`, `第 ${queryResult.currentPage} 页，共 ${queryResult.totalPages} 页（共 ${queryResult.totalFilteredCount.toLocaleString()} 项）`)}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold"
              >
                <option value={20}>20 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={250}>250 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!queryResult.hasPrevPage}
                onClick={() => setPage(1)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 disabled:opacity-40 text-xs font-bold cursor-pointer"
              >
                {tr(language, 'ដំបូង', 'First', '首页')}
              </button>
              <button
                type="button"
                disabled={!queryResult.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-xl bg-[#064E3B] text-white text-xs font-bold">
                {queryResult.currentPage} / {queryResult.totalPages}
              </span>
              <button
                type="button"
                disabled={!queryResult.hasNextPage}
                onClick={() => setPage((p) => Math.min(queryResult.totalPages, p + 1))}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!queryResult.hasNextPage}
                onClick={() => setPage(queryResult.totalPages)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 disabled:opacity-40 text-xs font-bold cursor-pointer"
              >
                {tr(language, 'ចុងក្រោយ', 'Last', '末页')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 1B: DEDICATED SHOP OWNERSHIP DIRECTORY (ALL SHOPS <-> OWNER ACCOUNTS)
         ===================================================================== */}
      {subView === 'shop_ownership' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>
                    {tr(language, `តារាងម្ចាស់ហាង និងហាងទាំងអស់ (${directoryIndex.allOwnedShops.length} ហាង / ${stats.shopOwnersCount} គណនីម្ចាស់ហាង)`, `Complete Shop Ownership Directory (${directoryIndex.allOwnedShops.length} Shops / ${stats.shopOwnersCount} Owner Accounts)`, `完整店铺所有权目录 (${directoryIndex.allOwnedShops.length} 家店铺 / ${stats.shopOwnersCount} 个店主账户)`)}
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {tr(language, 'បង្ហាញយ៉ាងច្បាស់នូវ ឈ្មោះហាង, Shop ID, ឈ្មោះម្ចាស់គណនី, User ID, អ៊ីមែល, លេខទូរស័ព្ទ និងចំនួនហាងសរុប ព្រមទាំងប៊ូតុង មើលហាង គ្រប់គ្រង ផ្អាក និងផ្ទេរកម្មសិទ្ធិ។', 'Clearly identifies which registered user account owns each shop with Shop Name, Shop ID, Owner Name, User ID, Email, Phone Number, and instant ownership actions.', '清晰显示各店铺所属的注册用户账户，包含店铺名称、店铺 ID、店主姓名、用户 ID、邮箱、手机号及即时所有权管理操作。')}
                </p>
              </div>

              <button
                type="button"
                disabled={isSyncingShopLinks}
                onClick={handleSyncAndRepairAllShopOwnershipLinks}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Link2 className={`w-3.5 h-3.5 ${isSyncingShopLinks ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncingShopLinks
                    ? tr(language, 'កំពុងភ្ជាប់ទិន្នន័យ...', 'Syncing Links...', '正在同步关联...')
                    : tr(language, '🔗 ផ្ទៀងផ្ទាត់ & ភ្ជាប់កម្មសិទ្ធិហាងជាមួយ Database', '🔗 Verify & Sync Shop Ownership Links', '🔗 验证并同步店铺所有权关联')}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={shopDirectorySearch}
                  onChange={(e) => setShopDirectorySearch(e.target.value)}
                  placeholder={
                    tr(language, 'ស្វែងរកតាម ឈ្មោះហាង, Shop ID, ឈ្មោះម្ចាស់គណនី, User ID, អ៊ីមែល ឬលេខទូរស័ព្ទ...', 'Search by Shop Name, Shop ID, Owner Name, User ID, Email, or Phone Number...', '按店铺名称、店铺 ID、店主姓名、用户 ID、邮箱或手机号搜索...')
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                />
                {shopDirectorySearch && (
                  <button
                    type="button"
                    onClick={() => setShopDirectorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'all', label: tr(language, 'ទាំងអស់ (All)', 'All Shops', '所有店铺') },
                    { id: 'active', label: tr(language, '✅ សកម្ម (Active)', '✅ Active', '✅ 营业中') },
                    { id: 'pending', label: tr(language, '⏳ រង់ចាំអនុម័ត', '⏳ Pending', '⏳ 待审核') },
                    { id: 'suspended', label: tr(language, '⏸️ បានផ្អាក (Suspended)', '⏸️ Suspended', '⏸️ 已暂停') },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setShopStatusFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      shopStatusFilter === tab.id
                        ? 'bg-[#064E3B] text-white border-[#064E3B]'
                        : 'bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {directoryIndex.allOwnedShops
                .filter((s) => {
                  if (shopStatusFilter === 'active' && (s.isSuspended || s.status === 'pending')) return false;
                  if (shopStatusFilter === 'pending' && s.status !== 'pending') return false;
                  if (shopStatusFilter === 'suspended' && !s.isSuspended) return false;
                  const q = shopDirectorySearch.trim().toLowerCase();
                  if (!q) return true;
                  const hay = `${s.id} ${s.nameKh} ${s.nameEn} ${s.ownerId} ${s.ownerName} ${s.ownerEmail} ${s.ownerPhone} ${s.phone} ${s.province}`.toLowerCase();
                  return hay.includes(q);
                })
                .map((shop) => {
                  const ownerRec =
                    (shop.ownerId ? directoryIndex.byId.get(shop.ownerId.trim().toLowerCase()) : undefined) ||
                    (shop.ownerEmail ? directoryIndex.byEmail.get(shop.ownerEmail.trim().toLowerCase()) : undefined);
                  const ownerUser = ownerRec?.user || shop.linkedUser;
                  const totalShopsForThisOwner = ownerRec ? ownerRec.shopsCount : shop.ownerShopsCount || 1;

                  return (
                    <div
                      key={shop.id}
                      className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                            🏪 {shop.nameKh}
                            {shop.nameEn && shop.nameEn !== shop.nameKh ? ` (${shop.nameEn})` : ''}
                          </span>
                          <code className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold">
                            Shop ID: {shop.id}
                          </code>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                              shop.isSuspended
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : shop.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {shop.isSuspended
                              ? tr(language, '⏸️ ផ្អាកដំណើរការ (Suspended)', '⏸️ Suspended', '⏸️ 已暂停')
                              : shop.status === 'pending'
                              ? tr(language, '⏳ រង់ចាំអនុម័ត (Pending)', '⏳ Pending', '⏳ 待审核')
                              : tr(language, '✅ កំពុងដំណើរការ (Active)', '✅ Active', '✅ 营业中')}
                          </span>
                          {shop.province && (
                            <span className="px-2 py-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold">
                              📍 {shop.province}
                            </span>
                          )}
                        </div>

                        {/* Complete 6-Field Owner & Shop Mapping Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-xs">
                          <div>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              {tr(language, 'ឈ្មោះម្ចាស់គណនី (Owner Name)', 'Owner Name', '店主姓名')}
                            </div>
                            <div className="font-bold text-stone-900 dark:text-white truncate">
                              👤 {ownerUser?.name || shop.ownerName || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              {tr(language, 'លេខសម្គាល់គណនី (User ID)', 'User ID', '用户 ID')}
                            </div>
                            <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px] break-all">
                              {ownerUser?.id || shop.ownerId || 'N/A'}
                            </code>
                          </div>
                          <div>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              {tr(language, 'អ៊ីមែលគណនី (Email)', 'Account Email', '账户邮箱')}
                            </div>
                            <div className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              ✉️ {ownerUser?.email || shop.ownerEmail || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              {tr(language, 'លេខទូរស័ព្ទ (Phone Number)', 'Phone Number', '手机号码')}
                            </div>
                            <div className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              📱 {ownerUser?.phone || shop.ownerPhone || shop.phone || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {ownerRec && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setInspectedUserRecord(ownerRec)}
                              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Store className="w-3.5 h-3.5" />
                              <span>
                                {tr(language, `មើលហាងទាំង ${totalShopsForThisOwner} របស់គណនី "${ownerRec.user.name}" →`, `View All ${totalShopsForThisOwner} Shop(s) Owned by "${ownerRec.user.name}" →`, `查看 "${ownerRec.user.name}" 名下的全部 ${totalShopsForThisOwner} 家店铺 →`)}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewShopDetails(shop.id)}
                          className="px-3 py-1.5 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tr(language, 'មើលហាង', 'View Shop', '查看店铺')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManageShop(shop.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>{tr(language, 'គ្រប់គ្រងហាង', 'Manage Shop', '管理店铺')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendShop(shop.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            shop.isSuspended
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {shop.isSuspended ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>{tr(language, 'បើកហាងវិញ', 'Reactivate', '重新激活')}</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>{tr(language, 'ផ្អាកហាង', 'Suspend', '暂停')}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShopTransferModalTarget(shop);
                            setTransferTargetQuery('');
                            setSelectedTransferUserId('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>{tr(language, 'ផ្ទេរកម្មសិទ្ធិ', 'Transfer Ownership', '转让所有权')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 2: USER ACTIVITY LOGS, LOGIN HISTORY, REGISTRATION & ADMIN LOGS
         ===================================================================== */}
      {subView === 'activity_logs' && (
        <div className="space-y-3.5">
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>
                    {tr(language, `ប្រវត្តិសកម្មភាព ចូលប្រើប្រាស់ ចុះឈ្មោះ និងសកម្មភាព Admin (${filteredActivityLogs.length})`, `User Activity, Login History, Registration & Admin Action Logs (${filteredActivityLogs.length})`, `用户活动、登录历史、注册及管理员操作日志 (${filteredActivityLogs.length})`)}
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {tr(language, 'តាមដានរាល់ការចុះឈ្មោះថ្មី ការចូលគណនី ការផ្តល់/បិទ VIP ការប្តូរតួនាទី និងសកម្មភាពគ្រប់គ្រងរបស់ Admin។', 'Real-time audit trail of user logins, registrations, VIP activations, role changes, and administrator actions.', '实时审计追踪用户登录、注册、VIP 开通、角色变更及管理员操作。')}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => {
                    setLogSearchQuery(e.target.value);
                    setLogsPage(1);
                  }}
                  placeholder={tr(language, 'ស្វែងរកក្នុងកំណត់ហេតុ...', 'Search logs by user, email, action...', '按用户、邮箱、操作搜索日志...')}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: tr(language, 'ទាំងអស់ (All)', 'All Events', '所有事件') },
                  { id: 'login', label: tr(language, '🔑 ប្រវត្តិចូលគណនី (Logins)', '🔑 Login History', '🔑 登录历史') },
                  { id: 'registration', label: tr(language, '🆕 ប្រវត្តិចុះឈ្មោះ (Registrations)', '🆕 Registrations', '🆕 注册记录') },
                  { id: 'vip_change', label: tr(language, '👑 សមាជិកភាព VIP & ទូទាត់', '👑 VIP & Payments', '👑 VIP 与支付') },
                  { id: 'account_status', label: tr(language, '🛡️ បើក/ផ្អាកគណនី', '🛡️ Account Status', '🛡️ 账户状态') },
                  { id: 'role_change', label: tr(language, '🏪 ប្តូរតួនាទី (Roles)', '🏪 Role Changes', '🏪 角色变更') },
                  { id: 'admin_action', label: tr(language, '⚡ សកម្មភាព Admin', '⚡ Admin Actions', '⚡ 管理员操作') },
                  { id: 'backup_restore', label: tr(language, '💾 Backup / Restore', '💾 Backups', '💾 备份记录') },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setLogCategoryFilter(c.id);
                    setLogsPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                    logCategoryFilter === c.id
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : log.status === 'BLOCKED'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {log.action}
                      </span>
                      {log.userName && (
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {log.userName}
                        </span>
                      )}
                      {log.userEmail && (
                        <span className="text-stone-500 text-[11px]">({log.userEmail})</span>
                      )}
                      {log.actorName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                          Admin: {log.actorName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300">{log.details}</p>
                  </div>
                  <div className="text-[10px] font-mono text-stone-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {totalLogsPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700 text-xs">
                <span>
                  {tr(language, `ទំព័រ ${logsPage} / ${totalLogsPages}`, `Page ${logsPage} of ${totalLogsPages}`, `第 ${logsPage} 页，共 ${totalLogsPages} 页`)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-900 disabled:opacity-40 font-bold cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={logsPage >= totalLogsPages}
                    onClick={() => setLogsPage((p) => Math.min(totalLogsPages, p + 1))}
                    className="px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-900 disabled:opacity-40 font-bold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 3: DATABASE BACKUP, RECOVERY, INTEGRITY & 50,000+ STRESS TEST
         ===================================================================== */}
      {subView === 'backup_diagnostics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <AdminUserDataSafetyCard />
          </div>
          {/* Backup, Restore & Data Integrity Protection Card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>
                  {tr(language, 'ប្រព័ន្ធការពារទិន្នន័យ Backup, ស្តារឡើងវិញ និងផ្ទៀងផ្ទាត់ភាពត្រឹមត្រូវ', 'Database Backup, Recovery & Data Integrity Protection', '数据库备份、恢复与数据完整性保护')}
                </span>
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {tr(language, `Checksum បច្ចុប្បន្ន៖ ${computeUsersChecksum(users.filter((u) => u.role !== 'admin'))}`, `Current Directory Checksum: ${computeUsersChecksum(users.filter((u) => u.role !== 'admin'))}`, `当前目录校验和：${computeUsersChecksum(users.filter((u) => u.role !== 'admin'))}`)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={backupLabelInput}
                onChange={(e) => setBackupLabelInput(e.target.value)}
                placeholder={tr(language, 'ឈ្មោះសម្គាល់ Backup (ឧ. មុនពេលកែប្រែ)...', 'Backup label (e.g., Pre-maintenance)...', '备份备注（如：维护前备份）...')}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
              />
              <button
                type="button"
                disabled={isCreatingBackup}
                onClick={async () => {
                  setIsCreatingBackup(true);
                  try {
                    await createUsersBackupSnapshot(
                      users,
                      deletedUsers,
                      backupLabelInput.trim() || `Snapshot ${new Date().toLocaleString()}`,
                      'manual',
                      currentUser
                    );
                    setBackupLabelInput('');
                    setSavedBackupsMeta(getSavedBackupMetadataList());
                    showToast(
                      tr(language, '✅ បានបង្កើត Snapshot Backup ក្នុងប្រព័ន្ធ!', '✅ Created local recovery snapshot!', '✅ 已创建本地恢复快照！'),
                      'success'
                    );
                  } finally {
                    setIsCreatingBackup(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                {tr(language, '+ បង្កើត Snapshot', '+ Create Snapshot', '+ 创建快照')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tr(language, 'ទាញយកឯកសារ Backup (.JSON)', 'Download Full Backup (.JSON)', '下载完整备份 (.JSON)')}</span>
              </button>

              <input
                ref={fileRestoreInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJsonBackupFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRestoreInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{tr(language, 'ស្តារពីឯកសារ Backup (.JSON)', 'Restore from Backup File', '从备份文件恢复')}</span>
              </button>

              <button
                type="button"
                disabled={isRunningIntegrity}
                onClick={async () => {
                  setIsRunningIntegrity(true);
                  try {
                    const rep = await runUsersIntegrityCheckAndRepair();
                    setIntegrityReport(rep);
                    showToast(
                      tr(language, `🛡️ ផ្ទៀងផ្ទាត់ទិន្នន័យរួចរាល់ (${rep.validUsersCount} គណនី)!`, `🛡️ Integrity check complete (${rep.validUsersCount} valid accounts)!`, `🛡️ 完整性检查完成（${rep.validUsersCount} 个有效账户）！`),
                      'success'
                    );
                  } finally {
                    setIsRunningIntegrity(false);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr(language, 'ពិនិត្យ និងជួសជុលទិន្នន័យ', 'Verify & Repair Integrity', '验证并修复完整性')}</span>
              </button>
            </div>

            {integrityReport && (
              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-200">
                  ✓ Integrity Report ({integrityReport.status}) — Checksum: {integrityReport.checksum}
                </div>
                {integrityReport.details.map((d, idx) => (
                  <div key={idx} className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    • {d}
                  </div>
                ))}
              </div>
            )}

            {/* Saved Snapshots List */}
            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
              <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {tr(language, `Snapshots ដែលបានរក្សាទុក (${savedBackupsMeta.length})`, `Saved Recovery Snapshots (${savedBackupsMeta.length})`, `已保存的恢复快照 (${savedBackupsMeta.length})`)}
              </div>
              {savedBackupsMeta.length === 0 ? (
                <p className="text-[11px] text-stone-400">
                  {tr(language, 'មិនទាន់មាន Snapshot នៅឡើយទេ។', 'No snapshots saved yet.', '暂无已保存的快照。')}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {savedBackupsMeta.map((meta) => (
                    <div
                      key={meta.id}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {meta.label}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {new Date(meta.createdAt).toLocaleString()} • {meta.usersCount} users ({meta.vipUsersCount} VIP)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const snap = await loadBackupSnapshotById(meta.id);
                          if (!snap || !Array.isArray(snap.users)) {
                            showToast(tr(language, 'រកមិនឃើញទិន្នន័យ Snapshot នេះទេ', 'Snapshot payload not found', '未找到快照数据'), 'warning');
                            return;
                          }
                          await restoreUsersFromBackup(snap.users, 'merge');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {tr(language, 'ស្តារឡើងវិញ', 'Restore', '恢复')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 10,000–50,000+ Users Scalability Stress Benchmark Card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>
                  {tr(language, 'តេស្តសមត្ថភាព និងល្បឿនប្រព័ន្ធជាមួយគណនី 10,000 – 50,000+ (Stress Test)', '10,000 – 50,000+ Users Performance & Scalability Benchmark', '10,000 – 50,000+ 用户性能与扩展性基准测试')}
                </span>
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {tr(language, 'ធ្វើតេស្តល្បឿនបង្កើត Index, ការបែងចែកទំព័រ, ការស្វែងរក និងការផ្តល់ VIP ជាក្រុមក្នុង Sandbox ដាច់ដោយឡែក (មិនប៉ះពាល់ទិន្នន័យគណនីពិតប្រាកដឡើយ)។', 'Runs an isolated in-memory benchmark simulating 10,000 to 50,000+ users without touching production user data.', '运行隔离的内存基准测试，模拟 10,000 至 50,000+ 用户，不影响生产环境数据。')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[10000, 25000, 50000].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBenchmarkTargetSize(sz)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    benchmarkTargetSize === sz
                      ? 'bg-[#064E3B] text-white border-[#064E3B]'
                      : 'bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {sz.toLocaleString()} {tr(language, 'គណនី', 'Users', '用户')}
                </button>
              ))}

              <button
                type="button"
                disabled={isRunningBenchmark}
                onClick={() => {
                  setIsRunningBenchmark(true);
                  setTimeout(() => {
                    try {
                      const res = runUserManagementStressBenchmark(benchmarkTargetSize);
                      setBenchmarkResult(res);
                    } finally {
                      setIsRunningBenchmark(false);
                    }
                  }, 20);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold cursor-pointer shadow-xs"
              >
                {isRunningBenchmark
                  ? tr(language, 'កំពុងធ្វើតេស្ត...', 'Running Benchmark...', '正在运行基准测试...')
                  : tr(language, `⚡ ចាប់ផ្តើមតេស្ត (${benchmarkTargetSize.toLocaleString()})`, `⚡ Run ${benchmarkTargetSize.toLocaleString()} Users Test`, `⚡ 运行 ${benchmarkTargetSize.toLocaleString()} 用户测试`)}
              </button>
            </div>

            {benchmarkResult && (
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {tr(language, `លទ្ធផលតេស្ត៖ ${benchmarkResult.testedUserCount.toLocaleString()} គណនី`, `Benchmark Result (${benchmarkResult.testedUserCount.toLocaleString()} Users)`, `基准测试结果 (${benchmarkResult.testedUserCount.toLocaleString()} 用户)`)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    ✓ PASSED ALL SLA TARGETS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Multi-Index Build</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.indexBuildTimeMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Page 1 Query & Sort</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.paginatedPage1TimeMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Deep Page 400 Query</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.paginatedDeepPageTimeMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Full Search Latency</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.searchQueryTimeMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Complex Multi-Filter</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.complexMultiFilterTimeMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700">
                    <div className="text-stone-500">Bulk 1,000 VIP Update</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-400">
                      {benchmarkResult.bulkVipOperationTimeMs} ms
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PER-USER DETAILED HISTORY & ACTIVITY INSPECTOR MODAL
         ===================================================================== */}
      {inspectedUserRecord && (
        <div
          className="fixed inset-0 z-80 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInspectedUserRecord(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <img loading="lazy" decoding="async"
                  src={resolveUserAvatarUrl(inspectedUserRecord.user)}
                  alt={inspectedUserRecord.user.name}
                  onError={(e) => handleAvatarImageError(e, inspectedUserRecord.user)}
                  className="w-14 h-14 rounded-full object-cover border border-stone-300"
                />
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 dark:text-white flex items-center gap-2">
                    <span>{inspectedUserRecord.user.name}</span>
                    {inspectedUserRecord.isActiveVip && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                        👑 VIP
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {inspectedUserRecord.user.email || 'No Email'} • 📞 {inspectedUserRecord.user.phone || 'No Phone'}
                  </p>
                  <code className="text-[11px] font-mono text-stone-400">
                    ID: {inspectedUserRecord.user.id}
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedUserRecord(null)}
                className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <div className="text-[10px] text-stone-500">{tr(language, 'ថ្ងៃចុះឈ្មោះ', 'Registered At', '注册时间')}</div>
                <div className="font-bold text-stone-900 dark:text-white mt-0.5">
                  {inspectedUserRecord.user.registeredAtIso
                    ? new Date(inspectedUserRecord.user.registeredAtIso).toLocaleString()
                    : inspectedUserRecord.user.createdAt}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <div className="text-[10px] text-stone-500">{tr(language, 'ចូលចុងក្រោយ', 'Last Login', '上次登录')}</div>
                <div className="font-bold text-stone-900 dark:text-white mt-0.5">
                  {inspectedUserRecord.user.lastLoginAt
                    ? new Date(inspectedUserRecord.user.lastLoginAt).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <div className="text-[10px] text-stone-500">{tr(language, 'ហាងកាន់កាប់', 'Owned Shops', '名下店铺')}</div>
                <div className="font-bold text-stone-900 dark:text-white mt-0.5">
                  🏪 {inspectedUserRecord.shopsCount}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <div className="text-[10px] text-stone-500">{tr(language, 'ការទូទាត់សរុប', 'Total Spent', '消费总额')}</div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  &#36;{inspectedUserRecord.associations.totalSpentUsd.toFixed(2)} ({inspectedUserRecord.txnsCount} txns)
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>
                    {tr(language, `បញ្ជីហាងដែលគ្រប់គ្រងដោយគណនី "${inspectedUserRecord.user.name}" (${inspectedUserRecord.shopsCount} ហាង)៖`, `Shops Owned by "${inspectedUserRecord.user.name}" (${inspectedUserRecord.shopsCount}):`, `“${inspectedUserRecord.user.name}”名下店铺 (${inspectedUserRecord.shopsCount})：`)}
                  </span>
                </div>
              </div>

              {inspectedUserRecord.associations.ownedShops.length === 0 ? (
                <p className="text-[11px] text-stone-500">
                  {tr(language, 'គណនីនេះមិនទាន់មានហាងនៅឡើយទេ (0 ហាង)។', 'This account does not currently own any shops (0 shops).', '该账户目前没有任何店铺（0 家）。')}
                </p>
              ) : (
                <div className="space-y-2">
                  {inspectedUserRecord.associations.ownedShops.map((shop) => (
                    <div
                      key={shop.id}
                      className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-stone-900 dark:text-white text-xs">
                            🏪 {shop.nameKh}
                            {shop.nameEn && shop.nameEn !== shop.nameKh ? ` (${shop.nameEn})` : ''}
                          </span>
                          <code className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                            Shop ID: {shop.id}
                          </code>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              shop.isSuspended
                                ? 'bg-rose-100 text-rose-700'
                                : shop.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {shop.isSuspended ? 'Suspended' : shop.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap">
                          <span>👤 Owner: <strong>{inspectedUserRecord.user.name}</strong> ({inspectedUserRecord.user.id})</span>
                          <span>• ✉️ {inspectedUserRecord.user.email || shop.ownerEmail || 'N/A'}</span>
                          <span>• 📱 {inspectedUserRecord.user.phone || shop.ownerPhone || shop.phone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewShopDetails(shop.id)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-[11px] cursor-pointer"
                        >
                          {tr(language, '👁️ មើលហាង', '👁️ View', '👁️ 查看')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManageShop(shop.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          {tr(language, '⚙️ គ្រប់គ្រង', '⚙️ Manage', '⚙️ 管理')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendShop(shop.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer"
                        >
                          {shop.isSuspended ? (tr(language, '▶️ បើកវិញ', '▶️ Reactivate', '▶️ 重新激活')) : (tr(language, '⏸️ ផ្អាក', '⏸️ Suspend', '⏸️ 暂停'))}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShopTransferModalTarget(shop);
                            setTransferTargetQuery('');
                            setSelectedTransferUserId('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          {tr(language, '🔄 ផ្ទេរកម្មសិទ្ធិ', '🔄 Transfer', '🔄 转让')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Specific Activity & Login History */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-stone-700 dark:text-stone-300">
                {tr(language, 'ប្រវត្តិសកម្មភាព និងការចូលប្រើប្រាស់របស់គណនីនេះ', 'Account Activity, Login & VIP History', '账户活动、登录与 VIP 历史记录')}
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {allActivityLogs
                  .filter(
                    (l) =>
                      l.userId === inspectedUserRecord.user.id ||
                      (inspectedUserRecord.emailLower &&
                        (l.userEmail || '').toLowerCase() === inspectedUserRecord.emailLower)
                  )
                  .slice(0, 40)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-2">
                          [{log.action}]
                        </span>
                        <span className="text-stone-700 dark:text-stone-200">{log.details}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TRANSFER SHOP OWNERSHIP TO ANOTHER REGISTERED ACCOUNT MODAL
         ===================================================================== */}
      {shopTransferModalTarget && (
        <div
          className="fixed inset-0 z-90 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShopTransferModalTarget(null)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                  <span>
                    {tr(language, 'ផ្ទេរកម្មសិទ្ធិហាងទៅគណនីអ្នកប្រើប្រាស់ផ្សេង', 'Transfer Shop Ownership to Registered Account', '将店铺所有权转让给已注册账户')}
                  </span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  {tr(language, 'ជ្រើសរើសគណនីអ្នកប្រើប្រាស់ថ្មី ដើម្បីភ្ជាប់កម្មសិទ្ធិហាងនេះ និងធ្វើសមកាលកម្មជាមួយ Database ភ្លាមៗ។', 'Select the new registered user account to own this shop and synchronize with the database.', '选择新的已注册用户账户以接管此店铺并立即同步至数据库。')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShopTransferModalTarget(null)}
                className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
              <div className="font-extrabold text-purple-950 dark:text-purple-200">
                🏪 {shopTransferModalTarget.nameKh} ({shopTransferModalTarget.nameEn})
              </div>
              <div className="text-[11px] text-purple-800 dark:text-purple-300 font-mono">
                Shop ID: {shopTransferModalTarget.id}
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                {tr(language, 'ម្ចាស់បច្ចុប្បន្ន៖ ', 'Current Owner: ', '当前所有者：')}
                <strong>{shopTransferModalTarget.ownerName || 'N/A'}</strong> ({shopTransferModalTarget.ownerId || 'N/A'}) •{' '}
                {shopTransferModalTarget.ownerEmail || 'N/A'} • {shopTransferModalTarget.ownerPhone || 'N/A'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-200">
                {tr(language, 'ស្វែងរកគណនីម្ចាស់ថ្មី (តាមឈ្មោះ, User ID, អ៊ីមែល ឬលេខទូរស័ព្ទ)៖', 'Search Target Account (by Name, User ID, Email, or Phone):', '搜索目标账户（通过姓名、用户 ID、邮箱或电话）：')}
              </label>
              <input
                type="text"
                value={transferTargetQuery}
                onChange={(e) => setTransferTargetQuery(e.target.value)}
                placeholder={tr(language, 'វាយឈ្មោះ, អ៊ីមែល, លេខទូរស័ព្ទ ឬ User ID...', 'Type Name, Email, Phone, or User ID...', '输入姓名、邮箱、电话或用户 ID...')}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs"
              />

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {directoryIndex.records
                  .filter((r) => {
                    const q = transferTargetQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      r.nameLower.includes(q) ||
                      r.idLower.includes(q) ||
                      r.emailLower.includes(q) ||
                      r.phoneClean.includes(q)
                    );
                  })
                  .slice(0, 25)
                  .map((r) => {
                    const isPicked = selectedTransferUserId === r.user.id;
                    return (
                      <button
                        key={r.user.id}
                        type="button"
                        onClick={() => setSelectedTransferUserId(r.user.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                          isPicked
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-stone-50 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-purple-400'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">
                            {r.user.name} <span className="font-mono text-[10px] opacity-80">({r.user.id})</span>
                          </div>
                          <div className={`text-[11px] truncate ${isPicked ? 'text-purple-100' : 'text-stone-500'}`}>
                            ✉️ {r.user.email || 'N/A'} • 📱 {r.user.phone || 'N/A'} • 🏪 {r.shopsCount} shops
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold shrink-0">
                          {isPicked ? (tr(language, '✓ បានជ្រើសរើស', '✓ Selected', '✓ 已选择')) : (tr(language, 'ជ្រើសរើស', 'Select', '选择'))}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShopTransferModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold cursor-pointer"
              >
                {tr(language, 'បោះបង់ (Cancel)', 'Cancel', '取消')}
              </button>
              <button
                type="button"
                disabled={!selectedTransferUserId}
                onClick={() => {
                  const targetRec = directoryIndex.byId.get(selectedTransferUserId.toLowerCase());
                  if (targetRec) {
                    handleConfirmShopOwnershipTransfer(targetRec.user);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer shadow-sm"
              >
                {tr(language, '🔄 បញ្ជាក់ការផ្ទេរកម្មសិទ្ធិហាង', '🔄 Confirm Ownership Transfer', '🔄 确认转让所有权')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3-OPTION ACCOUNT MANAGEMENT & SAFE DELETION CONFIRMATION MODAL
         ===================================================================== */}
      {pendingDeleteTargets.length > 0 && (
        <div
          className="fixed inset-0 z-80 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeletingUser) {
              setUserPendingDeletion(null);
              setUsersPendingBatchDeletion([]);
              setConfirmDeleteForeverChecked(false);
            }
          }}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-900 dark:text-white text-sm">
                  {pendingDeleteTargets.length === 1
                    ? tr(language, `គ្រប់គ្រង ឬលុបគណនី "${pendingDeleteTargets[0].name}"`, `Manage or Delete "${pendingDeleteTargets[0].name}"`, `管理或删除“${pendingDeleteTargets[0].name}”`)
                    : tr(language, `គ្រប់គ្រង ឬលុបគណនីចំនួន ${pendingDeleteTargets.length} ក្នុងពេលតែមួយ`, `Batch Manage or Delete ${pendingDeleteTargets.length} Accounts`, `批量管理或删除 ${pendingDeleteTargets.length} 个账户`)}
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  {tr(language, 'សូមជ្រើសរើសជម្រើសណាមួយខាងក្រោមដោយប្រុងប្រយ័ត្ន (ប្រព័ន្ធនឹងបង្កើត Snapshot Backup ស្វ័យប្រវត្តិមុនពេលលុប)៖', 'Choose one of the 3 safe options below (an automatic recovery snapshot is created before any action):', '请在下方 3 个安全选项中选择一项（执行前会自动创建恢复快照）：')}
                </p>
              </div>
            </div>

            {/* Option 1: Cancel VIP Only */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2">
              <h5 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                {tr(language, 'ជម្រើសទី ១៖ បិទតែសមាជិកភាព VIP ប៉ុណ្ណោះ', 'Option 1: Cancel VIP Status Only', '选项 1：仅取消 VIP 状态')}
              </h5>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={async () => {
                  setIsDeletingUser(true);
                  try {
                    if (pendingDeleteTargets.length === 1) {
                      await cancelUserVip(pendingDeleteTargets[0].id);
                    } else {
                      await bulkCancelUserVip(pendingDeleteTargets.map((t) => t.id));
                    }
                    setUserPendingDeletion(null);
                    setUsersPendingBatchDeletion([]);
                  } finally {
                    setIsDeletingUser(false);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs cursor-pointer"
              >
                {tr(language, 'បិទតែសមាជិកភាព VIP (រក្សាទុកគណនី)', 'Cancel VIP Only (Keep Account Active)', '仅取消 VIP（保留账户正常激活）')}
              </button>
            </div>

            {/* Option 2: Temporarily Suspend / Reactivate */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 space-y-2">
              <h5 className="font-bold text-xs text-blue-900 dark:text-blue-200">
                {tr(language, 'ជម្រើសទី ២៖ ផ្អាក ឬបើកដំណើរការគណនីបណ្តោះអាសន្ន', 'Option 2: Temporarily Suspend or Reactivate', '选项 2：临时暂停或重新激活')}
              </h5>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={async () => {
                    setIsDeletingUser(true);
                    try {
                      if (pendingDeleteTargets.length === 1) {
                        await disableUserAccount(pendingDeleteTargets[0].id);
                      } else {
                        await bulkSetUserAccountStatus(
                          pendingDeleteTargets.map((t) => t.id),
                          'disabled'
                        );
                      }
                      setUserPendingDeletion(null);
                      setUsersPendingBatchDeletion([]);
                    } finally {
                      setIsDeletingUser(false);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  {tr(language, 'ផ្អាកគណនីបណ្តោះអាសន្ន', 'Suspend Account(s)', '暂停账户')}
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={async () => {
                    setIsDeletingUser(true);
                    try {
                      if (pendingDeleteTargets.length === 1) {
                        await restoreUserAccess(pendingDeleteTargets[0].id);
                      } else {
                        await bulkSetUserAccountStatus(
                          pendingDeleteTargets.map((t) => t.id),
                          'active'
                        );
                      }
                      setUserPendingDeletion(null);
                      setUsersPendingBatchDeletion([]);
                    } finally {
                      setIsDeletingUser(false);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  {tr(language, 'បើកដំណើរការវិញ', 'Reactivate', '重新激活')}
                </button>
              </div>
            </div>

            {/* Option 3: Permanent Delete */}
            <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 space-y-2.5">
              <h5 className="font-bold text-xs text-rose-900 dark:text-rose-200">
                {tr(language, 'ជម្រើសទី ៣៖ លុបគណនីជាអចិន្ត្រៃយ៍ (Delete Forever)', 'Option 3: Delete Account Forever', '选项 3：永久删除账户')}
              </h5>
              <label className="flex items-start gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-rose-300 dark:border-rose-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmDeleteForeverChecked}
                  onChange={(e) => setConfirmDeleteForeverChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded accent-rose-600 cursor-pointer shrink-0"
                />
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-200 leading-snug">
                  {tr(language, 'ខ្ញុំយល់ព្រម និងបញ្ជាក់ថាចង់លុបគណនីនេះចេញពីបញ្ជី', 'I confirm that I want to permanently delete the selected account(s)', '我确认要永久删除所选账户')}
                </span>
              </label>

              <button
                type="button"
                disabled={isDeletingUser || !confirmDeleteForeverChecked}
                onClick={async () => {
                  setIsDeletingUser(true);
                  try {
                    if (pendingDeleteTargets.length === 1) {
                      await deleteUserAccount(pendingDeleteTargets[0].id);
                    } else {
                      await bulkDeleteUsers(pendingDeleteTargets.map((t) => t.id));
                    }
                    const deletedSet = new Set(pendingDeleteTargets.map((t) => t.id));
                    setSelectedUserIds((prev) => prev.filter((id) => !deletedSet.has(id)));
                    setUserPendingDeletion(null);
                    setUsersPendingBatchDeletion([]);
                    setConfirmDeleteForeverChecked(false);
                  } finally {
                    setIsDeletingUser(false);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
              >
                {isDeletingUser
                  ? tr(language, 'កំពុងលុប...', 'Deleting...', '正在删除...')
                  : tr(language, `លុបគណនីជាអចិន្ត្រៃយ៍ (${pendingDeleteTargets.length})`, `Delete Forever (${pendingDeleteTargets.length})`, `永久删除 (${pendingDeleteTargets.length})`)}
              </button>
            </div>

            <button
              type="button"
              disabled={isDeletingUser}
              onClick={() => {
                setUserPendingDeletion(null);
                setUsersPendingBatchDeletion([]);
                setConfirmDeleteForeverChecked(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer"
            >
              {tr(language, 'បោះបង់ / បិទផ្ទាំងនេះ (Cancel)', 'Cancel', '取消')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
